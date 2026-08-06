import numpy as np
from typing import List, Dict, Any, Tuple
from app.antenna_schemas import (
    AntennaType, WaveguideMode, SmithChartPoint, LinkBudgetResult,
    AntennaResonanceResult, AntennaAnalysisResponse
)

class AntennaEngine:
    """
    Industrial Antenna & RF Waveguide Analytical Processing Engine.
    Handles VSWR, S11 Return Loss, Reflection Coefficient Gamma, Complex Input Impedance (R + jX),
    Friis Transmission Link Budget & Free Space Path Loss (FSPL),
    Resonator dimensions for Dipole/Monopole/Patch Antennas,
    Rectangular Waveguide Cutoff Frequencies (TE10, TE20, TM11),
    and Smith Chart Locus Coordinates.
    """

    SPEED_OF_LIGHT = 299792458.0  # m/s
    VACUUM_PERMITTIVITY = 8.854187817e-12

    @classmethod
    def compute_vswr_and_s11(
        cls,
        r_load: float,
        x_load: float,
        z0: float = 50.0
    ) -> Tuple[float, float, float, float]:
        """
        Z_L = R + jX
        Gamma = (Z_L - Z0) / (Z_L + Z0)
        VSWR = (1 + |Gamma|) / (1 - |Gamma|)
        S11 = 20 * log10(|Gamma|)
        """
        if z0 <= 0:
            raise ValueError("ANTENNA_Z0_INVALID: Characteristic impedance Z0 must be greater than zero.")

        Z_L = complex(r_load, x_load)
        Z_0 = complex(z0, 0.0)

        gamma_complex = (Z_L - Z_0) / (Z_L + Z_0)
        gamma_mag = float(np.abs(gamma_complex))
        gamma_phase_deg = float(np.degrees(np.angle(gamma_complex)) % 360.0)

        # Clamp gamma_mag for numerical safety
        gamma_mag_clamped = min(gamma_mag, 0.999999)

        vswr = (1.0 + gamma_mag_clamped) / (1.0 - gamma_mag_clamped)
        s11_db = 20.0 * np.log10(max(1e-6, gamma_mag))

        return round(float(vswr), 3), round(float(s11_db), 2), round(float(gamma_mag), 4), round(float(gamma_phase_deg), 2)

    @classmethod
    def compute_smith_chart_point(
        cls,
        r_load: float,
        x_load: float,
        z0: float = 50.0
    ) -> SmithChartPoint:
        r_norm = r_load / z0
        x_norm = x_load / z0

        Z_L = complex(r_norm, x_norm)
        gamma = (Z_L - 1.0) / (Z_L + 1.0)

        vswr, _, _, _ = cls.compute_vswr_and_s11(r_load, x_load, z0)

        return SmithChartPoint(
            normalized_r=round(r_norm, 4),
            normalized_x=round(x_norm, 4),
            gamma_real=round(float(gamma.real), 4),
            gamma_imag=round(float(gamma.imag), 4),
            swr=vswr
        )

    @classmethod
    def compute_friis_link_budget(
        cls,
        freq_hz: float,
        distance_m: float,
        tx_power_dbm: float = 20.0,
        tx_gain_dbi: float = 2.15,
        rx_gain_dbi: float = 2.15
    ) -> LinkBudgetResult:
        if freq_hz <= 0 or distance_m <= 0:
            raise ValueError("LINK_BUDGET_INVALID: Frequency and distance must be greater than zero.")

        wavelength = cls.SPEED_OF_LIGHT / freq_hz

        # Free Space Path Loss (FSPL) = 20*log10(d) + 20*log10(f) + 20*log10(4*pi/c)
        fspl_db = 20.0 * np.log10(distance_m) + 20.0 * np.log10(freq_hz) + 20.0 * np.log10(4.0 * np.pi / cls.SPEED_OF_LIGHT)

        # Received Power Pr (dBm) = Pt + Gt + Gr - FSPL
        rx_power_dbm = tx_power_dbm + tx_gain_dbi + rx_gain_dbi - fspl_db
        rx_power_mw = 10.0 ** (rx_power_dbm / 10.0)

        # Receiver Sensitivity baseline assumed -90 dBm
        link_margin_db = rx_power_dbm - (-90.0)

        return LinkBudgetResult(
            frequency_hz=freq_hz,
            wavelength_m=round(wavelength, 4),
            fspl_db=round(float(fspl_db), 2),
            rx_power_dbm=round(float(rx_power_dbm), 2),
            rx_power_milliwatts=round(float(rx_power_mw), 6),
            link_margin_db=round(float(link_margin_db), 2)
        )

    @classmethod
    def compute_antenna_resonance(
        cls,
        freq_hz: float,
        ant_type: AntennaType = AntennaType.HALF_WAVE_DIPOLE,
        er: float = 4.4
    ) -> AntennaResonanceResult:
        if freq_hz <= 0:
            raise ValueError("ANTENNA_FREQ_INVALID: Resonant frequency must be greater than zero.")

        wavelength = cls.SPEED_OF_LIGHT / freq_hz

        if ant_type == AntennaType.HALF_WAVE_DIPOLE:
            length_mm = (wavelength / 2.0) * 1000.0 * 0.95  # 0.95 end-effect factor
            width_mm = None
            eff_er = 1.0
            directivity_dbi = 2.15
        elif ant_type == AntennaType.QUARTER_WAVE_MONOPOLE:
            length_mm = (wavelength / 4.0) * 1000.0 * 0.95
            width_mm = None
            eff_er = 1.0
            directivity_dbi = 5.15
        elif ant_type == AntennaType.MICROSTRIP_PATCH:
            eff_er = (er + 1.0) / 2.0 + ((er - 1.0) / 2.0) * (1.0 / np.sqrt(1.0 + 12.0 * (1.6 / 30.0)))
            length_mm = (cls.SPEED_OF_LIGHT / (2.0 * freq_hz * np.sqrt(eff_er))) * 1000.0
            width_mm = (cls.SPEED_OF_LIGHT / (2.0 * freq_hz)) * np.sqrt(2.0 / (er + 1.0)) * 1000.0
            directivity_dbi = 7.0
        else:  # Parabolic Dish
            length_mm = wavelength * 10.0 * 1000.0
            width_mm = length_mm
            eff_er = 1.0
            directivity_dbi = 30.0

        return AntennaResonanceResult(
            antenna_type=ant_type,
            resonant_freq_hz=freq_hz,
            wavelength_m=round(wavelength, 4),
            physical_length_mm=round(float(length_mm), 2),
            physical_width_mm=round(float(width_mm), 2) if width_mm else None,
            effective_permittivity=round(float(eff_er), 3),
            directivity_dbi=directivity_dbi
        )

    @classmethod
    def compute_waveguide_cutoff(
        cls,
        a_mm: float = 22.86,
        b_mm: float = 10.16
    ) -> Dict[str, float]:
        """
        Rectangular Waveguide Cutoff Frequencies:
        fc_(m,n) = (c / 2) * sqrt((m/a)^2 + (n/b)^2)
        """
        a_m = a_mm / 1000.0
        b_m = b_mm / 1000.0

        if a_m <= 0 or b_m <= 0:
            raise ValueError("WAVEGUIDE_DIM_INVALID: Waveguide dimensions must be greater than zero.")

        fc_TE10 = (cls.SPEED_OF_LIGHT / 2.0) * (1.0 / a_m)
        fc_TE20 = (cls.SPEED_OF_LIGHT / 2.0) * (2.0 / a_m)
        fc_TE01 = (cls.SPEED_OF_LIGHT / 2.0) * (1.0 / b_m)
        fc_TM11 = (cls.SPEED_OF_LIGHT / 2.0) * np.sqrt((1.0 / a_m)**2 + (1.0 / b_m)**2)

        return {
            "fc_TE10_hz": round(float(fc_TE10), 1),
            "fc_TE20_hz": round(float(fc_TE20), 1),
            "fc_TE01_hz": round(float(fc_TE01), 1),
            "fc_TM11_hz": round(float(fc_TM11), 1)
        }
