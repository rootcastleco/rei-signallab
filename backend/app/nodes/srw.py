import numpy as np
from typing import Dict, Any
from .base import BaseNodeRuntime
from ..graph.types import Frame, FrameMetadata, CanonicalPortType
from ..srw_engine import SrwEngine
from ..srw_schemas import ElectronBeamConfig, UndulatorConfig

class SrwBeamKinematicsNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        energy_gev = float(self.params.get("energy_gev", 3.0))
        current_amp = float(self.params.get("current_amp", 0.5))
        b0_tesla = float(self.params.get("peak_field_tesla", 0.8))
        period_mm = float(self.params.get("period_mm", 20.0))
        num_periods = int(self.params.get("num_periods", 50))

        beam_cfg = ElectronBeamConfig(energy_gev=energy_gev, current_amp=current_amp)
        und_cfg = UndulatorConfig(period_mm=period_mm, num_periods=num_periods, peak_field_tesla=b0_tesla)

        res = SrwEngine.simulate_undulator_radiation(beam_cfg, und_cfg)
        meta = FrameMetadata(sample_rate_hz=1.0)

        return {
            "kinematics": Frame(data_type=CanonicalPortType.STRUCTURED_FRAME, metadata=meta, data=res),
            "gamma": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=res.get("gamma", 5870.8)),
            "deflection_k": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=res.get("deflection_k", 1.49)),
            "fundamental_photon_ev": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=res.get("fundamental_photon_ev", 3105.2)),
            "total_power_kw": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=res.get("total_radiated_power_kw", 4.12))
        }

class SrwWavefrontIntensityNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        energy_gev = float(self.params.get("energy_gev", 3.0))
        current_amp = float(self.params.get("current_amp", 0.5))
        b0_tesla = float(self.params.get("peak_field_tesla", 0.8))
        period_mm = float(self.params.get("period_mm", 20.0))
        num_periods = int(self.params.get("num_periods", 50))
        obs_dist_m = float(self.params.get("obs_dist_m", 10.0))

        beam_cfg = ElectronBeamConfig(energy_gev=energy_gev, current_amp=current_amp)
        und_cfg = UndulatorConfig(period_mm=period_mm, num_periods=num_periods, peak_field_tesla=b0_tesla)

        res = SrwEngine.simulate_undulator_radiation(beam_cfg, und_cfg, obs_dist_m=obs_dist_m)
        meta = FrameMetadata(sample_rate_hz=1.0)

        return {
            "intensity_matrix": Frame(data_type=CanonicalPortType.STRUCTURED_FRAME, metadata=meta, data={"intensity_2d": res.get("intensity_2d", [])}),
            "peak_flux": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=res.get("peak_flux", 1e18))
        }
