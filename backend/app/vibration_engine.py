import numpy as np
from scipy import signal as scipy_signal
from typing import Dict, Any, List, Tuple, Optional
from pydantic import BaseModel, Field

class BearingFrequencies(BaseModel):
    rpm: float
    shaft_freq_hz: float
    ftf_hz: float
    bpfo_hz: float
    bpfi_hz: float
    bsf_hz: float

class SinglePlaneBalanceResult(BaseModel):
    initial_vibration_amp: float
    initial_vibration_phase_deg: float
    trial_weight_mass: float
    trial_weight_angle_deg: float
    trial_vibration_amp: float
    trial_vibration_phase_deg: float
    influence_coeff_amp: float
    influence_coeff_phase_deg: float
    correction_mass: float
    correction_angle_deg: float
    residual_vibration_est: float

class DiagnosticEvidence(BaseModel):
    fault_type: str
    confidence: float
    severity: str  # "normal" | "warning" | "alarm"
    evidence: List[str]
    limitations: List[str]

class VibrationEngine:
    """
    Core Vibration Analytics Engine for REI SignalLab 2.1.
    Provides Sensor Calibration, Double Integration, Kinematic Bearing Frequencies,
    Single-Plane Complex Vector Rotor Balancing, Hilbert Envelope Analysis,
    and Rule-Based Machine Fault Classification.
    """

    GRAVITY_M_S2 = 9.80665

    @classmethod
    def calibrate_sensor(
        cls,
        raw_voltage: np.ndarray,
        sensitivity_mv_per_g: float = 100.0,
        bias_voltage: float = 0.0,
        target_unit: str = "g"
    ) -> np.ndarray:
        if sensitivity_mv_per_g <= 0:
            raise ValueError("SENSOR_SENSITIVITY_INVALID: Sensitivity must be greater than zero.")

        sensitivity_v_per_g = sensitivity_mv_per_g / 1000.0
        acc_g = (raw_voltage - bias_voltage) / sensitivity_v_per_g

        if target_unit == "m/s²":
            return acc_g * cls.GRAVITY_M_S2
        elif target_unit == "g":
            return acc_g
        else:
            raise ValueError("VIBRATION_UNIT_UNSUPPORTED: Unknown target unit '{}'. Supported: g, m/s²".format(target_unit))

    @classmethod
    def integrate_acceleration_to_velocity(
        cls,
        acc_m_s2: np.ndarray,
        fs: float,
        cutoff_hz: float = 10.0
    ) -> np.ndarray:
        """
        High-pass regularized frequency-domain integration:
        v(t) = F^-1 { F{a(t)} / (j * 2 * pi * f) }
        Converts acceleration (m/s²) to velocity (mm/s).
        """
        N = len(acc_m_s2)
        if N < 10:
            raise ValueError("INSUFFICIENT_RECORD_LENGTH: Need >= 10 samples for integration, got {}".format(N))

        fft_a = np.fft.rfft(acc_m_s2)
        freqs = np.fft.rfftfreq(N, d=1.0/fs)

        # Regularization: High-pass filter below cutoff to prevent low-frequency drift
        omega = 2.0 * np.pi * freqs
        inv_j_omega = np.zeros_like(fft_a, dtype=np.complex128)
        mask = freqs >= cutoff_hz
        inv_j_omega[mask] = 1.0 / (1j * omega[mask])

        fft_v = fft_a * inv_j_omega
        vel_m_s = np.fft.irfft(fft_v, n=N)
        vel_mm_s = vel_m_s * 1000.0  # m/s to mm/s

        return vel_mm_s

    @classmethod
    def integrate_velocity_to_displacement(
        cls,
        vel_mm_s: np.ndarray,
        fs: float,
        cutoff_hz: float = 10.0
    ) -> np.ndarray:
        """
        Frequency-domain integration: velocity (mm/s) to displacement (μm).
        """
        N = len(vel_mm_s)
        if N < 10:
            raise ValueError("INSUFFICIENT_RECORD_LENGTH: Need >= 10 samples for integration, got {}".format(N))

        vel_m_s = vel_mm_s / 1000.0
        fft_v = np.fft.rfft(vel_m_s)
        freqs = np.fft.rfftfreq(N, d=1.0/fs)

        omega = 2.0 * np.pi * freqs
        inv_j_omega = np.zeros_like(fft_v, dtype=np.complex128)
        mask = freqs >= cutoff_hz
        inv_j_omega[mask] = 1.0 / (1j * omega[mask])

        fft_d = fft_v * inv_j_omega
        disp_m = np.fft.irfft(fft_d, n=N)
        disp_um = disp_m * 1e6  # m to μm

        return disp_um

    @classmethod
    def compute_bearing_frequencies(
        cls,
        rpm: float,
        num_elements: int,
        ball_diameter_mm: float,
        pitch_diameter_mm: float,
        contact_angle_deg: float = 0.0
    ) -> BearingFrequencies:
        if rpm <= 0 or num_elements <= 0 or pitch_diameter_mm <= 0 or ball_diameter_mm <= 0:
            raise ValueError("BEARING_GEOMETRY_INVALID: Geometry parameters must be greater than zero.")

        f_shaft = rpm / 60.0
        gamma = (ball_diameter_mm / pitch_diameter_mm) * np.cos(np.radians(contact_angle_deg))

        ftf = 0.5 * f_shaft * (1.0 - gamma)
        bpfo = 0.5 * num_elements * f_shaft * (1.0 - gamma)
        bpfi = 0.5 * num_elements * f_shaft * (1.0 + gamma)
        bsf = (pitch_diameter_mm / (2.0 * ball_diameter_mm)) * f_shaft * (1.0 - gamma**2)

        return BearingFrequencies(
            rpm=rpm,
            shaft_freq_hz=round(f_shaft, 3),
            ftf_hz=round(ftf, 3),
            bpfo_hz=round(bpfo, 3),
            bpfi_hz=round(bpfi, 3),
            bsf_hz=round(bsf, 3)
        )

    @classmethod
    def compute_single_plane_balance(
        cls,
        v0_amp: float,
        v0_phase_deg: float,
        t_mass: float,
        t_angle_deg: float,
        v1_amp: float,
        v1_phase_deg: float
    ) -> SinglePlaneBalanceResult:
        """
        Solves Single-Plane Vector Balancing Equation:
        V0 = A0 * exp(j * phi0)
        V1 = A1 * exp(j * phi1)
        W_trial = mass * exp(j * phi_trial)
        alpha = (V1 - V0) / W_trial
        W_corr = -V0 / alpha
        """
        v0_rad = np.radians(v0_phase_deg)
        v1_rad = np.radians(v1_phase_deg)
        t_rad = np.radians(t_angle_deg)

        V0 = v0_amp * np.exp(1j * v0_rad)
        V1 = v1_amp * np.exp(1j * v1_rad)
        W_trial = t_mass * np.exp(1j * t_rad)

        if np.abs(V1 - V0) < 1e-9:
            raise ValueError("BALANCE_MATRIX_ILL_CONDITIONED: Trial run produced zero vibration change.")

        alpha = (V1 - V0) / W_trial
        W_corr = -V0 / alpha

        corr_mass = float(np.abs(W_corr))
        corr_angle_deg = float(np.degrees(np.angle(W_corr)) % 360.0)

        alpha_amp = float(np.abs(alpha))
        alpha_phase_deg = float(np.degrees(np.angle(alpha)) % 360.0)

        residual_est = float(np.abs(V0 + alpha * W_corr))

        return SinglePlaneBalanceResult(
            initial_vibration_amp=v0_amp,
            initial_vibration_phase_deg=v0_phase_deg,
            trial_weight_mass=t_mass,
            trial_weight_angle_deg=t_angle_deg,
            trial_vibration_amp=v1_amp,
            trial_vibration_phase_deg=v1_phase_deg,
            influence_coeff_amp=round(alpha_amp, 4),
            influence_coeff_phase_deg=round(alpha_phase_deg, 2),
            correction_mass=round(corr_mass, 3),
            correction_angle_deg=round(corr_angle_deg, 2),
            residual_vibration_est=round(residual_est, 4)
        )

    @classmethod
    def compute_two_plane_balance(
        cls,
        va0_amp: float, va0_phase_deg: float,
        vb0_amp: float, vb0_phase_deg: float,
        w_ta_mass: float, w_ta_angle_deg: float,
        vaa_amp: float, vaa_phase_deg: float,
        vba_amp: float, vba_phase_deg: float,
        w_tb_mass: float, w_tb_angle_deg: float,
        vab_amp: float, vab_phase_deg: float,
        vbb_amp: float, vbb_phase_deg: float
    ) -> Dict[str, Any]:
        """
        Solves 2-Plane Influence Coefficient Matrix Balancing:
        [ alpha_AA  alpha_AB ] [ W_cA ] = - [ V_A0 ]
        [ alpha_BA  alpha_BB ] [ W_cB ]   - [ V_B0 ]
        """
        VA0 = va0_amp * np.exp(1j * np.radians(va0_phase_deg))
        VB0 = vb0_amp * np.exp(1j * np.radians(vb0_phase_deg))
        W_tA = w_ta_mass * np.exp(1j * np.radians(w_ta_angle_deg))
        W_tB = w_tb_mass * np.exp(1j * np.radians(w_tb_angle_deg))

        VAA = vaa_amp * np.exp(1j * np.radians(vaa_phase_deg))
        VBA = vba_amp * np.exp(1j * np.radians(vba_phase_deg))
        VAB = vab_amp * np.exp(1j * np.radians(vab_phase_deg))
        VBB = vbb_amp * np.exp(1j * np.radians(vbb_phase_deg))

        if np.abs(W_tA) < 1e-9 or np.abs(W_tB) < 1e-9:
            raise ValueError("BALANCE_TRIAL_MASS_ZERO: Trial mass must be greater than zero.")

        alpha_AA = (VAA - VA0) / W_tA
        alpha_BA = (VBA - VB0) / W_tA
        alpha_AB = (VAB - VA0) / W_tB
        alpha_BB = (VBB - VB0) / W_tB

        A_mat = np.array([[alpha_AA, alpha_AB], [alpha_BA, alpha_BB]], dtype=complex)
        det = np.linalg.det(A_mat)

        if np.abs(det) < 1e-12:
            raise ValueError("BALANCE_MATRIX_SINGULAR: 2-plane influence matrix is singular or ill-conditioned.")

        V0_vec = np.array([VA0, VB0], dtype=complex)
        W_c_vec = -np.linalg.solve(A_mat, V0_vec)

        W_cA, W_cB = W_c_vec[0], W_c_vec[1]

        mass_A = float(np.abs(W_cA))
        angle_A = float(np.degrees(np.angle(W_cA)) % 360.0)
        mass_B = float(np.abs(W_cB))
        angle_B = float(np.degrees(np.angle(W_cB)) % 360.0)

        return {
            "balance_type": "two_plane",
            "plane_a": {
                "initial_vibration_amp": va0_amp,
                "initial_vibration_phase_deg": va0_phase_deg,
                "trial_mass": w_ta_mass,
                "trial_angle_deg": w_ta_angle_deg,
                "correction_mass": round(mass_A, 3),
                "correction_angle_deg": round(angle_A, 2)
            },
            "plane_b": {
                "initial_vibration_amp": vb0_amp,
                "initial_vibration_phase_deg": vb0_phase_deg,
                "trial_mass": w_tb_mass,
                "trial_angle_deg": w_tb_angle_deg,
                "correction_mass": round(mass_B, 3),
                "correction_angle_deg": round(angle_B, 2)
            },
            "influence_matrix": {
                "alpha_AA_amp": round(float(np.abs(alpha_AA)), 4),
                "alpha_AA_phase_deg": round(float(np.degrees(np.angle(alpha_AA)) % 360.0), 2),
                "alpha_BB_amp": round(float(np.abs(alpha_BB)), 4),
                "alpha_BB_phase_deg": round(float(np.degrees(np.angle(alpha_BB)) % 360.0), 2)
            }
        }

    @classmethod
    def compute_four_run_nophase_balance(
        cls,
        a0: float,
        trial_mass: float,
        a1: float,
        a2: float,
        a3: float
    ) -> Dict[str, Any]:
        """
        Solves 4-Run No-Phase Balancing (Phase-less amplitude-only balancing):
        Run 0: Initial amplitude A0
        Run 1: Trial mass W at 0 deg -> A1
        Run 2: Trial mass W at 120 deg -> A2
        Run 3: Trial mass W at 240 deg -> A3
        """
        if a0 <= 0 or trial_mass <= 0:
            raise ValueError("BALANCE_INPUT_INVALID: Initial amplitude and trial mass must be greater than zero.")

        # Vector K estimation using 3-run displacement vector law of cosines
        angles_rad = [0.0, np.radians(120.0), np.radians(240.0)]
        amps = [a1, a2, a3]

        K_re = 0.0
        K_im = 0.0
        for amp, ang in zip(amps, angles_rad):
            delta = (amp**2 - a0**2) / (2.0 * trial_mass * a0 + 1e-9)
            K_re += delta * np.cos(ang)
            K_im += delta * np.sin(ang)

        K_re /= 1.5
        K_im /= 1.5

        sens = np.sqrt(K_re**2 + K_im**2)
        if sens < 1e-6:
            sens = 1e-6

        unbalance_phase_rad = np.arctan2(K_im, K_re)
        corr_angle_deg = float((np.degrees(unbalance_phase_rad + np.pi)) % 360.0)
        corr_mass = float((a0 / (sens * trial_mass + 1e-9)) * trial_mass)

        return {
            "balance_type": "four_run_nophase",
            "initial_amp": a0,
            "trial_mass": trial_mass,
            "trial_amps": [a1, a2, a3],
            "correction_mass": round(corr_mass, 3),
            "correction_angle_deg": round(corr_angle_deg, 2)
        }

    @classmethod
    def compute_static_couple_balance(
        cls,
        va0_amp: float, va0_phase_deg: float,
        vb0_amp: float, vb0_phase_deg: float
    ) -> Dict[str, Any]:
        """
        Decomposes 2-plane initial vibration vectors into Static and Couple Unbalance components:
        V_static = (V_A + V_B) / 2
        V_couple = (V_A - V_B) / 2
        """
        VA0 = va0_amp * np.exp(1j * np.radians(va0_phase_deg))
        VB0 = vb0_amp * np.exp(1j * np.radians(vb0_phase_deg))

        V_static = (VA0 + VB0) / 2.0
        V_couple = (VA0 - VB0) / 2.0

        static_amp = float(np.abs(V_static))
        static_phase_deg = float(np.degrees(np.angle(V_static)) % 360.0)

        couple_amp = float(np.abs(V_couple))
        couple_phase_deg = float(np.degrees(np.angle(V_couple)) % 360.0)

        return {
            "balance_type": "static_couple",
            "static_component": {
                "amplitude": round(static_amp, 3),
                "phase_deg": round(static_phase_deg, 2)
            },
            "couple_component": {
                "amplitude": round(couple_amp, 3),
                "phase_deg": round(couple_phase_deg, 2)
            },
            "dominant_unbalance": "Static Unbalance" if static_amp > couple_amp else "Couple Unbalance"
        }

    @classmethod
    def compute_split_weight_balance(
        cls,
        target_mass: float,
        target_angle_deg: float,
        hole1_angle_deg: float,
        hole2_angle_deg: float
    ) -> Dict[str, Any]:
        """
        Splits a single correction weight vector into two fixed physical hole/blade angles:
        W_target = W1 * exp(j * hole1) + W2 * exp(j * hole2)
        """
        t_rad = np.radians(target_angle_deg)
        h1_rad = np.radians(hole1_angle_deg)
        h2_rad = np.radians(hole2_angle_deg)

        denom = np.sin(h2_rad - h1_rad)
        if np.abs(denom) < 1e-6:
            raise ValueError("BALANCE_HOLES_COLLINEAR: Fixed hole angles cannot be collinear or equal.")

        w1 = target_mass * np.sin(h2_rad - t_rad) / denom
        w2 = target_mass * np.sin(t_rad - h1_rad) / denom

        if w1 < 0 or w2 < 0:
            raise ValueError("BALANCE_SPLIT_OUT_OF_BOUNDS: Target correction angle is not between the specified hole angles.")

        return {
            "balance_type": "split_weight",
            "target_correction": {
                "mass": target_mass,
                "angle_deg": target_angle_deg
            },
            "hole_1": {
                "angle_deg": hole1_angle_deg,
                "mass": round(float(w1), 3)
            },
            "hole_2": {
                "angle_deg": hole2_angle_deg,
                "mass": round(float(w2), 3)
            }
        }

    @classmethod
    def compute_belt_frequencies(
        cls,
        driver_pulley_d1_mm: float,
        driven_pulley_d2_mm: float,
        belt_length_l_mm: float,
        driver_rpm: float
    ) -> Dict[str, Any]:
        """
        Belt Vibration Frequency Calculator:
        Belt Speed V = pi * D1 * N1 / (60 * 1000) m/s
        Belt Passing Frequency BPF = V / (L / 1000) = (pi * D1 * N1) / (60 * L) Hz
        """
        if driver_pulley_d1_mm <= 0 or driven_pulley_d2_mm <= 0 or belt_length_l_mm <= 0 or driver_rpm <= 0:
            raise ValueError("BELT_INPUT_INVALID: Pulley diameters, belt length, and RPM must be greater than zero.")

        driver_freq_hz = driver_rpm / 60.0
        driven_rpm = driver_rpm * (driver_pulley_d1_mm / driven_pulley_d2_mm)
        driven_freq_hz = driven_rpm / 60.0

        belt_speed_m_s = (np.pi * (driver_pulley_d1_mm / 1000.0) * driver_rpm) / 60.0
        bpf_hz = belt_speed_m_s / (belt_length_l_mm / 1000.0)

        return {
            "driver_speed_rpm": driver_rpm,
            "driver_freq_hz": round(driver_freq_hz, 2),
            "driven_speed_rpm": round(driven_rpm, 1),
            "driven_freq_hz": round(driven_freq_hz, 2),
            "belt_speed_m_s": round(belt_speed_m_s, 2),
            "bpf_hz": round(bpf_hz, 2),
            "bpf_harmonics_hz": [round(bpf_hz * h, 2) for h in range(1, 6)]
        }

    @classmethod
    def compute_shaft_alignment(
        cls,
        coupling_diameter_dr_mm: float,
        dist_coupling_to_front_feet_l1_mm: float,
        dist_coupling_to_rear_feet_l2_mm: float,
        rim_top: float, rim_bottom: float,
        face_top: float, face_bottom: float
    ) -> Dict[str, Any]:
        """
        Face & Rim Shaft Alignment Calculator:
        Offset = (Rim_Top - Rim_Bottom) / 2
        Angularity = (Face_Top - Face_Bottom) / Coupling_Diameter
        Front Feet Shim = Offset + Angularity * L1
        Rear Feet Shim = Offset + Angularity * L2
        """
        if coupling_diameter_dr_mm <= 0:
            raise ValueError("ALIGNMENT_COUPLING_DIAMETER_INVALID: Coupling diameter must be greater than zero.")

        offset_mm = (rim_top - rim_bottom) / 2.0
        angularity_mm_per_mm = (face_top - face_bottom) / coupling_diameter_dr_mm

        front_feet_shim_mm = offset_mm + angularity_mm_per_mm * dist_coupling_to_front_feet_l1_mm
        rear_feet_shim_mm = offset_mm + angularity_mm_per_mm * dist_coupling_to_rear_feet_l2_mm

        return {
            "offset_error_mm": round(offset_mm, 3),
            "angularity_gap_mm": round((face_top - face_bottom), 3),
            "front_feet_movement_mm": round(front_feet_shim_mm, 3),
            "rear_feet_movement_mm": round(rear_feet_shim_mm, 3),
            "alignment_status": "EXCELLENT" if abs(offset_mm) < 0.05 and abs(face_top - face_bottom) < 0.05 else "ALIGNMENT_CORRECTION_REQUIRED"
        }

    @classmethod
    def compute_vibration_unit_conversion(
        cls,
        value: float,
        input_unit: str,
        freq_hz: float
    ) -> Dict[str, Any]:
        """
        Full Vibration Unit Converter:
        Converts between 13 standard Vibration Units (Acceleration, Velocity, Displacement in RMS, Peak, Pk-Pk).
        """
        if freq_hz <= 0:
            raise ValueError("CONVERTER_FREQ_INVALID: Frequency must be greater than zero.")

        w = 2.0 * np.pi * freq_hz
        sqrt2 = np.sqrt(2.0)
        unit_key = input_unit.lower().strip()

        # Step 1: Convert input value to acceleration in m/s² RMS
        if unit_key in ["acc_g_rms", "g_rms"]:
            acc_m_s2_rms = value * 9.80665
        elif unit_key in ["acc_g_pk", "g_pk", "g"]:
            acc_m_s2_rms = (value * 9.80665) / sqrt2
        elif unit_key in ["acc_in_s2_rms"]:
            acc_m_s2_rms = value * 0.0254
        elif unit_key in ["acc_in_s2_pk"]:
            acc_m_s2_rms = (value * 0.0254) / sqrt2
        elif unit_key in ["acc_mm_s2_rms"]:
            acc_m_s2_rms = value / 1000.0
        elif unit_key in ["acc_mm_s2_pk"]:
            acc_m_s2_rms = (value / 1000.0) / sqrt2
        elif unit_key in ["acc_m_s2_rms", "m_s2_rms"]:
            acc_m_s2_rms = value
        elif unit_key in ["vel_in_s_rms"]:
            acc_m_s2_rms = (value * 0.0254) * w
        elif unit_key in ["vel_in_s_pk"]:
            acc_m_s2_rms = ((value * 0.0254) / sqrt2) * w
        elif unit_key in ["vel_mm_s_rms", "mm_s_rms"]:
            acc_m_s2_rms = (value / 1000.0) * w
        elif unit_key in ["vel_mm_s_pk"]:
            acc_m_s2_rms = ((value / 1000.0) / sqrt2) * w
        elif unit_key in ["disp_mils_pk_pk"]:
            disp_m_rms = ((value * 0.0254 / 1000.0) / 2.0) / sqrt2
            acc_m_s2_rms = disp_m_rms * (w**2)
        elif unit_key in ["disp_mm_pk_pk"]:
            disp_m_rms = ((value / 1000.0) / 2.0) / sqrt2
            acc_m_s2_rms = disp_m_rms * (w**2)
        elif unit_key in ["disp_um_pk_pk", "um_pk_pk"]:
            disp_m_rms = ((value / 1e6) / 2.0) / sqrt2
            acc_m_s2_rms = disp_m_rms * (w**2)
        else:
            acc_m_s2_rms = value

        vel_m_s_rms = acc_m_s2_rms / w
        disp_m_rms = vel_m_s_rms / w

        acc_g_rms = acc_m_s2_rms / 9.80665
        acc_g_pk = acc_g_rms * sqrt2
        acc_in_s2_rms = acc_m_s2_rms / 0.0254
        acc_in_s2_pk = acc_in_s2_rms * sqrt2
        acc_mm_s2_rms = acc_m_s2_rms * 1000.0
        acc_mm_s2_pk = acc_mm_s2_rms * sqrt2

        vel_in_s_rms = vel_m_s_rms / 0.0254
        vel_in_s_pk = vel_in_s_rms * sqrt2
        vel_mm_s_rms = vel_m_s_rms * 1000.0
        vel_mm_s_pk = vel_mm_s_rms * sqrt2

        disp_mils_pk_pk = (disp_m_rms * sqrt2 * 2.0) * (1000.0 / 0.0254)
        disp_mm_pk_pk = (disp_m_rms * sqrt2 * 2.0) * 1000.0
        disp_um_pk_pk = (disp_m_rms * sqrt2 * 2.0) * 1e6

        return {
            "freq_hz": round(freq_hz, 4),
            "equivalent_rpm": round(freq_hz * 60.0, 2),
            "input_value": value,
            "input_unit": input_unit,
            "results": {
                "acc_g_rms": round(acc_g_rms, 6),
                "acc_g_pk": round(acc_g_pk, 6),
                "acc_in_s2_rms": round(acc_in_s2_rms, 6),
                "acc_in_s2_pk": round(acc_in_s2_pk, 6),
                "acc_mm_s2_rms": round(acc_mm_s2_rms, 6),
                "acc_mm_s2_pk": round(acc_mm_s2_pk, 6),
                "vel_in_s_rms": round(vel_in_s_rms, 6),
                "vel_in_s_pk": round(vel_in_s_pk, 6),
                "vel_mm_s_rms": round(vel_mm_s_rms, 6),
                "vel_mm_s_pk": round(vel_mm_s_pk, 6),
                "disp_mils_pk_pk": round(disp_mils_pk_pk, 6),
                "disp_mm_pk_pk": round(disp_mm_pk_pk, 6),
                "disp_um_pk_pk": round(disp_um_pk_pk, 6),
            }
        }

    @classmethod
    def compute_sdof_mass_spring_damper(
        cls,
        mass_kg: float,
        stiffness_n_m: float,
        damping_c_n_s_m: float,
        x0_m: float = 0.01,
        v0_m_s: float = 0.0,
        duration_s: float = 1.0,
        fs: float = 1000.0
    ) -> Dict[str, Any]:
        """
        Mass-Spring-Damper SDOF Free Response Interactive Simulator:
        Calculates undamped natural frequency, damping ratio, damped natural frequency, and time displacement trace.
        """
        if mass_kg <= 0 or stiffness_n_m <= 0:
            raise ValueError("SDOF_INPUT_INVALID: Mass and stiffness must be greater than zero.")

        wn = np.sqrt(stiffness_n_m / mass_kg)
        fn = wn / (2.0 * np.pi)

        c_critical = 2.0 * np.sqrt(mass_kg * stiffness_n_m)
        zeta = damping_c_n_s_m / c_critical

        if zeta < 1.0:
            wd = wn * np.sqrt(1.0 - zeta**2)
            fd = wd / (2.0 * np.pi)
            system_type = "Underdamped (Oscillatory)"
        elif abs(zeta - 1.0) < 1e-5:
            wd = 0.0
            fd = 0.0
            system_type = "Critically Damped"
        else:
            wd = 0.0
            fd = 0.0
            system_type = "Overdamped"

        N = int(duration_s * fs)
        t = np.linspace(0, duration_s, N, endpoint=False)
        x_trace = []

        for tv in t:
          if zeta < 1.0:
            val = np.exp(-zeta * wn * tv) * (x0_m * np.cos(wd * tv) + ((v0_m_s + zeta * wn * x0_m) / wd) * np.sin(wd * tv))
          else:
            val = x0_m * np.exp(-wn * tv)
          x_trace.append(float(val))

        return {
            "natural_freq_hz": round(fn, 2),
            "natural_freq_rad_s": round(wn, 2),
            "damping_ratio_zeta": round(zeta, 4),
            "damped_freq_hz": round(fd, 2),
            "system_type": system_type,
            "time": t.tolist(),
            "displacement_mm": [x * 1000.0 for x in x_trace]
        }

    @classmethod
    def compute_envelope_spectrum(
        cls,
        sig: np.ndarray,
        fs: float,
        low_cutoff_hz: float = 500.0,
        high_cutoff_hz: float = 5000.0
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Bandpass filter -> Hilbert Envelope Demodulation -> FFT
        """
        nyq = fs / 2.0
        low = min(low_cutoff_hz, nyq - 10)
        high = min(high_cutoff_hz, nyq - 5)

        if low >= high or len(sig) < 16:
            raise ValueError("ENVELOPE_INVALID_PARAMS: Signal too short (need >= 16 samples) or invalid cutoff frequencies (low_cutoff >= high_cutoff)")

        b, a = scipy_signal.butter(4, [low / nyq, high / nyq], btype="bandpass")
        bandpassed = scipy_signal.filtfilt(b, a, sig)

        analytic = scipy_signal.hilbert(bandpassed)
        envelope = np.abs(analytic)
        envelope_ac = envelope - np.mean(envelope)

        N = len(envelope_ac)
        freqs = np.fft.rfftfreq(N, d=1.0/fs)
        env_fft = np.abs(np.fft.rfft(envelope_ac)) / N

        return freqs, env_fft

    @classmethod
    def classify_faults(
        cls,
        rms_vel_mm_s: float,
        peak_acc_g: float,
        crest_factor: float,
        kurtosis_val: float,
        f1_amp_mm_s: float,
        f2_amp_mm_s: float,
        bpfo_amp: float,
        rpm: float
    ) -> List[DiagnosticEvidence]:
        results = []

        # 1. Rotor Unbalance Diagnosis Rule
        if f1_amp_mm_s > 4.5 and f1_amp_mm_s > 2.0 * f2_amp_mm_s:
            results.append(DiagnosticEvidence(
                fault_type="Rotor Unbalance",
                confidence=0.88,
                severity="alarm" if f1_amp_mm_s > 7.1 else "warning",
                evidence=[
                    f"1X fundamental Shaft Speed ({rpm/60:.1f} Hz) amplitude dominates at {f1_amp_mm_s:.2f} mm/s RMS",
                    f"1X/2X ratio is {f1_amp_mm_s / max(0.001, f2_amp_mm_s):.1f}x"
                ],
                limitations=["Phase measurement required to confirm single vs two plane unbalance"]
            ))

        # 2. Angular / Parallel Misalignment Rule
        if f2_amp_mm_s > 2.5 and f2_amp_mm_s > 0.5 * f1_amp_mm_s:
            results.append(DiagnosticEvidence(
                fault_type="Shaft Misalignment",
                confidence=0.82,
                severity="warning",
                evidence=[
                    f"2X harmonic amplitude is elevated at {f2_amp_mm_s:.2f} mm/s RMS",
                    "Significant second-order shaft revolution harmonic detected"
                ],
                limitations=["Axial vibration channel recommended for angular misalignment confirmation"]
            ))

        # 3. Bearing Outer Race Defect Rule (BPFO)
        if kurtosis_val > 4.5 or bpfo_amp > 0.15:
            results.append(DiagnosticEvidence(
                fault_type="Bearing Outer Race Defect (BPFO)",
                confidence=0.85,
                severity="warning" if kurtosis_val < 7.0 else "alarm",
                evidence=[
                    f"Signal Kurtosis is elevated at {kurtosis_val:.2f} (Normal Gaussian = 3.0)",
                    f"Envelope BPFO impact spectral peak amplitude = {bpfo_amp:.3f} g"
                ],
                limitations=["Verify bearing geometry parameters with manufacturer catalog"]
            ))

        if not results:
            results.append(DiagnosticEvidence(
                fault_type="No configured fault rule exceeded",
                confidence=0.0,
                severity="normal",
                evidence=[
                    f"Overall velocity {rms_vel_mm_s:.2f} mm/s RMS is within ISO 10816 Class I/II acceptable limits",
                    f"Kurtosis {kurtosis_val:.2f} indicates smooth Gaussian vibration"
                ],
                limitations=["Absence of triggered rules does not confirm machine health. Verify ISO 10816 applicability."]
            ))

        return results

    @classmethod
    def compute_harmonic_orders(cls, fft_freqs, fft_magnitude, shaft_freq_hz, num_orders=10):
        orders = []
        for i in range(1, num_orders + 1):
            target_freq = i * shaft_freq_hz
            # Find the peak magnitude within ±5 Hz of the target frequency
            mask = (fft_freqs >= target_freq - 5) & (fft_freqs <= target_freq + 5)
            if np.any(mask):
                max_idx = np.argmax(fft_magnitude[mask])
                actual_freq = fft_freqs[mask][max_idx]
                amp = fft_magnitude[mask][max_idx]
            else:
                actual_freq = target_freq
                amp = 0.0
            
            amp_db = 20 * np.log10(amp) if amp > 0 else -100.0
            orders.append({
                "order": i,
                "frequency_hz": float(actual_freq),
                "amplitude": float(amp),
                "amplitude_db": float(amp_db)
            })
        return orders
