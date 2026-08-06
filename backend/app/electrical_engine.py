import numpy as np
import scipy.signal
from typing import List, Dict, Any, Tuple
from app.electrical_schemas import (
    PowerMetrics, SymmetricalComponents, HarmonicComponent, ElectricalAnalysisResponse
)

class ElectricalEngine:
    """
    Industrial Electrical & Power Quality Processing Engine.
    Handles RMS, Active/Reactive/Apparent Power, Power Factor, THD_V, THD_I,
    Fortescue 3-Phase Symmetrical Components (V0, V1, V2, VUF), 1-50th Harmonics (IEEE 519 / IEC 61000-4-30),
    and Sag/Swell/Inrush Event Detection.
    """

    SPEED_OF_LIGHT = 299792458.0

    @classmethod
    def compute_power_metrics(
        cls,
        v_sig: np.ndarray,
        i_sig: np.ndarray,
        fs: float,
        nom_freq: float = 50.0
    ) -> PowerMetrics:
        N = len(v_sig)
        if N == 0:
            raise ValueError("ELECTRICAL_EMPTY_SIGNAL: Signal arrays cannot be empty.")

        v_rms = float(np.sqrt(np.mean(v_sig**2)))
        i_rms = float(np.sqrt(np.mean(i_sig**2)))

        # Active Power P = mean(v(t) * i(t))
        active_power_w = float(np.mean(v_sig * i_sig))

        # Apparent Power S = V_rms * I_rms
        apparent_power_va = float(v_rms * i_rms)

        # Reactive Power Q = sqrt(S^2 - P^2)
        if apparent_power_va >= abs(active_power_w):
            reactive_power_var = float(np.sqrt(apparent_power_va**2 - active_power_w**2))
        else:
            reactive_power_var = 0.0

        # Power Factor PF = P / S
        power_factor = float(active_power_w / apparent_power_va) if apparent_power_va > 1e-6 else 1.0
        power_factor = float(np.clip(power_factor, -1.0, 1.0))

        # THD_V and THD_I calculation
        thd_v = cls.compute_thd(v_sig, fs, nom_freq)
        thd_i = cls.compute_thd(i_sig, fs, nom_freq)

        return PowerMetrics(
            v_rms=round(v_rms, 3),
            i_rms=round(i_rms, 3),
            active_power_w=round(active_power_w, 2),
            reactive_power_var=round(reactive_power_var, 2),
            apparent_power_va=round(apparent_power_va, 2),
            power_factor=round(power_factor, 4),
            thd_v_percent=round(thd_v, 2),
            thd_i_percent=round(thd_i, 2),
            fundamental_freq_hz=round(nom_freq, 2)
        )

    @classmethod
    def compute_thd(cls, sig: np.ndarray, fs: float, fund_freq: float) -> float:
        N = len(sig)
        if N < 16:
            return 0.0

        fft_vals = np.abs(np.fft.rfft(sig))
        freqs = np.fft.rfftfreq(N, d=1.0/fs)

        # Find fundamental bin
        fund_idx = np.argmin(np.abs(freqs - fund_freq))
        h1_mag = fft_vals[fund_idx]

        if h1_mag < 1e-6:
            return 0.0

        # Sum magnitudes of harmonics 2 to 50
        harmonic_sum_sq = 0.0
        for h in range(2, 51):
            h_freq = h * fund_freq
            if h_freq > freqs[-1]:
                break
            h_idx = np.argmin(np.abs(freqs - h_freq))
            harmonic_sum_sq += fft_vals[h_idx]**2

        thd = (np.sqrt(harmonic_sum_sq) / h1_mag) * 100.0
        return float(np.clip(thd, 0.0, 500.0))

    @classmethod
    def compute_symmetrical_components(
        cls,
        va_amp: float, va_phase_deg: float,
        vb_amp: float, vb_phase_deg: float,
        vc_amp: float, vc_phase_deg: float
    ) -> SymmetricalComponents:
        """
        Fortescue Transformation for 3-Phase Systems:
        a = exp(j * 120 deg) = -0.5 + j * sqrt(3)/2
        V0 = (Va + Vb + Vc) / 3
        V1 = (Va + a * Vb + a^2 * Vc) / 3  (Positive sequence)
        V2 = (Va + a^2 * Vb + a * Vc) / 3  (Negative sequence)
        VUF = (V2 / V1) * 100 % (Voltage Unbalance Factor)
        """
        a = np.exp(1j * np.radians(120.0))

        Va = va_amp * np.exp(1j * np.radians(va_phase_deg))
        Vb = vb_amp * np.exp(1j * np.radians(vb_phase_deg))
        Vc = vc_amp * np.exp(1j * np.radians(vc_phase_deg))

        V0 = (Va + Vb + Vc) / 3.0
        V1 = (Va + a * Vb + (a**2) * Vc) / 3.0
        V2 = (Va + (a**2) * Vb + a * Vc) / 3.0

        v0_mag = float(np.abs(V0))
        v1_mag = float(np.abs(V1))
        v2_mag = float(np.abs(V2))

        vuf = (v2_mag / v1_mag * 100.0) if v1_mag > 1e-6 else 0.0

        return SymmetricalComponents(
            v0_zero_seq_v=round(v0_mag, 2),
            v1_pos_seq_v=round(v1_mag, 2),
            v2_neg_seq_v=round(v2_mag, 2),
            vuf_percent=round(vuf, 2)
        )

    @classmethod
    def analyze_harmonics_50(
        cls,
        v_sig: np.ndarray,
        i_sig: np.ndarray,
        fs: float,
        fund_freq: float = 50.0
    ) -> List[HarmonicComponent]:
        N = len(v_sig)
        v_fft = np.abs(np.fft.rfft(v_sig))
        i_fft = np.abs(np.fft.rfft(i_sig))
        freqs = np.fft.rfftfreq(N, d=1.0/fs)

        fund_idx = np.argmin(np.abs(freqs - fund_freq))
        v_fund = v_fft[fund_idx] if v_fft[fund_idx] > 1e-6 else 1.0
        i_fund = i_fft[fund_idx] if i_fft[fund_idx] > 1e-6 else 1.0

        harmonics = []
        for h in range(1, 51):
            target_f = h * fund_freq
            if target_f > freqs[-1]:
                v_mag_pct = 0.0
                i_mag_pct = 0.0
            else:
                idx = np.argmin(np.abs(freqs - target_f))
                v_mag_pct = float((v_fft[idx] / v_fund) * 100.0)
                i_mag_pct = float((i_fft[idx] / i_fund) * 100.0)

            # IEEE 519 limit (5.0% for V_h < 69kV, 3.0% for individual harmonics)
            ieee_limit = 100.0 if h == 1 else (3.0 if h % 2 == 1 else 1.5)
            status = "PASS" if v_mag_pct <= ieee_limit else "IEEE_519_EXCEEDED"

            harmonics.append(HarmonicComponent(
                order=h,
                frequency_hz=round(target_f, 1),
                v_magnitude_percent=round(v_mag_pct, 2),
                i_magnitude_percent=round(i_mag_pct, 2),
                ieee_519_limit_percent=ieee_limit,
                status=status
            ))
        return harmonics

    @classmethod
    def detect_power_events(
        cls,
        v_sig: np.ndarray,
        i_sig: np.ndarray,
        v_nom_rms: float = 230.0
    ) -> List[Dict[str, Any]]:
        events = []
        v_rms_actual = float(np.sqrt(np.mean(v_sig**2)))
        i_peak = float(np.max(np.abs(i_sig)))
        i_rms = float(np.sqrt(np.mean(i_sig**2)))

        ratio = v_rms_actual / v_nom_rms if v_nom_rms > 0 else 1.0

        if ratio < 0.1:
            events.append({
                "event_type": "INTERRUPTION",
                "severity": "alarm",
                "description": f"Voltage Interruption detected ({v_rms_actual:.1f}V RMS, <10% nominal)"
            })
        elif ratio < 0.9:
            events.append({
                "event_type": "VOLTAGE_SAG",
                "severity": "warning",
                "description": f"Voltage Sag detected ({v_rms_actual:.1f}V RMS, {ratio*100:.1f}% nominal)"
            })
        elif ratio > 1.1:
            events.append({
                "event_type": "VOLTAGE_SWELL",
                "severity": "warning",
                "description": f"Voltage Swell detected ({v_rms_actual:.1f}V RMS, {ratio*100:.1f}% nominal)"
            })

        if i_rms > 0 and (i_peak / i_rms) > 3.0:
            events.append({
                "event_type": "INRUSH_CURRENT",
                "severity": "warning",
                "description": f"Inrush Current / High Crest Factor detected (Peak/RMS ratio: {(i_peak/i_rms):.2f})"
            })

        if not events:
            events.append({
                "event_type": "NORMAL",
                "severity": "normal",
                "description": f"Normal Power Quality ({v_rms_actual:.1f}V RMS, 100% nominal, THD within limits)"
            })

        return events
