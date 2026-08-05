import numpy as np
from typing import Dict, Any
from .base import BaseNodeRuntime
from ..graph.types import Frame, FrameMetadata, CanonicalPortType

class RMSMeterNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        rms_val = float(np.sqrt(np.mean(sig ** 2))) if len(sig) > 0 else 0.0

        w_size = int(self.params.get("window_samples", 128))
        kernel = np.ones(w_size) / w_size
        sliding_rms = np.sqrt(np.convolve(sig ** 2, kernel, mode="same"))

        return {
            "rms_value": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=sig_frame.metadata, data=rms_val),
            "rms_signal": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=sliding_rms)
        }
