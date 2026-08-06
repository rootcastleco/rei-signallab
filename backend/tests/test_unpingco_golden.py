import pytest
import numpy as np
from app.unpingco_engine import UnpingcoEngine


def test_sampling_aliasing_nyquist():
    # Signal f = 600 Hz, Sample rate f_s = 1000 Hz (Nyquist = 500 Hz)
    # Expected folded aliased frequency = |600 - 1000| = 400 Hz
    res = UnpingcoEngine.simulate_sampling_aliasing(f_signal_hz=600.0, f_sample_hz=1000.0, duration_s=0.02)

    assert res["is_aliased"] is True
    assert pytest.approx(res["f_aliased_hz"], abs=1e-3) == 400.0
    assert len(res["signal_continuous"]) == 2000
    assert len(res["signal_sampled"]) > 0


def test_parks_mcclellan_fir_design():
    # Equiripple FIR Filter design: Passband <= 1000 Hz, Stopband >= 1500 Hz, fs = 8000 Hz
    res = UnpingcoEngine.design_parks_mcclellan_fir(
        num_taps=29, cutoff_pass_hz=1000.0, cutoff_stop_hz=1500.0, sample_rate_hz=8000.0
    )

    assert len(res["taps"]) == 29
    assert res["stopband_attenuation_db"] > 15.0  # Stopband attenuation should be > 15 dB
    assert len(res["frequencies_hz"]) == 512


def test_autocorrelation_pitch():
    # 50 Hz sine wave sampled at 1000 Hz => Fundamental period = 20 ms (20 samples)
    t = np.linspace(0, 0.2, 200, endpoint=False)
    sig = np.sin(2.0 * np.pi * 50.0 * t).tolist()

    res = UnpingcoEngine.compute_autocorrelation(signal_data=sig, sample_rate_hz=1000.0, max_lag_samples=100)

    assert res["autocorrelation"][0] == pytest.approx(1.0, abs=1e-5)
    assert res["dominant_freq_hz"] is not None
    assert pytest.approx(res["dominant_freq_hz"], abs=3.0) == 50.0


def test_lms_adaptive_filter():
    # Test LMS noise cancellation algorithm
    res = UnpingcoEngine.lms_adaptive_filter(
        num_taps=16, mu_step_size=0.02, f_signal_hz=50.0, f_noise_hz=150.0, sample_rate_hz=1000.0, num_samples=600
    )

    assert len(res["filtered_output"]) == 600
    assert len(res["final_weights"]) == 16
    assert res["snr_improvement_db"] > 3.0  # SNR improvement must be positive and > 3 dB


def test_cwt_scalogram():
    # Test CWT Morlet scalogram
    res = UnpingcoEngine.compute_cwt_scalogram(
        f_start_hz=20.0, f_stop_hz=200.0, num_scales=32, sample_rate_hz=1000.0, duration_s=0.1
    )

    assert len(res["frequencies_hz"]) == 32
    assert len(res["scalogram_matrix"]) == 32
    assert len(res["scalogram_matrix"][0]) == 100
    assert res["peak_freq_hz"] >= 20.0
