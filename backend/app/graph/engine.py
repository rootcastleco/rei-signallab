from typing import Dict, List, Any, Optional
import time
import uuid

from .validator import GraphValidator
from .registry import NodeRegistry
from .types import Frame, FrameMetadata, CanonicalPortType
from ..nodes.factory import NodeFactory

class GraphExecutionEngine:
    """
    Kahn Topological Deterministic Execution Scheduler for REI SignalLab 2.1.
    Instantiates canonical node runtimes, validates port type signatures,
    and executes processing pipelines deterministically.
    """

    def __init__(self):
        self.node_runtimes: Dict[str, Any] = {}
        self.outputs_cache: Dict[str, Dict[str, Frame]] = {}

    def execute_project(self, project_spec: Dict[str, Any]) -> Dict[str, Any]:
        start_time = time.perf_counter()

        # 1. Validate Graph
        val_result = GraphValidator.validate_graph(project_spec)
        if not val_result.valid:
            return {
                "status": "error",
                "validation": val_result.model_dump(),
                "results": {}
            }

        graph_data = project_spec.get("graph", {})
        nodes_raw = graph_data.get("nodes", [])
        connections_raw = graph_data.get("connections", [])
        order = val_result.topological_order

        node_map = {n["id"]: n for n in nodes_raw}

        # 2. Initialize Runtimes
        for nid in order:
            n_data = node_map[nid]
            ntype = NodeRegistry.resolve_canonical_type(n_data["type"])
            params = n_data.get("params", {})
            runtime = NodeFactory.create(ntype, nid, n_data.get("name", ntype), params)
            self.node_runtimes[nid] = runtime
            self.outputs_cache[nid] = {}

        # 3. Execute Nodes in Topological Order
        execution_timings: Dict[str, float] = {}

        for nid in order:
            n_start = time.perf_counter()
            runtime = self.node_runtimes[nid]

            # Gather Incoming Input Frames from Connected Output Ports
            inputs: Dict[str, Frame] = {}
            for conn in connections_raw:
                if conn["to_node"] == nid:
                    fn_id = conn["from_node"]
                    fn_port = conn["from_port"]
                    tn_port = conn["to_port"]

                    if fn_id in self.outputs_cache and fn_port in self.outputs_cache[fn_id]:
                        inputs[tn_port] = self.outputs_cache[fn_id][fn_port]

            # Process Node Lifecycle
            outputs = runtime.process(inputs)
            self.outputs_cache[nid] = outputs
            execution_timings[nid] = (time.perf_counter() - n_start) * 1000.0

        total_duration_ms = (time.perf_counter() - start_time) * 1000.0

        # Format Structured Output Results
        results_formatted = {}
        for nid in order:
            runtime = self.node_runtimes[nid]
            results_formatted[nid] = {
                "node_id": nid,
                "node_type": runtime.spec.type,
                "display_name": runtime.spec.display_name,
                "execution_time_ms": round(execution_timings.get(nid, 0.0), 3),
                "outputs": {
                    port_name: {
                        "data_type": frame.data_type,
                        "metadata": frame.metadata.model_dump(),
                        "data_length": len(frame.data) if hasattr(frame.data, "__len__") else None,
                        "metrics": frame.metrics
                    } for port_name, frame in self.outputs_cache[nid].items()
                }
            }

        return {
          "status": "success",
          "version": "2.1.0",
          "execution_id": str(uuid.uuid4()),
          "duration_ms": round(total_duration_ms, 2),
          "topological_order": order,
          "results": results_formatted,
          "project": project_spec
        }
