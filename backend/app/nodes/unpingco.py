import numpy as np
from typing import Dict, Any
from .base import BaseNodeRuntime
from ..graph.types import Frame, FrameMetadata, CanonicalPortType
from ..unpingco_engine import UnpingcoEngine

class DspLabAliasingNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        f_sig = float(self.params.get("f_signal_hz", 1500.0))
        f_samp = float(self.params.get("f_sample_hz", 2000.0))
        dur = float(self.params.get("duration_s", 0.01))

        res = UnpingcoEngine.simulate_sampling_aliasing(f_sig, f_samp, dur)
        meta = FrameMetadata(sample_rate_hz=f_samp)

        return {
            "aliasing_result": Frame(data_type=CanonicalPortType.STRUCTURED_FRAME, metadata=meta, data=res),
            "f_aliased_hz": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=res.get("f_aliased_hz", 500.0)),
            "is_aliased": Frame(data_type=CanonicalPortType.SCALAR_BOOL, metadata=meta, data=res.get("is_aliased", True))
        }

class DspLabParksMcClellanNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        taps = int(self.params.get("num_taps", 51))
        passband = float(self.params.get("passband_hz", 1000.0))
        stopband = float(self.params.get("stopband_hz", 1500.0))
        fs = float(self.params.get("sample_rate_hz", 8000.0))

        res = UnpingcoEngine.design_parks_mcclellan_fir(taps, passband, stopband, fs)
        meta = FrameMetadata(sample_rate_hz=fs)
        coeffs = np.asarray(res.get("taps", []), dtype=np.float64)

        return {
            "fir_coefficients": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=meta, data=coeffs)
        }

class DspLabAutocorrPitchNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            t = np.linspace(0, 0.05, 1000, endpoint=False)
            sig = np.sin(2 * np.pi * 220.0 * t) # A3 note
            fs = 20000.0
        else:
            sig = np.asarray(sig_frame.data, dtype=np.float64)
            fs = sig_frame.metadata.sample_rate_hz or 20000.0

        res = UnpingcoEngine.compute_autocorrelation_pitch(sig, fs)
        meta = FrameMetadata(sample_rate_hz=fs)
        autocorr_seq = np.asarray(res.get("autocorr", []), dtype=np.float64)

        return {
            "pitch_result": Frame(data_type=CanonicalPortType.STRUCTURED_FRAME, metadata=meta, data=res),
            "fundamental_pitch_hz": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=res.get("pitch_hz", 220.0)),
            "autocorr_signal": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=meta, data=autocorr_seq)
        }

class DspLabLmsAdaptiveCancellerNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        p_frame = inputs.get("primary_signal")
        r_frame = inputs.get("reference_noise")

        if not p_frame or p_frame.data is None or not r_frame or r_frame.data is None:
            t = np.linspace(0, 0.1, 1000, endpoint=False)
            ref_noise = np.random.normal(0, 1, 1000)
            prim_sig = np.sin(2 * np.pi * 100.0 * t) + 0.8 * ref_noise
            fs = 10000.0
        else:
            prim_sig = np.asarray(p_frame.data, dtype=np.float64)
            ref_noise = np.asarray(r_frame.data, dtype=np.float64)
            fs = p_frame.metadata.sample_rate_hz or 10000.0

        mu = float(self.params.get("mu_step", 0.01))
        order = int(self.params.get("filter_order", 32))

        res = UnpingcoEngine.compute_lms_adaptive_filter(prim_sig, ref_noise, mu=mu, order=order)
        meta = FrameMetadata(sample_rate_hz=fs)

        return {
            "cleaned_signal": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=meta, data=np.asarray(res.get("error_signal", []), dtype=np.float64)),
            "error_signal": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=meta, data=np.asarray(res.get("error_signal", []), dtype=np.float64))
        }

class DspLabCwtScalogramNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            t = np.linspace(0, 0.1, 1000, endpoint=False)
            sig = np.sin(2 * np.pi * 50.0 * t)
            fs = 10000.0
        else:
            sig = np.asarray(sig_frame.data, dtype=np.float64)
            fs = sig_frame.metadata.sample_rate_hz or 10000.0

        n_scales = int(self.params.get("num_scales", 32))
        res = UnpingcoEngine.compute_cwt_scalogram(sig, fs, num_scales=n_scales)
        meta = FrameMetadata(sample_rate_hz=fs)

        return {
            "scalogram_matrix": Frame(data_type=CanonicalPortType.STRUCTURED_FRAME, metadata=meta, data=res)
        }
