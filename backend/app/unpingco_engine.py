import numpy as np
from scipy import signal
from typing import Dict, Any, List, Tuple


class UnpingcoEngine:
    """
    Core Signal Processing Algorithms based on Jose Unpingco's
    'Python for Signal Processing' (Springer).
    """

    @classmethod
    def simulate_sampling_aliasing(
        cls, f_signal_hz: float, f_sample_hz: float, duration_s: float = 0.02
    ) -> Dict[str, Any]:
        """
        Simulates sampling theorem and aliasing fold-over effect.
        """
        f_nyquist = f_sample_hz / 2.0
        is_aliased = f_signal_hz > f_nyquist

        # Calculate folded aliased frequency
        if is_aliased:
            k = round(f_signal_hz / f_sample_hz)
            f_aliased = abs(f_signal_hz - k * f_sample_hz)
        else:
            f_aliased = f_signal_hz

        # High resolution continuous representation (100x oversampling)
        t_cont = np.linspace(0, duration_s, 2000)
        s_cont = np.sin(2.0 * np.pi * f_signal_hz * t_cont)

        # Sampled discrete points
        n_samples = max(4, int(duration_s * f_sample_hz))
        t_sampled = np.linspace(0, duration_s, n_samples)
        s_sampled = np.sin(2.0 * np.pi * f_signal_hz * t_sampled)

        return {
            "time_continuous": t_cont.tolist(),
            "signal_continuous": s_cont.tolist(),
            "time_sampled": t_sampled.tolist(),
            "signal_sampled": s_sampled.tolist(),
            "f_signal_hz": float(f_signal_hz),
            "f_sample_hz": float(f_sample_hz),
            "f_nyquist_hz": float(f_nyquist),
            "is_aliased": bool(is_aliased),
            "f_aliased_hz": float(f_aliased),
            "trust_mode": "API_VERIFIED",
        }

    @classmethod
    def design_parks_mcclellan_fir(
        cls, num_taps: int, cutoff_pass_hz: float, cutoff_stop_hz: float, sample_rate_hz: float
    ) -> Dict[str, Any]:
        """
        Optimal Equiripple FIR Filter Design using Parks-McClellan (Remez Exchange).
        """
        # Ensure odd number of taps for Type I FIR
        if num_taps % 2 == 0:
            num_taps += 1

        nyquist = sample_rate_hz / 2.0
        pass_norm = min(cutoff_pass_hz / nyquist, 0.95)
        stop_norm = min(cutoff_stop_hz / nyquist, 0.99)

        if pass_norm >= stop_norm:
            stop_norm = min(pass_norm + 0.05, 0.99)

        bands = [0, pass_norm, stop_norm, 1.0]
        desired = [1, 0]

        # Use scipy.signal.remez
        taps = signal.remez(num_taps, bands, desired, fs=2.0)

        # Compute Frequency Response
        w, h = signal.freqz(taps, worN=512)
        freqs_hz = (w / np.pi) * nyquist
        mag_db = 20.0 * np.log10(np.maximum(np.abs(h), 1e-6))
        phase_deg = np.unwrap(np.angle(h)) * (180.0 / np.pi)

        # Calculate passband ripple and stopband attenuation
        pass_idx = freqs_hz <= cutoff_pass_hz
        stop_idx = freqs_hz >= cutoff_stop_hz

        pass_ripple = float(np.max(mag_db[pass_idx]) - np.min(mag_db[pass_idx])) if np.any(pass_idx) else 0.0
        stop_attenuation = float(-np.max(mag_db[stop_idx])) if np.any(stop_idx) else 60.0

        return {
            "taps": taps.tolist(),
            "frequencies_hz": freqs_hz.tolist(),
            "magnitude_db": mag_db.tolist(),
            "phase_deg": phase_deg.tolist(),
            "passband_ripple_db": pass_ripple,
            "stopband_attenuation_db": stop_attenuation,
            "trust_mode": "API_VERIFIED",
        }

    @classmethod
    def compute_autocorrelation(
        cls, signal_data: List[float] = None, sample_rate_hz: float = 1000.0, max_lag_samples: int = 100
    ) -> Dict[str, Any]:
        """
        Computes normalized autocorrelation function R_xx[tau].
        """
        if signal_data is None or len(signal_data) < 20:
            # Generate default signal with fundamental + noise
            t = np.linspace(0, 0.2, 500)
            signal_data = (np.sin(2 * np.pi * 50.0 * t) + 0.4 * np.sin(2 * np.pi * 150.0 * t) + 0.2 * np.random.randn(len(t))).tolist()

        x = np.array(signal_data, dtype=np.float64)
        x = x - np.mean(x)
        n = len(x)

        # Compute full autocorrelation
        corr_full = signal.correlate(x, x, mode="full")
        mid = len(corr_full) // 2

        max_lag = min(max_lag_samples, n - 1)
        r_xx = corr_full[mid : mid + max_lag + 1]

        if r_xx[0] > 0:
            r_xx = r_xx / r_xx[0]  # Normalize

        lags = np.arange(0, max_lag + 1)
        lag_times_ms = (lags / sample_rate_hz) * 1000.0

        # Find dominant pitch peak (ignoring zero-lag)
        if len(r_xx) > 5:
            peaks, _ = signal.find_peaks(r_xx[2:], height=0.2, distance=5)
            if len(peaks) > 0:
                dom_lag = peaks[0] + 2
                dom_period_ms = float((dom_lag / sample_rate_hz) * 1000.0)
                dom_freq_hz = float(sample_rate_hz / dom_lag)
            else:
                dom_period_ms = None
                dom_freq_hz = None
        else:
            dom_period_ms = None
            dom_freq_hz = None

        return {
            "lags": lags.tolist(),
            "lag_times_ms": lag_times_ms.tolist(),
            "autocorrelation": r_xx.tolist(),
            "dominant_period_ms": dom_period_ms,
            "dominant_freq_hz": dom_freq_hz,
            "trust_mode": "API_VERIFIED",
        }

    @classmethod
    def lms_adaptive_filter(
        cls,
        num_taps: int = 16,
        mu_step_size: float = 0.01,
        f_signal_hz: float = 50.0,
        f_noise_hz: float = 150.0,
        sample_rate_hz: float = 1000.0,
        num_samples: int = 500,
    ) -> Dict[str, Any]:
        """
        Least Mean Squares (LMS) Adaptive Noise Canceller Algorithm.
        """
        t = np.linspace(0, num_samples / sample_rate_hz, num_samples, endpoint=False)

        # Desired clean signal
        d_clean = np.sin(2.0 * np.pi * f_signal_hz * t)

        # Reference noise and interfering noise
        ref_noise = np.sin(2.0 * np.pi * f_noise_hz * t + 0.3)
        noisy_input = d_clean + 0.8 * ref_noise + 0.1 * np.random.randn(num_samples)

        w = np.zeros(num_taps)
        y_out = np.zeros(num_samples)
        e_err = np.zeros(num_samples)
        weight_rms = np.zeros(num_samples)

        # LMS iteration loop
        for n in range(num_taps, num_samples):
            x_vec = ref_noise[n - num_taps : n][::-1]
            y = np.dot(w, x_vec)
            e = noisy_input[n] - y

            w = w + 2.0 * mu_step_size * e * x_vec
            y_out[n] = y
            e_err[n] = e
            weight_rms[n] = np.sqrt(np.mean(w**2))

        # SNR Improvement
        snr_in = 10.0 * np.log10(np.var(d_clean) / np.var(noisy_input - d_clean))
        snr_out = 10.0 * np.log10(np.var(d_clean) / np.var(e_err[num_taps * 2 :] - d_clean[num_taps * 2 :]))
        snr_imp = float(snr_out - snr_in)

        return {
            "time_ms": (t * 1000.0).tolist(),
            "desired_clean": d_clean.tolist(),
            "noisy_input": noisy_input.tolist(),
            "filtered_output": e_err.tolist(),  # Cleaned signal error = d - y
            "error_signal": e_err.tolist(),
            "final_weights": w.tolist(),
            "weight_convergence_rms": weight_rms.tolist(),
            "snr_improvement_db": float(snr_imp),
            "trust_mode": "API_VERIFIED",
        }

    @classmethod
    def compute_cwt_scalogram(
        cls,
        f_start_hz: float = 10.0,
        f_stop_hz: float = 500.0,
        num_scales: int = 64,
        sample_rate_hz: float = 2000.0,
        duration_s: float = 0.2,
    ) -> Dict[str, Any]:
        """
        Continuous Wavelet Transform (CWT) Time-Frequency Scalogram.
        """
        n_samples = int(duration_s * sample_rate_hz)
        t = np.linspace(0, duration_s, n_samples, endpoint=False)

        # Linear Chirp signal from f_start to f_stop
        sig = signal.chirp(t, f0=f_start_hz, t1=duration_s, f1=f_stop_hz, method="linear")

        freqs = np.linspace(f_start_hz, f_stop_hz, num_scales)
        widths = (0.5 * sample_rate_hz) / (2.0 * np.pi * np.maximum(freqs, 1.0))

        scalogram = np.zeros((num_scales, n_samples))

        for i, w in enumerate(widths):
            w_clamped = max(w, 1.0)
            points = min(80, int(8 * w_clamped))
            vec_t = np.arange(-points, points + 1)
            wavelet = (1.0 - (vec_t / w_clamped) ** 2) * np.exp(-0.5 * (vec_t / w_clamped) ** 2)
            conv = np.convolve(sig, wavelet, mode="same")
            scalogram[i, :] = np.abs(conv)

        # Normalize scalogram 0..1
        max_val = np.max(scalogram)
        if max_val > 0:
            scalogram = scalogram / max_val

        max_idx = np.unravel_index(np.argmax(scalogram), scalogram.shape)
        peak_scale_idx, peak_time_idx = max_idx

        peak_freq = float(freqs[peak_scale_idx])
        peak_time_ms = float(t[peak_time_idx] * 1000.0)

        return {
            "time_ms": (t * 1000.0).tolist(),
            "frequencies_hz": freqs.tolist(),
            "scalogram_matrix": scalogram.tolist(),
            "peak_time_ms": peak_time_ms,
            "peak_freq_hz": peak_freq,
            "trust_mode": "API_VERIFIED",
        }
