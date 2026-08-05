from typing import Dict, List, Any, Optional, Set
from collections import defaultdict, deque
from pydantic import BaseModel, Field

from .registry import NodeRegistry, NodeSpec
from .types import CanonicalPortType

class ValidationError(BaseModel):
    code: str
    nodeId: Optional[str] = None
    port: Optional[str] = None
    expected: Optional[str] = None
    received: Optional[str] = None
    message: str

class ValidationResult(BaseModel):
    valid: bool
    errors: List[ValidationError] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    topological_order: List[str] = Field(default_factory=list)

class GraphValidator:
    """
    10-Point Hardened Signal Graph Validator for REI SignalLab 2.1.
    Performs schema validation, port existence, type compatibility, cycle detection,
    and Kahn topological ordering.
    """

    @classmethod
    def validate_graph(cls, project_spec: Dict[str, Any]) -> ValidationResult:
        errors: List[ValidationError] = []
        warnings: List[str] = []

        graph_data = project_spec.get("graph", {})
        nodes_raw = graph_data.get("nodes", [])
        connections_raw = graph_data.get("connections", [])

        # 1. Schema Validation
        if not isinstance(nodes_raw, list) or not isinstance(connections_raw, list):
            errors.append(ValidationError(
                code="INVALID_GRAPH_SCHEMA",
                message="Graph spec must contain 'nodes' list and 'connections' list."
            ))
            return ValidationResult(valid=False, errors=errors)

        # 2. Node ID Uniqueness & 3. Node Type Existence
        node_map: Dict[str, Dict[str, Any]] = {}
        spec_map: Dict[str, NodeSpec] = {}

        for n in nodes_raw:
            nid = n.get("id")
            ntype = n.get("type")

            if not nid:
                errors.append(ValidationError(code="MISSING_NODE_ID", message="Node missing required 'id' field."))
                continue

            if nid in node_map:
                errors.append(ValidationError(code="DUPLICATE_NODE_ID", nodeId=nid, message=f"Duplicate node ID '{nid}' detected."))

            node_map[nid] = n
            spec = NodeRegistry.get(ntype)

            if not spec:
                errors.append(ValidationError(
                    code="UNSUPPORTED_NODE_TYPE",
                    nodeId=nid,
                    message=f"Node type '{ntype}' is not registered in node catalog."
                ))
            else:
                spec_map[nid] = spec

        if errors:
            return ValidationResult(valid=False, errors=errors)

        # 4. Port Existence & 6. Port Type Compatibility
        in_degree = {nid: 0 for nid in node_map}
        adj = defaultdict(list)

        for conn in connections_raw:
            fn_id = conn.get("from_node")
            fn_port = conn.get("from_port")
            tn_id = conn.get("to_node")
            tn_port = conn.get("to_port")

            if not fn_id or not tn_id or fn_id not in node_map or tn_id not in node_map:
                errors.append(ValidationError(
                    code="INVALID_CONNECTION_NODE",
                    message=f"Connection references invalid nodes ({fn_id} -> {tn_id})."
                ))
                continue

            fn_spec = spec_map[fn_id]
            tn_spec = spec_map[tn_id]

            # Check Out Port Existence
            out_port_spec = next((p for p in fn_spec.output_ports if p.name == fn_port), None)
            if not out_port_spec:
                errors.append(ValidationError(
                    code="PORT_NOT_FOUND",
                    nodeId=fn_id,
                    port=fn_port,
                    message=f"Output port '{fn_port}' does not exist on node '{fn_spec.type}'."
                ))
                continue

            # Check In Port Existence
            in_port_spec = next((p for p in tn_spec.input_ports if p.name == tn_port), None)
            if not in_port_spec:
                errors.append(ValidationError(
                    code="PORT_NOT_FOUND",
                    nodeId=tn_id,
                    port=tn_port,
                    message=f"Input port '{tn_port}' does not exist on node '{tn_spec.type}'."
                ))
                continue

            # Check Port Type Compatibility (Strict - No implicit conversion allowed)
            out_type = out_port_spec.data_type
            in_type = in_port_spec.data_type

            if out_type != in_type and in_type != CanonicalPortType.ANY and out_type != CanonicalPortType.ANY:
                errors.append(ValidationError(
                    code="GRAPH_PORT_TYPE_MISMATCH",
                    nodeId=tn_id,
                    port=tn_port,
                    expected=in_type,
                    received=out_type,
                    message=f"Port Type Mismatch on [{tn_id}:{tn_port}]: Cannot connect {out_type} output to {in_type} input. Add explicit converter node."
                ))
                continue

            adj[fn_id].append(tn_id)
            in_degree[tn_id] += 1

        if errors:
            return ValidationResult(valid=False, errors=errors)

        # 7. Cycle Detection & 8. Kahn's Topological Sorting
        queue = deque([nid for nid, deg in in_degree.items() if deg == 0])
        order: List[str] = []

        while queue:
            curr = queue.popleft()
            order.append(curr)
            for neighbor in adj[curr]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(order) != len(node_map):
            errors.append(ValidationError(
                code="GRAPH_CYCLE_DETECTED",
                message="Cycle detected in graph topology. Feedback loops are only permitted via stateful DelayLine nodes."
            ))
            return ValidationResult(valid=False, errors=errors)

        return ValidationResult(valid=True, errors=[], warnings=warnings, topological_order=order)
