import numpy as np
from typing import Dict, Any
from .base import BaseNodeRuntime
from ..graph.types import Frame, FrameMetadata, CanonicalPortType

class WatchdogNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        meta = FrameMetadata()
        return {"healthy": Frame(data_type=CanonicalPortType.SCALAR_BOOL, metadata=meta, data=True)}

class FrequencyMeterNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        fs = sig_frame.metadata.sample_rate_hz

        # Zero-Crossing Interpolated Frequency Calculation
        zero_crossings = np.where(np.diff(np.signbit(sig)))[0]
        if len(zero_crossings) >= 2:
            num_periods = (zero_crossings[-1] - zero_crossings[0]) / 2.0
            total_sec = (zero_crossings[-1] - zero_crossings[0]) / fs
            measured_freq = num_periods / total_sec if total_sec > 0 else 0.0
        else:
            measured_freq = 0.0

        return {"measured_frequency": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=sig_frame.metadata, data=measured_freq)}

class CounterNode(BaseNodeRuntime):
    def __init__(self, canonical_type: str, node_id: str, name: str, params: Dict[str, Any] = None):
        super().__init__(canonical_type, node_id, name, params)
        self.count = 0

    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        self.count += 1
        meta = FrameMetadata()
        return {"count": Frame(data_type=CanonicalPortType.SCALAR_INT64, metadata=meta, data=self.count)}
