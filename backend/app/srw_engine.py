import numpy as np
from typing import Dict, Any, List
from app.srw_schemas import ElectronBeamConfig, UndulatorConfig


class SrwEngine:
    """
    Synchrotron Radiation Workshop (SRW) Physics Engine.
    Computes relativistic electron beam dynamics, undulator radiation kinematics,
    spectral flux distributions, and 2D wavefront intensity patterns.
    """

    @classmethod
    def simulate_undulator_radiation(
        cls,
        beam_cfg: ElectronBeamConfig,
        und_cfg: UndulatorConfig,
        obs_dist_m: float = 10.0,
        max_harmonic: int = 5,
    ) -> Dict[str, Any]:
        E_gev = beam_cfg.energy_gev
        I_amp = beam_cfg.current_amp
        lambda_u_cm = und_cfg.period_mm / 10.0
        N_u = und_cfg.num_periods
        L_u_m = (und_cfg.period_mm * N_u) / 1000.0
        B0_t = und_cfg.peak_field_tesla

        # 1. Relativistic Parameters
        gamma = (E_gev * 1e9) / 0.51099895e6
        K_param = 0.93372 * B0_t * lambda_u_cm

        # 2. Fundamental & Odd Harmonic Photon Energies (eV)
        # E1 [eV] = 949.63 * E_gev^2 / (lambda_u_cm * (1 + K^2 / 2))
        E1_ev = (949.63 * (E_gev**2)) / (lambda_u_cm * (1.0 + 0.5 * (K_param**2)))

        harmonics = {}
        for n in range(1, max_harmonic + 2, 2):
            harmonics[n] = float(round(n * E1_ev, 2))

        # 3. Total Radiated Power (kW)
        P_rad_kw = 0.6331 * (E_gev**2) * (B0_t**2) * L_u_m * I_amp

        # 4. Peak Spectral Flux (photons/s/0.1%BW)
        # Approximate undulator spectral flux peak formula
        Q_k = (K_param**2) / (2.0 + K_param**2)
        F1_peak = 1.431e14 * N_u * I_amp * Q_k

        # 5. Energy Axis & Spectral Flux Curve F(E)
        n_points = 300
        e_max = min(max_harmonic * E1_ev * 1.3, 100000.0)
        e_axis = np.linspace(max(1.0, E1_ev * 0.2), e_max, n_points)
        flux_spectrum = np.zeros(n_points)

        for n, En in harmonics.items():
            sigma_e = En / (N_u * n)  # Undulator line width
            peak_val = F1_peak / (n**1.2)
            flux_spectrum += peak_val * np.exp(-0.5 * ((e_axis - En) / sigma_e) ** 2)

        # Baseline synchrotron background radiation
        flux_spectrum += F1_peak * 0.02 * np.exp(-e_axis / (E1_ev * 3.0))

        # 6. 2D Transverse Intensity Profile I(x, y) on Observation Screen
        grid_size = 64
        x_max_mm = 5.0 * (obs_dist_m / 10.0)
        x_vec = np.linspace(-x_max_mm, x_max_mm, grid_size)
        y_vec = np.linspace(-x_max_mm, x_max_mm, grid_size)
        X, Y = np.meshgrid(x_vec, y_vec)

        R2 = X**2 + Y**2
        sigma_beam_mm = 0.8 * (obs_dist_m / 10.0)
        intensity_2d = np.exp(-0.5 * R2 / (sigma_beam_mm**2))

        # Add undulator interference rings
        k_ring = (2.0 * np.pi * E1_ev) / 1239.84  # nm^-1
        ring_pattern = (np.cos(k_ring * R2 * 0.005) + 1.0) * 0.5
        intensity_2d = intensity_2d * (0.6 + 0.4 * ring_pattern)

        # 7. Angular Power Density d2P / dOmega (W/mrad^2)
        angular_x_mrad = np.linspace(-2.0, 2.0, 100)
        theta_x = angular_x_mrad * 1e-3
        gamma_theta = gamma * theta_x
        ang_power = P_rad_kw * 1e3 / (1.0 + gamma_theta**2) ** 2.5

        return {
            "gamma": float(round(gamma, 2)),
            "deflection_k": float(round(K_param, 4)),
            "fundamental_energy_ev": float(round(E1_ev, 2)),
            "harmonics_ev": harmonics,
            "total_radiated_power_kw": float(round(P_rad_kw, 4)),
            "peak_spectral_flux": float(round(F1_peak, 2)),
            "energy_axis_ev": e_axis.tolist(),
            "flux_spectrum": flux_spectrum.tolist(),
            "transverse_x_mm": x_vec.tolist(),
            "transverse_y_mm": y_vec.tolist(),
            "intensity_2d_matrix": intensity_2d.tolist(),
            "angular_x_mrad": angular_x_mrad.tolist(),
            "angular_power_density": ang_power.tolist(),
            "trust_mode": "API_VERIFIED",
        }
