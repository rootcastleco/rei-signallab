from typing import Dict, Any
from .base import BaseNodeRuntime
from ..graph.types import Frame, FrameMetadata, CanonicalPortType

class ScopeNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        return {"layer": Frame(data_type=CanonicalPortType.RENDERABLE_LAYER, metadata=sig_frame.metadata, data={"type": "scope", "signal": sig_frame.data})}

class WaterfallNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        spec_frame = inputs.get("spectrum_in")
        if not spec_frame or spec_frame.data is None:
            return {}

        return {"layer": Frame(data_type=CanonicalPortType.RENDERABLE_LAYER, metadata=spec_frame.metadata, data={"type": "waterfall", "spectrum": spec_frame.data})}
