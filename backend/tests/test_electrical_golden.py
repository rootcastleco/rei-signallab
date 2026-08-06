import pytest
import numpy as np
from app.electrical_engine import ElectricalEngine

def test_electrical_power_metrics():
    fs = 25600
    t = np.linspace(0, 1.0, fs, endpoint=False)
    v = 230.0 * np.sqrt(2) * np.sin(2 * np.pi * 50.0 * t)
    i = 10.0 * np.sqrt(2) * np.sin(2 * np.pi * 50.0 * t - np.radians(30.0))

    metrics = ElectricalEngine.compute_power_metrics(v, i, fs, 50.0)

    assert abs(metrics.v_rms - 230.0) < 1.0
    assert abs(metrics.i_rms - 10.0) < 0.5
    assert abs(metrics.power_factor - np.cos(np.radians(30.0))) < 0.05
    assert metrics.active_power_w > 0

def test_electrical_symmetrical_components():
    # Balanced 3-phase system: VUF should be 0.0%
    sym = ElectricalEngine.compute_symmetrical_components(
        va_amp=230.0, va_phase_deg=0.0,
        vb_amp=230.0, vb_phase_deg=-120.0,
        vc_amp=230.0, vc_phase_deg=120.0
    )

    assert abs(sym.v1_pos_seq_v - 230.0) < 1e-3
    assert abs(sym.v2_neg_seq_v) < 1e-3
    assert abs(sym.v0_zero_seq_v) < 1e-3
    assert sym.vuf_percent == 0.0
