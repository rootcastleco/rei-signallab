import numpy as np
from typing import Dict, Any
from .base import BaseNodeRuntime
from ..graph.types import Frame, FrameMetadata, CanonicalPortType
from ..antenna_engine import AntennaEngine

class AntennaVswrNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        r_load = float(self.params.get("r_load", 75.0))
        x_load = float(self.params.get("x_load", 25.0))
        z0 = float(self.params.get("z0", 50.0))

        vswr, s11_db, gamma_mag, gamma_phase = AntennaEngine.compute_vswr_and_s11(r_load, x_load, z0)
        meta = FrameMetadata(sample_rate_hz=1.0)

        return {
            "vswr": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=vswr),
            "s11_db": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=s11_db),
            "gamma_magnitude": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=gamma_mag),
            "gamma_phase_deg": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=gamma_phase)
        }

class AntennaFriisNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        tx_power_dbm = float(self.params.get("tx_power_dbm", 30.0))
        tx_gain_dbi = float(self.params.get("tx_gain_dbi", 2.15))
        rx_gain_dbi = float(self.params.get("rx_gain_dbi", 2.15))
        freq_mhz = float(self.params.get("frequency_mhz", 2400.0))
        dist_km = float(self.params.get("distance_km", 1.0))
        rx_sens_dbm = float(self.params.get("rx_sensitivity_dbm", -90.0))

        link_res = AntennaEngine.compute_friis_link_budget(
            pt_dbm=tx_power_dbm, gt_dbi=tx_gain_dbi, gr_dbi=rx_gain_dbi,
            freq_mhz=freq_mhz, dist_km=dist_km, rx_sens_dbm=rx_sens_dbm
        )
        meta = FrameMetadata(sample_rate_hz=1.0)

        return {
            "link_budget": Frame(data_type=CanonicalPortType.STRUCTURED_FRAME, metadata=meta, data=link_res.model_dump()),
            "path_loss_db": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=link_res.path_loss_db),
            "received_power_dbm": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=link_res.pr_dbm),
            "link_margin_db": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=link_res.link_margin_db)
        }

class AntennaWaveguideNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        a_mm = float(self.params.get("a_dim_mm", 22.86)) # WR-90 standard
        b_mm = float(self.params.get("b_dim_mm", 10.16))
        m = int(self.params.get("mode_m", 1))
        n = int(self.params.get("mode_n", 0))
        f_ghz = float(self.params.get("operating_freq_ghz", 10.0))

        fc_ghz, lambda_g_mm = AntennaEngine.compute_waveguide_cutoff(a_mm, b_mm, m, n, f_ghz)
        meta = FrameMetadata(sample_rate_hz=1.0)

        return {
            "cutoff_freq_ghz": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=fc_ghz),
            "guide_wavelength_mm": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=lambda_g_mm)
        }
