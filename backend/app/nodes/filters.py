import numpy as np
from scipy import signal as scipy_signal
from typing import Dict, Any
from .base import BaseNodeRuntime
from ..graph.types import Frame, FrameMetadata, CanonicalPortType
from ..dsp_engine import DSPEngine

class LowPassNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        fs = sig_frame.metadata.sample_rate_hz
        cutoff = float(self.params.get("cutoff", 1000.0))
        order = int(self.params.get("order", 4))

        from ..schemas import FilterConfig, FilterType, FilterDesign
        flt_cfg = FilterConfig(enabled=True, cutoff=cutoff, filter_type=FilterType.LOWPASS, filter_design=FilterDesign.BUTTERWORTH, order=order)
        res = DSPEngine.apply_filter(sig, fs, flt_cfg)

        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=res)}

class HighPassNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        fs = sig_frame.metadata.sample_rate_hz
        cutoff = float(self.params.get("cutoff", 100.0))
        order = int(self.params.get("order", 4))

        from ..schemas import FilterConfig, FilterType, FilterDesign
        flt_cfg = FilterConfig(enabled=True, cutoff=cutoff, filter_type=FilterType.HIGHPASS, filter_design=FilterDesign.BUTTERWORTH, order=order)
        res = DSPEngine.apply_filter(sig, fs, flt_cfg)

        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=res)}

class BandPassNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        fs = sig_frame.metadata.sample_rate_hz
        low = float(self.params.get("low_cutoff", 300.0))
        high = float(self.params.get("high_cutoff", 3000.0))
        order = int(self.params.get("order", 4))

        nyq = fs / 2.0
        b, a = scipy_signal.butter(order, [low / nyq, high / nyq], btype="bandpass")
        res = scipy_signal.filtfilt(b, a, sig)

        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=res)}

class BandStopNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        fs = sig_frame.metadata.sample_rate_hz
        low = float(self.params.get("low_cutoff", 48.0))
        high = float(self.params.get("high_cutoff", 52.0))
        order = int(self.params.get("order", 4))

        nyq = fs / 2.0
        b, a = scipy_signal.butter(order, [low / nyq, high / nyq], btype="bandstop")
        res = scipy_signal.filtfilt(b, a, sig)

        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=res)}

class BiQuadIirNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        b = [float(self.params.get("b0", 0.1)), float(self.params.get("b1", 0.2)), float(self.params.get("b2", 0.1))]
        a = [1.0, float(self.params.get("a1", -0.5)), float(self.params.get("a2", 0.25))]

        # Check Pole Stability
        poles = np.roots(a)
        if np.any(np.abs(poles) >= 1.0):
            raise ValueError("FILTER_UNSTABLE: Biquad IIR poles lie outside unit circle.")

        res = scipy_signal.lfilter(b, a, sig)
        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=res)}

class MedianNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        k = int(self.params.get("kernel_size", 5))
        if k % 2 == 0:
            k += 1

        res = scipy_signal.medfilt(sig, kernel_size=k)
        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=res)}

class RemoveDCNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        res = sig - np.mean(sig)
        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=res)}

class DelayLineNode(BaseNodeRuntime):
    def __init__(self, canonical_type: str, node_id: str, name: str, params: Dict[str, Any] = None):
        super().__init__(canonical_type, node_id, name, params)
        self.state_buffer = np.array([], dtype=np.float64)

    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        delay = int(self.params.get("delay_samples", 10))
        init_val = float(self.params.get("initial_value", 0.0))

        full_buf = np.concatenate([self.state_buffer, sig]) if len(self.state_buffer) > 0 else np.concatenate([np.full(delay, init_val), sig])
        res = full_buf[:len(sig)]
        self.state_buffer = full_buf[len(sig):]

        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=res)}
