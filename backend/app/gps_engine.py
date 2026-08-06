import numpy as np
import scipy.fft as fft
from typing import List, Dict, Any, Tuple
import datetime

class GpsEngine:
    """
    High-Precision GPS L1 C/A SDR Signal Simulator Engine (gps-sdr-sim).
    Simulates GPS constellation satellite orbits, Doppler shifts, Gold Codes,
    I/Q baseband signals, DOP values, and NMEA streams.
    """
    F_L1 = 1575.42e6          # GPS L1 Carrier Frequency (1575.42 MHz)
    C_SPEED = 299792458.0      # Speed of light (m/s)
    CHIP_RATE = 1.023e6        # GPS C/A Chip Rate (1.023 MHz)
    CODE_LENGTH = 1023         # Gold Code length (chips)

    # G2 Phase Taps for PRN 1 to 32
    PRN_TAPS = {
        1: (2, 6),   2: (3, 7),   3: (4, 8),   4: (5, 9),   5: (1, 9),   6: (2, 10),  7: (1, 8),   8: (2, 9),
        9: (3, 10), 10: (2, 3),  11: (3, 4),  12: (5, 6),  13: (6, 7),  14: (7, 8),  15: (8, 9),  16: (9, 10),
        17: (1, 4), 18: (2, 5),  19: (3, 6),  20: (4, 7),  21: (5, 8),  22: (6, 9),  23: (1, 3),  24: (4, 6),
        25: (5, 7), 26: (6, 8),  27: (7, 9),  28: (8, 10), 29: (1, 6),  30: (2, 7),  31: (3, 8),  32: (4, 9)
    }

    @classmethod
    def generate_gold_code(cls, prn: int) -> np.ndarray:
        """
        Generate 1023-chip GPS C/A Gold Code sequence (+1 / -1) for PRN 1..32.
        G1 = x^10 + x^3 + 1
        G2 = x^10 + x^9 + x^8 + x^6 + x^3 + x^2 + 1
        """
        if prn not in cls.PRN_TAPS:
            prn = 1
        t1, t2 = cls.PRN_TAPS[prn]

        g1 = np.ones(10, dtype=int)
        g2 = np.ones(10, dtype=int)
        code = np.zeros(cls.CODE_LENGTH, dtype=int)

        for i in range(cls.CODE_LENGTH):
            # Output chip is G1[9] XOR G2[t1-1] XOR G2[t2-1]
            out = (g1[9] ^ g2[t1 - 1] ^ g2[t2 - 1])
            code[i] = 1 if out == 0 else -1

            # Shift G1: feedback at taps 3 and 10 (indices 2 and 9)
            f1 = g1[2] ^ g1[9]
            g1[1:] = g1[:-1]
            g1[0] = f1

            # Shift G2: feedback at taps 2,3,6,8,9,10 (indices 1,2,5,7,8,9)
            f2 = g2[1] ^ g2[2] ^ g2[5] ^ g2[7] ^ g2[8] ^ g2[9]
            g2[1:] = g2[:-1]
            g2[0] = f2

        return code

    @classmethod
    def compute_auto_correlation(cls, code: np.ndarray) -> np.ndarray:
        """Computes periodic auto-correlation of a 1023-chip Gold Code sequence."""
        N = len(code)
        corr = np.zeros(N, dtype=float)
        for lag in range(N):
            corr[lag] = np.sum(code * np.roll(code, -lag))
        return corr

    @classmethod
    def geodetic_to_ecef(cls, lat_deg: float, lon_deg: float, alt_m: float) -> Tuple[float, float, float]:
        """Convert WGS84 Geodetic (Lat, Lon, Alt) to ECEF (X, Y, Z) in meters."""
        lat = np.radians(lat_deg)
        lon = np.radians(lon_deg)
        a = 6378137.0         # WGS84 Semi-major axis
        f = 1.0 / 298.257223563
        e2 = 2.0 * f - f**2

        N = a / np.sqrt(1.0 - e2 * np.sin(lat)**2)
        X = (N + alt_m) * np.cos(lat) * np.cos(lon)
        Y = (N + alt_m) * np.cos(lat) * np.sin(lon)
        Z = (N * (1.0 - e2) + alt_m) * np.sin(lat)
        return X, Y, Z

    @classmethod
    def ecef_to_enu(cls, x: float, y: float, z: float, lat0_deg: float, lon0_deg: float, alt0_deg: float) -> Tuple[float, float, float]:
        """Convert ECEF vector (X, Y, Z) relative to reference point to local East-North-Up (ENU)."""
        x0, y0, z0 = cls.geodetic_to_ecef(lat0_deg, lon0_deg, alt0_deg)
        dx, dy, dz = x - x0, y - y0, z - z0

        lat = np.radians(lat0_deg)
        lon = np.radians(lon0_deg)

        e = -np.sin(lon) * dx + np.cos(lon) * dy
        n = -np.sin(lat) * np.cos(lon) * dx - np.sin(lat) * np.sin(lon) * dy + np.cos(lat) * dz
        u = np.cos(lat) * np.cos(lon) * dx + np.cos(lat) * np.sin(lon) * dy + np.sin(lat) * dz
        return e, n, u

    @classmethod
    def compute_satellite_orbits(cls, time_s: float = 0.0) -> List[Dict[str, Any]]:
        """
        Simulates 32 GPS MEO satellites in 6 orbital planes.
        Returns list of satellite dicts with PRN, orbital plane, ECEF position, and velocity vector.
        """
        sats = []
        a = 26560000.0        # Semi-major axis (~26,560 km)
        inc = np.radians(55.0) # Inclination 55 degrees
        omega_e = 7.2921151467e-5 # Earth rotation rate (rad/s)
        mean_motion = np.sqrt(398600.5e9 / (a**3)) # Orbital angular velocity ~1.45e-4 rad/s

        for prn in range(1, 33):
            plane = (prn - 1) % 6
            slot = (prn - 1) // 6
            omega0 = np.radians(plane * 60.0)
            u0 = np.radians(slot * 60.0 + plane * 11.0)

            u = u0 + mean_motion * time_s

            # Position in orbital plane
            x_orb = a * np.cos(u)
            y_orb = a * np.sin(u)

            # Velocity in orbital plane
            vx_orb = -a * mean_motion * np.sin(u)
            vy_orb = a * mean_motion * np.cos(u)

            # Rotate to ECEF considering Earth rotation
            Omega = omega0 - omega_e * time_s

            X = x_orb * np.cos(Omega) - y_orb * np.cos(inc) * np.sin(Omega)
            Y = x_orb * np.sin(Omega) + y_orb * np.cos(inc) * np.cos(Omega)
            Z = y_orb * np.sin(inc)

            # Velocity in ECEF
            Vx = vx_orb * np.cos(Omega) - vy_orb * np.cos(inc) * np.sin(Omega) + omega_e * Y
            Vy = vx_orb * np.sin(Omega) + vy_orb * np.cos(inc) * np.cos(Omega) - omega_e * X
            Vz = vy_orb * np.sin(inc)

            sats.append({
                "prn": prn,
                "plane": plane + 1,
                "x": X, "y": Y, "z": Z,
                "vx": Vx, "vy": Vy, "vz": Vz
            })
        return sats

    @classmethod
    def simulate(
        cls,
        lat_deg: float = 37.7749,
        lon_deg: float = -122.4194,
        alt_m: float = 10.0,
        elevation_mask_deg: float = 5.0,
        sample_rate_hz: int = 2600000,
        duration_s: float = 0.1,
        iq_format: str = "int8"
    ) -> Dict[str, Any]:
        """
        Run complete GPS L1 C/A SDR constellation simulation.
        Computes visible satellites, Doppler shifts, Pseudoranges, C/N0, DOP,
        and generates synthesized I/Q baseband telemetry.
        """
        ux, uy, uz = cls.geodetic_to_ecef(lat_deg, lon_deg, alt_m)
        all_sats = cls.compute_satellite_orbits(time_s=0.0)

        sat_results = []
        visible_sats = []
        g_matrix_rows = []

        for s in all_sats:
            prn = s["prn"]
            sx, sy, sz = s["x"], s["y"], s["z"]
            svx, svy, svz = s["vx"], s["vy"], s["vz"]

            # ENU coordinates
            e, n, u = cls.ecef_to_enu(sx, sy, sz, lat_deg, lon_deg, alt_m)
            dist = np.sqrt(e**2 + n**2 + u**2)

            elevation_deg = np.degrees(np.arcsin(u / dist))
            azimuth_deg = (np.degrees(np.arctan2(e, n)) + 360.0) % 360.0

            # Line of sight unit vector (from user to sat in ECEF)
            los_x = (sx - ux) / dist
            los_y = (sy - uy) / dist
            los_z = (sz - uz) / dist

            # Doppler shift (Hz)
            rel_v = (svx * los_x + svy * los_y + svz * los_z)
            doppler_hz = - (rel_v / cls.C_SPEED) * cls.F_L1

            # C/N0 SNR signal level (dB-Hz)
            visible = elevation_deg >= elevation_mask_deg
            snr_db_hz = 45.0 + 5.0 * np.sin(np.radians(elevation_deg)) if visible else 0.0

            sat_info = {
                "prn": prn,
                "elevation_deg": round(elevation_deg, 2),
                "azimuth_deg": round(azimuth_deg, 2),
                "doppler_hz": round(doppler_hz, 1),
                "snr_db_hz": round(snr_db_hz, 1),
                "pseudorange_m": round(dist, 1),
                "visible": visible,
                "ecef_x_m": round(sx, 1),
                "ecef_y_m": round(sy, 1),
                "ecef_z_m": round(sz, 1)
            }
            sat_results.append(sat_info)

            if visible:
                visible_sats.append(sat_info)
                g_matrix_rows.append([-los_x, -los_y, -los_z, 1.0])

        # Compute DOP (Dilution of Precision) metrics
        gdop, pdop, hdop, vdop = 99.9, 99.9, 99.9, 99.9
        if len(g_matrix_rows) >= 4:
            try:
                G = np.array(g_matrix_rows)
                Q = np.linalg.inv(G.T @ G)
                pdop = round(float(np.sqrt(Q[0,0] + Q[1,1] + Q[2,2])), 2)
                gdop = round(float(np.sqrt(np.trace(Q))), 2)

                # Local ENU covariance for HDOP / VDOP
                lat = np.radians(lat_deg)
                lon = np.radians(lon_deg)
                R_ecef2enu = np.array([
                    [-np.sin(lon), np.cos(lon), 0],
                    [-np.sin(lat)*np.cos(lon), -np.sin(lat)*np.sin(lon), np.cos(lat)],
                    [np.cos(lat)*np.cos(lon), np.cos(lat)*np.sin(lon), np.sin(lat)]
                ])
                Q_xyz = Q[0:3, 0:3]
                Q_enu = R_ecef2enu @ Q_xyz @ R_ecef2enu.T
                hdop = round(float(np.sqrt(Q_enu[0,0] + Q_enu[1,1])), 2)
                vdop = round(float(np.sqrt(Q_enu[2,2])), 2)
            except Exception:
                pass

        # Synthesize Baseband I/Q signal for top 6 visible PRNs
        N_samples = int(sample_rate_hz * duration_s)
        N_samples = min(N_samples, 65536)
        t = np.arange(N_samples) / float(sample_rate_hz)

        i_signal = np.zeros(N_samples, dtype=float)
        q_signal = np.zeros(N_samples, dtype=float)

        active_prns = [s for s in visible_sats if s["visible"]][:6]
        for s in active_prns:
            prn = s["prn"]
            d_hz = s["doppler_hz"]
            code = cls.generate_gold_code(prn)

            # Map code chips to time
            chip_indices = (t * cls.CHIP_RATE).astype(int) % cls.CODE_LENGTH
            code_wave = code[chip_indices]

            phase = 2.0 * np.pi * d_hz * t
            amp = 10.0 ** (s["snr_db_hz"] / 40.0) / 50.0

            i_signal += amp * code_wave * np.cos(phase)
            q_signal += amp * code_wave * np.sin(phase)

        # Add thermal noise floor
        noise_i = np.random.normal(0, 0.05, N_samples)
        noise_q = np.random.normal(0, 0.05, N_samples)
        i_signal += noise_i
        q_signal += noise_q

        # FFT of Baseband Spectrum
        iq_complex = i_signal + 1j * q_signal
        n_fft = 2048
        spec = np.abs(fft.fft(iq_complex[:n_fft]))
        spec_db = 20.0 * np.log10(np.maximum(spec, 1e-6))
        spec_db -= np.max(spec_db)

        freqs = np.linspace(-sample_rate_hz / 2.0, sample_rate_hz / 2.0, n_fft) / 1e6
        spec_db_shifted = np.fft.fftshift(spec_db)

        # Generate NMEA GPGGA sentence
        lat_deg_abs = abs(lat_deg)
        lat_dm = f"{int(lat_deg_abs):02d}{(lat_deg_abs % 1.0)*60.0:07.4f}"
        lat_hemi = "N" if lat_deg >= 0 else "S"

        lon_deg_abs = abs(lon_deg)
        lon_dm = f"{int(lon_deg_abs):03d}{(lon_deg_abs % 1.0)*60.0:07.4f}"
        lon_hemi = "E" if lon_deg >= 0 else "W"

        now = datetime.datetime.utcnow()
        time_str = now.strftime("%H%M%S.00")
        num_vis = len(visible_sats)

        nmea_raw = f"GPGGA,{time_str},{lat_dm},{lat_hemi},{lon_dm},{lon_hemi},1,{num_vis:02d},{hdop:.1f},{alt_m:.1f},M,0.0,M,,"
        checksum = 0
        for char in nmea_raw:
            checksum ^= ord(char)
        nmea_sentence = f"${nmea_raw}*{checksum:02X}"

        return {
            "timestamp_utc": now.isoformat() + "Z",
            "user_ecef_x": round(ux, 2),
            "user_ecef_y": round(uy, 2),
            "user_ecef_z": round(uz, 2),
            "total_satellites": len(all_sats),
            "visible_satellites_count": len(visible_sats),
            "gdop": gdop,
            "pdop": pdop,
            "hdop": hdop,
            "vdop": vdop,
            "satellites": sat_results,
            "fft_frequencies": freqs.tolist(),
            "fft_magnitude_db": spec_db_shifted.tolist(),
            "sample_rate_hz": sample_rate_hz,
            "iq_data_preview_i": i_signal[:200].tolist(),
            "iq_data_preview_q": q_signal[:200].tolist(),
            "nmea_sentence": nmea_sentence,
            "trust_mode": "API_VERIFIED"
        }
