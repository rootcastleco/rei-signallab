from enum import Enum
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator


class WaveformType(str, Enum):
    SINE = "sine"
    SQUARE = "square"
    TRIANGLE = "triangle"
    SAWTOOTH = "sawtooth"
    GAUSSIAN_NOISE = "noise"
    CHIRP = "chirp"
    ECG = "ecg"
    MULTITONE = "multitone"


class WindowType(str, Enum):
    RECTANGULAR = "rectangular"
    HAMMING = "hamming"
    HANNING = "hanning"
    BLACKMAN = "blackman"
    KAISER = "kaiser"
    FLATTOP = "flattop"


class FilterType(str, Enum):
    LOWPASS = "lowpass"
    HIGHPASS = "highpass"
    BANDPASS = "bandpass"
    BANDSTOP = "bandstop"


class FilterDesign(str, Enum):
    BUTTERWORTH = "butterworth"
    CHEBYSHEV1 = "chebyshev1"
    CHEBYSHEV2 = "chebyshev2"
    FIR_WINDOW = "fir_window"


class SignalGeneratorConfig(BaseModel):
    waveform: WaveformType = Field(default=WaveformType.SINE, description="Type of signal waveform")
    frequency: float = Field(default=440.0, ge=0.1, le=20000.0, description="Signal frequency in Hz")
    amplitude: float = Field(default=1.0, ge=0.0, le=100.0, description="Peak amplitude in Volts")
    phase: float = Field(default=0.0, ge=-360.0, le=360.0, description="Phase shift in degrees")
    offset: float = Field(default=0.0, ge=-50.0, le=50.0, description="DC Offset in Volts")
    noise_level: float = Field(default=0.0, ge=0.0, le=10.0, description="Additive noise standard deviation")
    sample_rate: int = Field(default=44100, ge=100, le=192000, description="Sampling rate in Hz")
    duration: float = Field(default=0.1, ge=0.001, le=10.0, description="Duration in seconds")
    
    # Secondary frequency for chirp or multitone
    frequency2: Optional[float] = Field(default=880.0, ge=0.1, le=20000.0, description="End frequency or secondary harmonic")


class FilterConfig(BaseModel):
    enabled: bool = Field(default=False, description="Filter active status")
    filter_type: FilterType = Field(default=FilterType.LOWPASS, description="Filter response type")
    filter_design: FilterDesign = Field(default=FilterDesign.BUTTERWORTH, description="Filter design approximation")
    cutoff: float = Field(default=1000.0, ge=1.0, le=96000.0, description="Cutoff frequency in Hz")
    cutoff2: Optional[float] = Field(default=3000.0, ge=1.0, le=96000.0, description="Upper cutoff for bandpass/bandstop")
    order: int = Field(default=4, ge=1, le=10, description="Filter order")
    ripple_db: float = Field(default=0.5, ge=0.01, le=10.0, description="Passband ripple in dB (Chebyshev)")


class FFTConfig(BaseModel):
    n_fft: int = Field(default=1024, description="FFT block size (power of 2)")
    window: WindowType = Field(default=WindowType.HANNING, description="Window function to mitigate spectral leakage")
    log_scale: bool = Field(default=True, description="Return magnitude in dB scale")
    kaiser_beta: float = Field(default=14.0, ge=0.0, le=30.0, description="Kaiser window shape parameter")

    @field_validator("n_fft")
    def validate_n_fft(cls, v: int) -> int:
        if v <= 0 or (v & (v - 1)) != 0:
            raise ValueError("n_fft must be a power of 2 (e.g. 256, 512, 1024, 2048, 4096)")
        return v


class SignalProcessingRequest(BaseModel):
    generator: SignalGeneratorConfig
    filter: FilterConfig = Field(default_factory=FilterConfig)
    fft: FFTConfig = Field(default_factory=FFTConfig)


class SignalMetrics(BaseModel):
    rms: float
    peak_to_peak: float
    dc_mean: float
    thd_percent: float
    snr_db: float
    fundamental_freq: float
    peak_magnitude_db: float


class SignalProcessingResponse(BaseModel):
    time: List[float]
    raw_signal: List[float]
    filtered_signal: List[float]
    frequency: List[float]
    spectrum_magnitude: List[float]
    spectrum_phase: List[float]
    metrics: SignalMetrics
    spectrogram_matrix: Optional[List[List[float]]] = None
    spectrogram_times: Optional[List[float]] = None
    spectrogram_frequencies: Optional[List[float]] = None
