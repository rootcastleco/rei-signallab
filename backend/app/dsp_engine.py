import numpy as np
from scipy import signal as scipy_signal
from typing import Tuple, Dict, Any, List
import logging

from .schemas import (
    SignalGeneratorConfig,
    FilterConfig,
    FFTConfig,
    WaveformType,
    WindowType,
    FilterType,
    FilterDesign,
    SignalMetrics
)

logger = logging.getLogger("dsp_engine")

class DSPEngine:
    """
    Defensive Digital Signal Processing (DSP) Engine for SignalLab.
    Provides signal synthesis, digital filtering, spectral analysis,
    THD/SNR metrics, and spectrogram waterfall computations.
    """

    @staticmethod
    def generate_signal(config: SignalGeneratorConfig) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generates a time array and raw signal waveform based on configuration parameters.
        Defensively handles boundary checks and numerical precision.
        """
        fs = max(100, int(config.sample_rate))
        dur = max(0.001, float(config.duration))
        num_samples = int(fs * dur)
        
        t = np.linspace(0, dur, num_samples, endpoint=False)
        phase_rad = np.radians(config.phase)
        freq = float(config.frequency)
        amp = float(config.amplitude)

        waveform = config.waveform

        if waveform == WaveformType.SINE:
            y = amp * np.sin(2.0 * np.pi * freq * t + phase_rad)
        
        elif waveform == WaveformType.SQUARE:
            y = amp * scipy_signal.square(2.0 * np.pi * freq * t + phase_rad)
        
        elif waveform == WaveformType.TRIANGLE:
            y = amp * scipy_signal.sawtooth(2.0 * np.pi * freq * t + phase_rad, width=0.5)
        
        elif waveform == WaveformType.SAWTOOTH:
            y = amp * scipy_signal.sawtooth(2.0 * np.pi * freq * t + phase_rad, width=1.0)
        
        elif waveform == WaveformType.GAUSSIAN_NOISE:
            y = np.random.normal(0, max(0.1, amp), num_samples)
        
        elif waveform == WaveformType.CHIRP:
            freq2 = float(config.frequency2 if config.frequency2 is not None else freq * 4)
            y = amp * scipy_signal.chirp(t, f0=freq, t1=dur, f1=freq2, method='linear', phi=np.degrees(phase_rad))
        
        elif waveform == WaveformType.ECG:
            # Synthetic ECG cardiac signal using PQRST wave composite model
            y = DSPEngine._generate_ecg(t, freq, amp)
        
        elif waveform == WaveformType.MULTITONE:
            freq2 = float(config.frequency2 if config.frequency2 is not None else freq * 3.0)
            y1 = amp * np.sin(2.0 * np.pi * freq * t + phase_rad)
            y2 = (amp * 0.5) * np.sin(2.0 * np.pi * freq2 * t + phase_rad)
            y3 = (amp * 0.25) * np.sin(2.0 * np.pi * (freq * 5.0) * t)
            y = y1 + y2 + y3
        
        else:
            y = amp * np.sin(2.0 * np.pi * freq * t + phase_rad)

        # Add DC offset
        y = y + config.offset

        # Add Gaussian Noise if configured
        if config.noise_level > 0:
            noise = np.random.normal(0, config.noise_level, num_samples)
            y += noise

        # Clean NaN/Inf defensively
        y = np.nan_to_num(y, nan=0.0, posinf=amp, neginf=-amp)
        return t, y

    @staticmethod
    def _generate_ecg(t: np.ndarray, bpm_freq: float, amp: float) -> np.ndarray:
        """Generates synthetic ECG signal based on heart rate frequency."""
        # 1 Hz = 60 BPM. Adjust period based on bpm_freq
        period = 1.0 / max(0.1, bpm_freq)
        t_mod = np.mod(t, period) / period  # Normalized 0 to 1 cycle
        
        ecg = np.zeros_like(t)
        # P wave
        ecg += 0.15 * amp * np.exp(-((t_mod - 0.2) ** 2) / (2 * (0.02 ** 2)))
        # Q wave
        ecg -= 0.15 * amp * np.exp(-((t_mod - 0.35) ** 2) / (2 * (0.005 ** 2)))
        # R wave (sharp peak)
        ecg += 1.0 * amp * np.exp(-((t_mod - 0.4) ** 2) / (2 * (0.01 ** 2)))
        # S wave
        ecg -= 0.25 * amp * np.exp(-((t_mod - 0.45) ** 2) / (2 * (0.008 ** 2)))
        # T wave
        ecg += 0.35 * amp * np.exp(-((t_mod - 0.7) ** 2) / (2 * (0.04 ** 2)))
        
        return ecg

    @staticmethod
    def apply_filter(signal_in: np.ndarray, fs: int, config: FilterConfig) -> np.ndarray:
        """
        Applies digital filter to the signal.
        Handles zero-phase filtfilt filtering to prevent phase distortion.
        Defensively validates Nyquist limits and cutoff bounds.
        """
        if not config.enabled or len(signal_in) < 10:
            return signal_in.copy()

        nyquist = fs / 2.0
        order = max(1, min(config.order, 10))

        # Sanitize cutoffs relative to Nyquist frequency
        c1 = max(1.0, min(config.cutoff, nyquist - 1.0))
        norm_c1 = c1 / nyquist

        f_type = config.filter_type.value
        f_design = config.filter_design

        try:
            if f_type in ["bandpass", "bandstop"]:
                c2 = max(c1 + 10.0, min(config.cutoff2 or (c1 * 2), nyquist - 1.0))
                norm_c = [norm_c1, c2 / nyquist]
            else:
                norm_c = norm_c1

            if f_design == FilterDesign.BUTTERWORTH:
                b, a = scipy_signal.butter(order, norm_c, btype=f_type)
                filtered = scipy_signal.filtfilt(b, a, signal_in)

            elif f_design == FilterDesign.CHEBYSHEV1:
                b, a = scipy_signal.cheby1(order, config.ripple_db, norm_c, btype=f_type)
                filtered = scipy_signal.filtfilt(b, a, signal_in)

            elif f_design == FilterDesign.CHEBYSHEV2:
                b, a = scipy_signal.cheby2(order, 40, norm_c, btype=f_type)
                filtered = scipy_signal.filtfilt(b, a, signal_in)

            elif f_design == FilterDesign.FIR_WINDOW:
                numtaps = min(len(signal_in) // 3, order * 10 + 1)
                if numtaps % 2 == 0:
                    numtaps += 1
                b = scipy_signal.firwin(numtaps, norm_c, pass_zero=(f_type in ["lowpass", "bandstop"]))
                filtered = scipy_signal.filtfilt(b, [1.0], signal_in)
            else:
                b, a = scipy_signal.butter(order, norm_c, btype=f_type)
                filtered = scipy_signal.filtfilt(b, a, signal_in)

            return np.nan_to_num(filtered, nan=0.0)
        except Exception as err:
            logger.warning(f"Filter fallback due to error: {err}")
            return signal_in.copy()

    @staticmethod
    def get_window_function(window_type: WindowType, n: int, kaiser_beta: float = 14.0) -> np.ndarray:
        """Returns requested window weighting function."""
        if window_type == WindowType.HAMMING:
            return np.hamming(n)
        elif window_type == WindowType.HANNING:
            return np.hanning(n)
        elif window_type == WindowType.BLACKMAN:
            return np.blackman(n)
        elif window_type == WindowType.KAISER:
            return np.kaiser(n, kaiser_beta)
        elif window_type == WindowType.FLATTOP:
            return scipy_signal.windows.flattop(n)
        else:
            return np.ones(n)

    @staticmethod
    def compute_fft(signal_in: np.ndarray, fs: int, config: FFTConfig) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Computes One-sided Real FFT spectrum.
        Returns (frequencies_hz, magnitude_spectrum, phase_rad).
        """
        N = len(signal_in)
        n_fft = min(config.n_fft, N) if N >= config.n_fft else config.n_fft

        window = DSPEngine.get_window_function(config.window, min(N, n_fft), config.kaiser_beta)
        
        # Apply window to signal segment
        segment = signal_in[:len(window)] * window
        
        # Compute FFT
        fft_vals = np.fft.rfft(segment, n=n_fft)
        freqs = np.fft.rfftfreq(n_fft, d=1.0/fs)

        # Scale magnitude correctly considering window coherent gain
        window_gain = np.sum(window) if np.sum(window) > 0 else 1.0
        magnitude = (2.0 * np.abs(fft_vals)) / window_gain
        magnitude[0] /= 2.0  # DC component factor

        phase = np.angle(fft_vals)

        if config.log_scale:
            # Convert to dB (dBV scale, 20 log10(V)) with defensive epsilon floor
            eps = 1e-12
            magnitude_db = 20.0 * np.log10(np.maximum(magnitude, eps))
            return freqs, magnitude_db, phase
        
        return freqs, magnitude, phase

    @staticmethod
    def compute_metrics(signal_in: np.ndarray, freqs: np.ndarray, mag_linear: np.ndarray, fs: int) -> SignalMetrics:
        """
        Calculates signal statistics: RMS, Peak-to-Peak, DC mean, THD, SNR, Fundamental Freq.
        """
        if len(signal_in) == 0:
            return SignalMetrics(rms=0, peak_to_peak=0, dc_mean=0, thd_percent=0, snr_db=0, fundamental_freq=0, peak_magnitude_db=-120)

        dc_mean = float(np.mean(signal_in))
        rms = float(np.sqrt(np.mean(signal_in ** 2)))
        p2p = float(np.ptp(signal_in))

        # Peak frequency detection from FFT
        if len(mag_linear) > 1:
            # Exclude DC component (index 0)
            peak_idx = np.argmax(mag_linear[1:]) + 1
            fundamental_freq = float(freqs[peak_idx])
            peak_mag_v = mag_linear[peak_idx]
            peak_mag_db = float(20.0 * np.log10(max(1e-12, peak_mag_v)))

            # Calculate THD (Total Harmonic Distortion) up to 5 harmonics
            harmonics_mag_sq = 0.0
            for h in range(2, 6):
                h_freq = fundamental_freq * h
                if h_freq < freqs[-1]:
                    # Find closest frequency bin
                    h_idx = np.argmin(np.abs(freqs - h_freq))
                    harmonics_mag_sq += mag_linear[h_idx] ** 2

            thd_frac = np.sqrt(harmonics_mag_sq) / max(1e-9, peak_mag_v)
            thd_percent = float(min(100.0, thd_frac * 100.0))

            # SNR estimation (Peak power to residual noise power)
            signal_power = peak_mag_v ** 2
            total_power = np.sum(mag_linear[1:] ** 2)
            noise_power = max(1e-12, total_power - signal_power - harmonics_mag_sq)
            snr_db = float(10.0 * np.log10(max(1e-12, signal_power / noise_power)))
        else:
            fundamental_freq = 0.0
            peak_mag_db = -120.0
            thd_percent = 0.0
            snr_db = 0.0

        return SignalMetrics(
            rms=round(rms, 4),
            peak_to_peak=round(p2p, 4),
            dc_mean=round(dc_mean, 4),
            thd_percent=round(thd_percent, 2),
            snr_db=round(snr_db, 2),
            fundamental_freq=round(fundamental_freq, 1),
            peak_magnitude_db=round(peak_mag_db, 2)
        )

    @staticmethod
    def compute_spectrogram(signal_in: np.ndarray, fs: int, nperseg: int = 256) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Computes 2D Spectrogram matrix for waterfall display.
        Returns (frequencies, times, spectrogram_matrix_db).
        """
        nperseg = min(nperseg, len(signal_in))
        if nperseg < 16:
            nperseg = 16
        
        freqs, times, Sxx = scipy_signal.spectrogram(signal_in, fs=fs, nperseg=nperseg, noverlap=nperseg // 2)
        Sxx_db = 10.0 * np.log10(np.maximum(Sxx, 1e-12))
        return freqs, times, Sxx_db
