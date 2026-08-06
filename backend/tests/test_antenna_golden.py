import pytest
import numpy as np
from app.antenna_engine import AntennaEngine

def test_antenna_vswr_matched_load():
    # Matched load ZL = 50 + j0 -> VSWR = 1.0, S11 = -inf or very low dB
    vswr, s11, gamma, phase = AntennaEngine.compute_vswr_and_s11(50.0, 0.0, 50.0)

    assert abs(vswr - 1.0) < 1e-3
    assert gamma < 1e-3
    assert s11 < -40.0

def test_antenna_vswr_unmatched_load():
    # ZL = 75 + j0 -> Gamma = (75-50)/(75+50) = 25/125 = 0.2 -> VSWR = (1+0.2)/(1-0.2) = 1.25 / 0.8 = 1.5
    vswr, s11, gamma, phase = AntennaEngine.compute_vswr_and_s11(75.0, 0.0, 50.0)

    assert abs(vswr - 1.5) < 1e-2
    assert abs(gamma - 0.2) < 1e-2

def test_antenna_friis_path_loss():
    # 2.4 GHz, 100 meters
    lb = AntennaEngine.compute_friis_link_budget(2.4e9, 100.0, 20.0, 2.15, 2.15)

    assert lb.fspl_db > 75.0  # Approx 80 dB path loss
    assert lb.wavelength_m > 0.12 and lb.wavelength_m < 0.13  # 0.125m

def test_waveguide_cutoff():
    # WR-90 (22.86mm x 10.16mm) -> TE10 cutoff approx 6.55 GHz
    wc = AntennaEngine.compute_waveguide_cutoff(22.86, 10.16)

    assert abs((wc["fc_TE10_hz"] / 1e9) - 6.557) < 0.1
