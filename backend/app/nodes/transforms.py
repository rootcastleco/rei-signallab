import numpy as np
from scipy import signal as scipy_signal, fftpack
from scipy.fftpack import dct
from typing import Dict, Any
from .base import BaseNodeRuntime
from ..graph.types import Frame, FrameMetadata, CanonicalPortType
from ..dsp_engine import DSPEngine

class FFTNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        fs = sig_frame.metadata.sample_rate_hz
        n_fft = int(self.params.get("n_fft", 1024))
        w_type = self.params.get("window", "hanning")

        from ..schemas import FFTConfig, WindowType
        try:
            win_enum = WindowType(w_type)
        except Exception:
            win_enum = WindowType.HANNING

        fft_cfg = FFTConfig(n_fft=n_fft, window=win_enum, log_scale=True)
        freqs, mag_db, phase = DSPEngine.compute_fft(sig, fs, fft_cfg)
        c_spec = np.fft.rfft(sig, n=n_fft)

        return {
            "spectrum_out": Frame(data_type=CanonicalPortType.SPECTRUM_FRAME, metadata=sig_frame.metadata, data={"frequencies": freqs, "magnitude": mag_db, "phase": phase, "complex_spectrum": c_spec}),
            "magnitude": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=mag_db),
            "phase": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=phase),
            "frequency_axis": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=freqs)
        }

class InverseRealFFTNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        spec_frame = inputs.get("spectrum_in")
        if not spec_frame or spec_frame.data is None:
            return {}

        spec_data = spec_frame.data
        if isinstance(spec_data, dict) and "complex_spectrum" in spec_data:
            c_spec = spec_data["complex_spectrum"]
            rec_sig = np.fft.irfft(c_spec)
        elif isinstance(spec_data, dict) and "magnitude" in spec_data:
            mag = np.asarray(spec_data["magnitude"], dtype=np.float64)
            rec_sig = np.fft.irfft(10 ** (mag / 20.0))
            # Reconstruct time signal from magnitude
            rec_sig = np.fft.irfft(10 ** (mag / 20.0))
        else:
            rec_sig = np.zeros(1024)

        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=spec_frame.metadata, data=rec_sig)}

class DFTNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        max_len = int(self.params.get("max_dft_size", 512))
        sig = sig[:max_len]
        N = len(sig)

        # Matrix Multiplication O(N²) DFT
        n = np.arange(N)
        k = n.reshape((N, 1))
        M = np.exp(-2j * np.pi * k * n / N)
        c_spec = np.dot(M, sig)

        fs = sig_frame.metadata.sample_rate_hz
        freqs = np.fft.rfftfreq(N, 1/fs)
        mag_db = 20 * np.log10(np.maximum(1e-6, np.abs(c_spec[:len(freqs)]) / N))

        return {"spectrum_out": Frame(data_type=CanonicalPortType.SPECTRUM_FRAME, metadata=sig_frame.metadata, data={"frequencies": freqs, "magnitude": mag_db})}

class DCTNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        dct_type = int(self.params.get("dct_type", 2))
        res = dct(sig, type=dct_type, norm="ortho")

        return {"dct_coefficients": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=res)}

class GoertzelNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        fs = sig_frame.metadata.sample_rate_hz
        target_f = float(self.params.get("target_frequency_hz", 440.0))

        # Single Frequency Goertzel Algorithm O(N)
        N = len(sig)
        k = int(0.5 + (N * target_f / fs))
        w = (2.0 * np.pi / N) * k
        cosine = np.cos(w)
        sine = np.sin(w)
        coeff = 2.0 * cosine

        s_prev = 0.0
        s_prev2 = 0.0
        for sample in sig:
            s = sample + coeff * s_prev - s_prev2
            s_prev2 = s_prev
            s_prev = s

        power = s_prev2**2 + s_prev**2 - coeff * s_prev * s_prev2
        mag = np.sqrt(max(0, power)) / N

        return {"target_magnitude": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=sig_frame.metadata, data=mag)}

class HaarNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        if len(sig) % 2 != 0:
            sig = sig[:-1]

        approx = (sig[0::2] + sig[1::2]) / np.sqrt(2.0)
        detail = (sig[0::2] - sig[1::2]) / np.sqrt(2.0)

        return {
            "approximation": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=approx),
            "detail": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=detail)
        }
