import numpy as np
from typing import Dict, Any
from .base import BaseNodeRuntime
from ..graph.types import Frame, FrameMetadata, CanonicalPortType
from ..dsp_engine import DSPEngine

class SignalGeneratorNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        gen_cfg = type("GenCfg", (), {
            "waveform": self.params.get("waveform", "sine"),
            "frequency": float(self.params.get("frequency", 440.0)),
            "amplitude": float(self.params.get("amplitude", 1.0)),
            "phase": float(self.params.get("phase", 0.0)),
            "offset": float(self.params.get("offset", 0.0)),
            "sample_rate": int(self.params.get("sample_rate", 44100)),
            "duration": float(self.params.get("duration", 0.1)),
            "noise_level": float(self.params.get("noise_level", 0.0)),
            "modulation_type": self.params.get("modulation_type", "none"),
            "mod_frequency": float(self.params.get("mod_frequency", 50.0)),
            "mod_index": float(self.params.get("mod_index", 0.5)),
            "frequency2": float(self.params.get("frequency2", 880.0))
        })()

        t, sig = DSPEngine.generate_signal(gen_cfg)
        meta = FrameMetadata(sample_rate_hz=gen_cfg.sample_rate, valid_sample_count=len(sig))

        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=meta, data=sig)}

class GaussianNoiseNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        std_dev = float(self.params.get("std_dev", 1.0))
        seed = int(self.params.get("seed", 42))
        fs = 44100
        N = 4410

        rng = np.random.RandomState(seed)
        noise = rng.normal(0, std_dev, N)
        meta = FrameMetadata(sample_rate_hz=fs, valid_sample_count=N)

        return {"signal_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=meta, data=noise)}
