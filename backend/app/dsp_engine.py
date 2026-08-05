import numpy as np
from scipy import signal as scipy_signal
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
from typing import Tuple, Optional
import logging

from .schemas import (
    SignalGeneratorConfig,
    FilterConfig,
    FFTConfig,
    MathQuantizerConfig,
    WaveformType,
    ModulationType,
    WindowType,
    FilterType,
    FilterDesign,
    SignalMetrics
)

logger = logging.getLogger("dsp_engine")

class DSPEngine:
    """
    Instrument-Grade Digital Signal Processing (DSP) & Matplotlib Rendering Engine.
    Provides signal synthesis, AM/FM/PM modulation, Hilbert envelope detection,
    bit quantization, fail-closed IIR/FIR/Elliptic/Bessel filtering, FFT spectral analysis,
    and server-side Matplotlib PNG plot rendering API endpoints.
    """

    @staticmethod
    def generate_signal(config: SignalGeneratorConfig) -> Tuple[np.ndarray, np.ndarray]:
        fs = max(100, int(config.sample_rate))
        dur = max(0.001, float(config.duration))
        num_samples = int(fs * dur)

        t = np.linspace(0, dur, num_samples, endpoint=False)
        phase_rad = np.radians(config.phase)
        freq = float(config.frequency)
        amp = float(config.amplitude)
        waveform = config.waveform

        if waveform == WaveformType.SINE:
            carrier = np.sin(2.0 * np.pi * freq * t + phase_rad)
        elif waveform == WaveformType.SQUARE:
            carrier = scipy_signal.square(2.0 * np.pi * freq * t + phase_rad)
        elif waveform == WaveformType.TRIANGLE:
            carrier = scipy_signal.sawtooth(2.0 * np.pi * freq * t + phase_rad, width=0.5)
        elif waveform == WaveformType.SAWTOOTH:
            carrier = scipy_signal.sawtooth(2.0 * np.pi * freq * t + phase_rad, width=1.0)
        elif waveform == WaveformType.GAUSSIAN_NOISE:
            carrier = np.random.normal(0, 1.0, num_samples)
        elif waveform == WaveformType.PINK_NOISE:
            carrier = DSPEngine._generate_pink_noise(num_samples)
        elif waveform == WaveformType.CHIRP:
            freq2 = float(config.frequency2 if config.frequency2 is not None else freq * 4)
            carrier = scipy_signal.chirp(t, f0=freq, t1=dur, f1=freq2, method='linear', phi=np.degrees(phase_rad))
        elif waveform == WaveformType.ECG:
            carrier = DSPEngine._generate_ecg(t, freq, 1.0)
        elif waveform == WaveformType.PULSE:
            carrier = scipy_signal.square(2.0 * np.pi * freq * t + phase_rad, duty=0.1)
        elif waveform == WaveformType.MULTITONE:
            freq2 = float(config.frequency2 if config.frequency2 is not None else freq * 3.0)
            c1 = np.sin(2.0 * np.pi * freq * t + phase_rad)
            c2 = 0.5 * np.sin(2.0 * np.pi * freq2 * t + phase_rad)
            c3 = 0.25 * np.sin(2.0 * np.pi * (freq * 5.0) * t)
            carrier = (c1 + c2 + c3) / 1.75
        else:
            carrier = np.sin(2.0 * np.pi * freq * t + phase_rad)

        mod_type = config.modulation_type
        if mod_type != ModulationType.NONE:
            mod_freq = float(config.mod_frequency)
            mod_idx = float(config.mod_index)
            mod_sig = np.sin(2.0 * np.pi * mod_freq * t)

            if mod_type == ModulationType.AM:
                y = amp * (1.0 + mod_idx * mod_sig) * carrier
            elif mod_type == ModulationType.FM:
                y = amp * np.sin(2.0 * np.pi * freq * t + mod_idx * mod_sig + phase_rad)
            elif mod_type == ModulationType.PM:
                y = amp * np.sin(2.0 * np.pi * freq * t + mod_idx * np.cos(2.0 * np.pi * mod_freq * t) + phase_rad)
            else:
                y = amp * carrier
        else:
            y = amp * carrier

        y = y + config.offset
        if config.noise_level > 0:
            y += np.random.normal(0, config.noise_level, num_samples)

        y = np.nan_to_num(y, nan=0.0)
        return t, y

    @staticmethod
    def _generate_pink_noise(num_samples: int) -> np.ndarray:
        uneven = num_samples % 2
        X = np.random.randn(num_samples // 2 + 1 + uneven) + 1j * np.random.randn(num_samples // 2 + 1 + uneven)
        S = np.sqrt(np.arange(len(X)) + 1.0)
        y = (np.fft.irfft(X / S))[:num_samples]
        std = np.std(y)
        return y / std if std > 0 else y

    @staticmethod
    def _generate_ecg(t: np.ndarray, bpm_freq: float, amp: float) -> np.ndarray:
        period = 1.0 / max(0.1, bpm_freq)
        t_mod = np.mod(t, period) / period
        ecg = np.zeros_like(t)
        ecg += 0.15 * amp * np.exp(-((t_mod - 0.2) ** 2) / (2 * (0.02 ** 2)))
        ecg -= 0.15 * amp * np.exp(-((t_mod - 0.35) ** 2) / (2 * (0.005 ** 2)))
        ecg += 1.0 * amp * np.exp(-((t_mod - 0.4) ** 2) / (2 * (0.01 ** 2)))
        ecg -= 0.25 * amp * np.exp(-((t_mod - 0.45) ** 2) / (2 * (0.008 ** 2)))
        ecg += 0.35 * amp * np.exp(-((t_mod - 0.7) ** 2) / (2 * (0.04 ** 2)))
        return ecg

    @staticmethod
    def apply_math_quantizer(signal_in: np.ndarray, config: MathQuantizerConfig) -> Tuple[np.ndarray, Optional[np.ndarray]]:
        y = signal_in.copy()
        if config.gain_db != 0.0:
            y *= 10.0 ** (config.gain_db / 20.0)

        if config.dc_remove:
            y -= np.mean(y)

        if config.bit_depth is not None and config.bit_depth < 24:
            bits = config.bit_depth
            levels = 2 ** bits
            max_v = np.max(np.abs(y)) or 1.0
            y_norm = np.clip(y / max_v, -1.0, 1.0)
            y_quant = np.round((y_norm + 1.0) / 2.0 * (levels - 1))
            y = (y_quant / (levels - 1) * 2.0 - 1.0) * max_v

        envelope = None
        if config.envelope_extraction and len(y) > 10:
            analytic_signal = scipy_signal.hilbert(y)
            envelope = np.abs(analytic_signal)

        return y, envelope

    @staticmethod
    def apply_filter(signal_in: np.ndarray, fs: int, config: FilterConfig) -> np.ndarray:
        """
        Applies IIR/FIR filter to input signal.
        Enforces Fail-Closed DSP execution: Raises ValueError if filter design produces unstable poles.
        """
        if not config.enabled or len(signal_in) < 10:
            return signal_in.copy()

        nyquist = fs / 2.0
        order = max(1, min(config.order, 10))
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
            elif f_design == FilterDesign.ELLIPTIC:
                b, a = scipy_signal.ellip(order, config.ripple_db, 40, norm_c, btype=f_type)
                filtered = scipy_signal.filtfilt(b, a, signal_in)
            elif f_design == FilterDesign.BESSEL:
                b, a = scipy_signal.bessel(order, norm_c, btype=f_type)
                filtered = scipy_signal.filtfilt(b, a, signal_in)
            elif f_design == FilterDesign.MEDIAN:
                kernel = min(len(signal_in) // 2 * 2 + 1, order * 2 + 1)
                filtered = scipy_signal.medfilt(signal_in, kernel_size=kernel)
            elif f_design == FilterDesign.FIR_WINDOW:
                numtaps = min(len(signal_in) // 3, order * 10 + 1)
                if numtaps % 2 == 0:
                    numtaps += 1
                b = scipy_signal.firwin(numtaps, norm_c, pass_zero=(f_type in ["lowpass", "bandstop"]))
                filtered = scipy_signal.filtfilt(b, [1.0], signal_in)
            else:
                b, a = scipy_signal.butter(order, norm_c, btype=f_type)
                filtered = scipy_signal.filtfilt(b, a, signal_in)

            filtered_clean = np.nan_to_num(filtered, nan=0.0)
            if np.all(filtered_clean == 0) and not np.all(signal_in == 0):
                raise ValueError("Filter output unstable or zeroed out.")

            return filtered_clean

        except Exception as err:
            logger.error(f"Fail-Closed Filter Execution Failed: {err}")
            raise ValueError(f"Filter execution failed: {err}")

    @staticmethod
    def get_window_function(window_type: WindowType, n: int, kaiser_beta: float = 14.0) -> np.ndarray:
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
        N = len(signal_in)
        n_fft = min(config.n_fft, N) if N >= config.n_fft else config.n_fft
        window = DSPEngine.get_window_function(config.window, min(N, n_fft), config.kaiser_beta)

        segment = signal_in[:len(window)] * window
        fft_vals = np.fft.rfft(segment, n=n_fft)
        freqs = np.fft.rfftfreq(n_fft, d=1.0/fs)

        window_gain = np.sum(window) if np.sum(window) > 0 else 1.0
        magnitude = (2.0 * np.abs(fft_vals)) / window_gain
        magnitude[0] /= 2.0
        phase = np.angle(fft_vals)

        if config.log_scale:
            eps = 1e-12
            magnitude_db = 20.0 * np.log10(np.maximum(magnitude, eps))
            return freqs, magnitude_db, phase

        return freqs, magnitude, phase

    @staticmethod
    def compute_metrics(signal_in: np.ndarray, freqs: np.ndarray, mag_linear: np.ndarray, fs: int) -> SignalMetrics:
        if len(signal_in) == 0:
            return SignalMetrics(
                rms=0, peak_to_peak=0, dc_mean=0, thd_percent=0,
                snr_db=0, sinad_db=0, sfdr_db=0, enob_bits=0,
                fundamental_freq=0, peak_magnitude_db=-120
            )

        dc_mean = float(np.mean(signal_in))
        rms = float(np.sqrt(np.mean(signal_in ** 2)))
        p2p = float(np.ptp(signal_in))

        if len(mag_linear) > 1:
            peak_idx = np.argmax(mag_linear[1:]) + 1
            fundamental_freq = float(freqs[peak_idx])
            peak_mag_v = mag_linear[peak_idx]
            peak_mag_db = float(20.0 * np.log10(max(1e-12, peak_mag_v)))

            harmonics_mag_sq = 0.0
            for h in range(2, 6):
                h_freq = fundamental_freq * h
                if h_freq < freqs[-1]:
                    h_idx = np.argmin(np.abs(freqs - h_freq))
                    harmonics_mag_sq += mag_linear[h_idx] ** 2

            thd_frac = np.sqrt(harmonics_mag_sq) / max(1e-9, peak_mag_v)
            thd_percent = float(min(100.0, thd_frac * 100.0))

            signal_power = peak_mag_v ** 2
            total_power = np.sum(mag_linear[1:] ** 2)
            noise_power = max(1e-12, total_power - signal_power - harmonics_mag_sq)
            snr_db = float(10.0 * np.log10(max(1e-12, signal_power / noise_power)))

            nad_power = noise_power + harmonics_mag_sq
            sinad_db = float(10.0 * np.log10(max(1e-12, signal_power / nad_power)))
            enob_bits = float(max(0.0, (sinad_db - 1.76) / 6.02))

            mag_copy = mag_linear.copy()
            mag_copy[0] = 0.0
            mag_copy[peak_idx] = 0.0
            spurious_peak = np.max(mag_copy)
            sfdr_db = float(20.0 * np.log10(max(1e-12, peak_mag_v / max(1e-12, spurious_peak))))
        else:
            fundamental_freq = 0.0
            peak_mag_db = -120.0
            thd_percent = 0.0
            snr_db = 0.0
            sinad_db = 0.0
            sfdr_db = 0.0
            enob_bits = 0.0

        return SignalMetrics(
            rms=round(rms, 4),
            peak_to_peak=round(p2p, 4),
            dc_mean=round(dc_mean, 4),
            thd_percent=round(thd_percent, 2),
            snr_db=round(snr_db, 2),
            sinad_db=round(sinad_db, 2),
            sfdr_db=round(sfdr_db, 2),
            enob_bits=round(enob_bits, 2),
            fundamental_freq=round(fundamental_freq, 1),
            peak_magnitude_db=round(peak_mag_db, 2)
        )

    @staticmethod
    def compute_spectrogram(signal_in: np.ndarray, fs: int, nperseg: int = 256) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        N = len(signal_in)
        if N < 16:
            signal_in = np.pad(signal_in, (0, 16 - N), mode='constant')
            N = len(signal_in)

        nperseg = min(nperseg, N)
        noverlap = max(0, nperseg // 2)
        if noverlap >= nperseg:
            noverlap = max(0, nperseg - 1)

        freqs, times, Sxx = scipy_signal.spectrogram(signal_in, fs=fs, nperseg=nperseg, noverlap=noverlap)
        Sxx_db = 10.0 * np.log10(np.maximum(Sxx, 1e-12))
        return freqs, times, Sxx_db


    # =========================================================================
    # MATPLOTLIB BACKEND PNG PLOT RENDERING METHODS FOR API USERS
    # =========================================================================

    @staticmethod
    def render_matplotlib_oscilloscope(t: np.ndarray, raw_sig: np.ndarray, filtered_sig: np.ndarray, envelope_sig: Optional[np.ndarray] = None) -> bytes:
        plt.style.use('dark_background')
        fig, ax = plt.subplots(figsize=(10, 4.5), dpi=120)
        fig.patch.set_facecolor('#0D1117')
        ax.set_facecolor('#000000')

        t_ms = t * 1000.0
        ax.plot(t_ms, raw_sig, color='#38BDF8', linewidth=1.2, label='CH1 Raw Signal', alpha=0.9)
        ax.plot(t_ms, filtered_sig, color='#34D399', linewidth=1.5, label='CH2 Filtered Signal')
        if envelope_sig is not None:
            ax.plot(t_ms, envelope_sig, color='#FBBF24', linewidth=1.0, linestyle='--', label='Hilbert Envelope')

        ax.set_title('REI SignalLab Oscilloscope (Time Domain)', color='#F0F6FC', fontsize=12, fontweight='bold', pad=12)
        ax.set_xlabel('Time (ms)', color='#8B949E', fontsize=10)
        ax.set_ylabel('Voltage (V)', color='#8B949E', fontsize=10)
        ax.grid(True, color='#1C2128', linestyle=':', linewidth=0.8)
        ax.legend(loc='upper right', facecolor='#161B22', edgecolor='#30363D', labelcolor='#F0F6FC', fontsize=9)
        ax.tick_params(colors='#8B949E', labelsize=9)

        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', facecolor=fig.get_facecolor())
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()

    @staticmethod
    def render_matplotlib_spectrum(freqs: np.ndarray, mag_db: np.ndarray, metrics: SignalMetrics) -> bytes:
        plt.style.use('dark_background')
        fig, ax = plt.subplots(figsize=(10, 4.5), dpi=120)
        fig.patch.set_facecolor('#0D1117')
        ax.set_facecolor('#000000')

        ax.plot(freqs, mag_db, color='#A78BFA', linewidth=1.5, label='FFT Spectrum (dBV)')
        if metrics and metrics.fundamental_freq > 0:
            ax.axvline(metrics.fundamental_freq, color='#F87171', linestyle='--', linewidth=1.0, label=f'Peak: {metrics.fundamental_freq} Hz')

        ax.set_title(f'REI SignalLab Spectrum Analyzer (THD: {metrics.thd_percent}% | SNR: {metrics.snr_db} dB)', color='#F0F6FC', fontsize=12, fontweight='bold', pad=12)
        ax.set_xlabel('Frequency (Hz)', color='#8B949E', fontsize=10)
        ax.set_ylabel('Magnitude (dBV)', color='#8B949E', fontsize=10)
        ax.set_ylim(-110, 25)
        ax.grid(True, color='#1C2128', linestyle=':', linewidth=0.8)
        ax.legend(loc='upper right', facecolor='#161B22', edgecolor='#30363D', labelcolor='#F0F6FC', fontsize=9)
        ax.tick_params(colors='#8B949E', labelsize=9)

        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', facecolor=fig.get_facecolor())
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()
