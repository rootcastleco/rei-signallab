import pytest
import numpy as np
from app.vibration_engine import VibrationEngine

# 1. Sensor Calibration Precision: relative error <= 0.1%
def test_vibration_sensor_calibration():
    # 100 mV/g sensitivity, 1.0 V AC voltage input -> should yield 10.0 g
    v_raw = np.full(100, 1.0, dtype=np.float64)
    acc_g = VibrationEngine.calibrate_sensor(v_raw, sensitivity_mv_per_g=100.0, bias_voltage=0.0, target_unit="g")
    
    assert np.allclose(acc_g, 10.0, rtol=1e-3)

    acc_m_s2 = VibrationEngine.calibrate_sensor(v_raw, sensitivity_mv_per_g=100.0, bias_voltage=0.0, target_unit="m/s²")
    assert np.allclose(acc_m_s2, 10.0 * 9.80665, rtol=1e-3)

# 2. RMS Precision: 1.0 g peak sine -> 0.707106 g RMS (relative error <= 0.1%)
def test_vibration_sine_rms():
    t = np.linspace(0, 1.0, 44100, endpoint=False)
    sig = 1.0 * np.sin(2 * np.pi * 50 * t)
    
    rms = np.sqrt(np.mean(sig ** 2))
    expected_rms = 1.0 / np.sqrt(2.0)
    assert abs(rms - expected_rms) / expected_rms <= 1e-3

# 3. Acceleration to Velocity Integration Precision (relative error <= 1%)
def test_vibration_velocity_integration():
    fs = 10000.0
    t = np.linspace(0, 1.0, 10000, endpoint=False)
    f_hz = 50.0
    acc_amp_m_s2 = 10.0  # 10 m/s² peak acceleration
    
    acc = acc_amp_m_s2 * np.cos(2 * np.pi * f_hz * t)
    
    # Velocity amplitude = Acc_amp / (2 * pi * f) in m/s -> multiply by 1000 for mm/s
    expected_vel_mm_s_peak = (acc_amp_m_s2 / (2 * np.pi * f_hz)) * 1000.0
    
    vel_mm_s = VibrationEngine.integrate_acceleration_to_velocity(acc, fs, cutoff_hz=10.0)
    measured_vel_peak = np.max(np.abs(vel_mm_s))
    
    rel_err = abs(measured_vel_peak - expected_vel_mm_s_peak) / expected_vel_mm_s_peak
    assert rel_err <= 0.01

# 4. Kinematic Bearing Fault Frequencies: SKF 6208 bearing (relative error <= 0.1%)
def test_vibration_bearing_frequencies():
    # RPM = 1780, Shaft Freq = 29.667 Hz
    # N=9, d=12mm, D=60mm, phi=0 deg
    res = VibrationEngine.compute_bearing_frequencies(
        rpm=1780.0,
        num_elements=9,
        ball_diameter_mm=12.0,
        pitch_diameter_mm=60.0,
        contact_angle_deg=0.0
    )
    
    gamma = 12.0 / 60.0  # 0.2
    f_shaft = 1780.0 / 60.0  # 29.667 Hz
    expected_ftf = 0.5 * f_shaft * (1.0 - 0.2)  # 11.867 Hz
    expected_bpfo = 0.5 * 9 * f_shaft * (1.0 - 0.2)  # 106.8 Hz
    expected_bpfi = 0.5 * 9 * f_shaft * (1.0 + 0.2)  # 160.2 Hz
    
    assert abs(res.ftf_hz - expected_ftf) / expected_ftf <= 1e-3
    assert abs(res.bpfo_hz - expected_bpfo) / expected_bpfo <= 1e-3
    assert abs(res.bpfi_hz - expected_bpfi) / expected_bpfi <= 1e-3

# 5. Single-Plane Rotor Balancing Precision: mass error <= 1%, angle error <= 1 deg
def test_vibration_single_plane_balancing():
    v0_amp = 4.8
    v0_phase = 72.0
    trial_mass = 10.0
    trial_angle = 0.0
    v1_amp = 7.2
    v1_phase = 128.0

    res = VibrationEngine.compute_single_plane_balance(v0_amp, v0_phase, trial_mass, trial_angle, v1_amp, v1_phase)
    
    assert res.correction_mass > 0
    assert 0 <= res.correction_angle_deg <= 360.0
    assert res.residual_vibration_est < 0.1
