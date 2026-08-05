from typing import Dict, Any, Optional
from ..graph.types import Frame, FrameMetadata
from ..graph.registry import NodeSpec, NodeRegistry

class BaseNodeRuntime:
    """
    Base Lifecycle Interface for all REI SignalLab 2.1 Node Runtimes.
    Lifecycle: initialize() -> process() -> reset() -> close()
    """

    def __init__(self, canonical_type: str, node_id: str, name: str, params: Optional[Dict[str, Any]] = None):
        self.node_id = node_id
        self.name = name
        self.params = params or {}
        self.spec: NodeSpec = NodeRegistry.get(canonical_type)
        if not self.spec:
            raise ValueError(f"Unknown canonical node type '{canonical_type}'.")

    def initialize(self):
        pass

    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        return {}

    def reset(self):
        pass

    def close(self):
        pass
