import pytest
from app.srw_schemas import ElectronBeamConfig, UndulatorConfig, SrwSimulationRequest
from app.srw_engine import SrwEngine


def test_srw_beam_gamma_and_k():
    beam = ElectronBeamConfig(energy_gev=3.0, current_amp=0.5)
    und = UndulatorConfig(period_mm=20.0, num_periods=100, peak_field_tesla=0.8)

    res = SrwEngine.simulate_undulator_radiation(beam, und, obs_dist_m=10.0, max_harmonic=5)

    assert res["gamma"] > 5800.0
    assert res["deflection_k"] > 1.4
    assert res["fundamental_energy_ev"] > 300.0
    assert 1 in res["harmonics_ev"]
    assert 3 in res["harmonics_ev"]
    assert 5 in res["harmonics_ev"]


def test_srw_total_radiated_power():
    beam = ElectronBeamConfig(energy_gev=3.0, current_amp=0.5)
    und = UndulatorConfig(period_mm=20.0, num_periods=100, peak_field_tesla=1.0)

    res = SrwEngine.simulate_undulator_radiation(beam, und)

    assert res["total_radiated_power_kw"] > 0.5
    assert len(res["flux_spectrum"]) == 300
    assert len(res["intensity_2d_matrix"]) == 64
    assert len(res["intensity_2d_matrix"][0]) == 64
