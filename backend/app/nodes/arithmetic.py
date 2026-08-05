import numpy as np
from typing import Dict, Any
from .base import BaseNodeRuntime
from ..graph.types import Frame, FrameMetadata, CanonicalPortType

class AddNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        f_a = inputs.get("signal_in_a")
        f_b = inputs.get("signal_in_b")

        if not f_a or f_a.data is None:
            return {}

        sig_a = np.asarray(f_a.data, dtype=np.float64)
        if f_b and f_b.data is not None:
            sig_b = np.asarray(f_b.data, dtype=np.float64)
            min_len = min(len(sig_a), len(sig_b))
            res = sig_a[:min_len] + sig_b[:min_len]
        else:
            res = sig_a

        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=f_a.metadata, data=res)}

class SubtractNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        f_a = inputs.get("signal_in_a")
        f_b = inputs.get("signal_in_b")

        if not f_a or f_a.data is None:
            return {}

        sig_a = np.asarray(f_a.data, dtype=np.float64)
        if f_b and f_b.data is not None:
            sig_b = np.asarray(f_b.data, dtype=np.float64)
            min_len = min(len(sig_a), len(sig_b))
            res = sig_a[:min_len] - sig_b[:min_len]
        else:
            res = sig_a

        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=f_a.metadata, data=res)}

class MultiplyNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        f_a = inputs.get("signal_in_a")
        f_b = inputs.get("signal_in_b")

        if not f_a or f_a.data is None:
            return {}

        sig_a = np.asarray(f_a.data, dtype=np.float64)
        if f_b and f_b.data is not None:
            sig_b = np.asarray(f_b.data, dtype=np.float64)
            min_len = min(len(sig_a), len(sig_b))
            res = sig_a[:min_len] * sig_b[:min_len]
        else:
            res = sig_a

        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=f_a.metadata, data=res)}

class DivideNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        f_a = inputs.get("signal_in_a")
        f_b = inputs.get("signal_in_b")

        if not f_a or f_a.data is None:
            return {}

        sig_a = np.asarray(f_a.data, dtype=np.float64)
        if f_b and f_b.data is not None:
            sig_b = np.asarray(f_b.data, dtype=np.float64)
            min_len = min(len(sig_a), len(sig_b))
            denom = sig_b[:min_len]
            zero_policy = self.params.get("zero_handling", "CLAMP_EPSILON")

            if zero_policy == "CLAMP_EPSILON":
                denom = np.where(np.abs(denom) < 1e-12, 1e-12, denom)

            res = sig_a[:min_len] / denom
        else:
            res = sig_a

        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=f_a.metadata, data=res)}

class ApplyWindowNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        w_type = self.params.get("window_type", "Hann").lower()

        if w_type == "hann":
            win = np.hanning(len(sig))
        elif w_type == "hamming":
            win = np.hamming(len(sig))
        elif w_type == "blackman":
            win = np.blackman(len(sig))
        else:
            win = np.ones(len(sig))

        res = sig * win
        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=res)}

class ApplyRealConstantNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        const = float(self.params.get("constant", 1.0))
        op = self.params.get("operation", "multiply")

        res = sig * const if op == "multiply" else sig + const
        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=res)}

class SquareNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        res = sig ** 2
        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=res)}
