import numpy as np
from typing import Dict, Any
from .base import BaseNodeRuntime
from ..graph.types import Frame, FrameMetadata, CanonicalPortType
from ..dsp_engine import DSPEngine

class NoiseStatsNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        fs = sig_frame.metadata.sample_rate_hz

        from ..schemas import FFTConfig
        fft_cfg = FFTConfig(n_fft=1024, log_scale=False)
        freqs, mag_linear, _ = DSPEngine.compute_fft(sig, fs, fft_cfg)
        metrics = DSPEngine.compute_metrics(sig, freqs, mag_linear, fs)

        m_dict = metrics.model_dump()

        return {
            "stats": Frame(data_type=CanonicalPortType.STRUCTURED_FRAME, metadata=sig_frame.metadata, data=m_dict, metrics=m_dict),
            "fundamental_frequency": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=sig_frame.metadata, data=m_dict["fundamental_freq"]),
            "snr_db": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=sig_frame.metadata, data=m_dict["snr_db"]),
            "thd_db": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=sig_frame.metadata, data=20 * np.log10(max(1e-6, m_dict["thd_percent"] / 100.0))),
            "thd_percent": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=sig_frame.metadata, data=m_dict["thd_percent"]),
            "sinad_db": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=sig_frame.metadata, data=m_dict["sinad_db"]),
            "sfdr_db": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=sig_frame.metadata, data=m_dict["sfdr_db"]),
            "enob_bits": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=sig_frame.metadata, data=m_dict["enob_bits"])
        }

class PatternDetectorNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        thresh = float(self.params.get("threshold", 0.85))

        # Perform Normalized Cross-Correlation Template Detection
        template = np.sin(2 * np.pi * 440 * np.linspace(0, 0.01, 441))
        corr = np.correlate(sig, template, mode="same")
        max_corr = np.max(np.abs(corr)) if len(corr) > 0 else 1.0
        score_sig = corr / (max_corr if max_corr > 0 else 1.0)

        match_indices = np.where(score_sig >= thresh)[0].tolist()

        return {
            "events": Frame(data_type=CanonicalPortType.PATTERN_EVENT, metadata=sig_frame.metadata, data=match_indices),
            "score_signal": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=sig_frame.metadata, data=score_sig),
            "match_count": Frame(data_type=CanonicalPortType.SCALAR_INT64, metadata=sig_frame.metadata, data=len(match_indices))
        }

class MinMaxNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        min_v = float(np.min(sig)) if len(sig) > 0 else 0.0
        max_v = float(np.max(sig)) if len(sig) > 0 else 0.0

        return {
            "min_value": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=sig_frame.metadata, data=min_v),
            "max_value": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=sig_frame.metadata, data=max_v),
            "peak_to_peak": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=sig_frame.metadata, data=max_v - min_v)
        }

class MeanNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        mean_v = float(np.mean(sig)) if len(sig) > 0 else 0.0

        return {
            "mean_value": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=sig_frame.metadata, data=mean_v)
        }
