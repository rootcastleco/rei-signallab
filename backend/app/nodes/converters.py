import numpy as np
from scipy import signal as scipy_signal
from typing import Dict, Any
from .base import BaseNodeRuntime
from ..graph.types import Frame, FrameMetadata, CanonicalPortType

class ComplexToRealNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        c_frame = inputs.get("complex_in")
        if not c_frame or c_frame.data is None:
            return {}

        c_sig = np.asarray(c_frame.data, dtype=np.complex128)
        return {
            "real": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=c_frame.metadata, data=np.real(c_sig)),
            "imaginary": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=c_frame.metadata, data=np.imag(c_sig)),
            "magnitude": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=c_frame.metadata, data=np.abs(c_sig)),
            "phase": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=c_frame.metadata, data=np.angle(c_sig))
        }

class RealToComplexNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        r_frame = inputs.get("real")
        i_frame = inputs.get("imaginary")

        if not r_frame or r_frame.data is None:
            return {}

        r_sig = np.asarray(r_frame.data, dtype=np.float64)
        i_sig = np.asarray(i_frame.data, dtype=np.float64) if (i_frame and i_frame.data is not None) else np.zeros_like(r_sig)
        min_len = min(len(r_sig), len(i_sig))
        c_sig = r_sig[:min_len] + 1j * i_sig[:min_len]

        return {"complex_out": Frame(data_type=CanonicalPortType.SIGNAL_COMPLEX128, metadata=r_frame.metadata, data=c_sig)}

class CartesianToPolarNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        x_frame = inputs.get("x")
        y_frame = inputs.get("y")

        if not x_frame or x_frame.data is None:
            return {}

        x = np.asarray(x_frame.data, dtype=np.float64)
        y = np.asarray(y_frame.data, dtype=np.float64) if (y_frame and y_frame.data is not None) else np.zeros_like(x)
        min_len = min(len(x), len(y))

        r = np.hypot(x[:min_len], y[:min_len])
        theta = np.arctan2(y[:min_len], x[:min_len])

        return {
            "r": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=x_frame.metadata, data=r),
            "theta": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=x_frame.metadata, data=theta)
        }

class PolarToCartesianNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        r_frame = inputs.get("r")
        t_frame = inputs.get("theta")

        if not r_frame or r_frame.data is None:
            return {}

        r = np.asarray(r_frame.data, dtype=np.float64)
        theta = np.asarray(t_frame.data, dtype=np.float64) if (t_frame and t_frame.data is not None) else np.zeros_like(r)
        min_len = min(len(r), len(theta))

        x = r[:min_len] * np.cos(theta[:min_len])
        y = r[:min_len] * np.sin(theta[:min_len])

        return {
            "x": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=r_frame.metadata, data=x),
            "y": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=r_frame.metadata, data=y)
        }

class HilbertNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        analytic = scipy_signal.hilbert(sig)
        envelope = np.abs(analytic)
        phase = np.angle(analytic)

        return {
            "analytic_signal": Frame(data_type=CanonicalPortType.SIGNAL_COMPLEX128, metadata=sig_frame.metadata, data=analytic),
            "envelope": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=envelope),
            "instantaneous_phase": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=phase)
        }

class PowerSpectrumNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        fs = sig_frame.metadata.sample_rate_hz
        n_fft = int(self.params.get("n_fft", 1024))

        freqs, psd = scipy_signal.welch(sig, fs=fs, nperseg=min(n_fft, len(sig)))

        return {
            "power_spectrum": Frame(data_type=CanonicalPortType.POWER_SPECTRUM_FRAME, metadata=sig_frame.metadata, data={"frequencies": freqs, "psd": psd})
        }

class RealTodBNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        mode = self.params.get("mode", "AMPLITUDE_DB")
        ref = float(self.params.get("reference", 1.0))
        ref = max(1e-12, ref)

        clamped_sig = np.maximum(1e-12, np.abs(sig))
        if mode == "AMPLITUDE_DB":
            res = 20 * np.log10(clamped_sig / ref)
        else:
            res = 10 * np.log10(clamped_sig / ref)

        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=res)}

class ChangeRangeNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        x = np.asarray(sig_frame.data, dtype=np.float64)
        in_min = float(self.params.get("input_min", -1.0))
        in_max = float(self.params.get("input_max", 1.0))
        out_min = float(self.params.get("output_min", 0.0))
        out_max = float(self.params.get("output_max", 100.0))
        clamp = bool(self.params.get("clamp", True))

        denom = in_max - in_min if in_max != in_min else 1.0
        res = out_min + ((x - in_min) / denom) * (out_max - out_min)
        if clamp:
            res = np.clip(res, min(out_min, out_max), max(out_min, out_max))

        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=res)}
