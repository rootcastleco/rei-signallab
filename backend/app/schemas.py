from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class WaveformType(str, Enum):
    SINE = "sine"
    SQUARE = "square"
    TRIANGLE = "triangle"
    SAWTOOTH = "sawtooth"
    GAUSSIAN_NOISE = "noise"
    PINK_NOISE = "pink_noise"
    CHIRP = "chirp"
    ECG = "ecg"
    MULTITONE = "multitone"
    PULSE = "pulse"


class ModulationType(str, Enum):
    NONE = "none"
    AM = "am"  # Amplitude Modulation
    FM = "fm"  # Frequency Modulation
    PM = "pm"  # Phase Modulation


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
    ELLIPTIC = "elliptic"
    BESSEL = "bessel"
    FIR_WINDOW = "fir_window"
    MEDIAN = "median"


class SignalGeneratorConfig(BaseModel):
    waveform: WaveformType = Field(default=WaveformType.SINE)
    frequency: float = Field(default=440.0, ge=0.1, le=20000.0)
    amplitude: float = Field(default=1.0, ge=0.0, le=100.0)
    phase: float = Field(default=0.0, ge=-360.0, le=360.0)
    offset: float = Field(default=0.0, ge=-50.0, le=50.0)
    noise_level: float = Field(default=0.0, ge=0.0, le=10.0)
    sample_rate: int = Field(default=44100, ge=100, le=192000)
    duration: float = Field(default=0.1, ge=0.001, le=10.0)
    frequency2: Optional[float] = Field(default=880.0, ge=0.1, le=20000.0)
    
    # Modulation parameters
    modulation_type: ModulationType = Field(default=ModulationType.NONE)
    mod_frequency: float = Field(default=20.0, ge=0.1, le=5000.0)
    mod_index: float = Field(default=0.5, ge=0.0, le=10.0)


class MathQuantizerConfig(BaseModel):
    envelope_extraction: bool = Field(default=False, description="Hilbert transform envelope follower")
    bit_depth: Optional[int] = Field(default=None, ge=2, le=24, description="Quantization bit depth simulation")
    dc_remove: bool = Field(default=False)
    gain_db: float = Field(default=0.0, ge=-60.0, le=40.0)


class FilterConfig(BaseModel):
    enabled: bool = Field(default=False)
    filter_type: FilterType = Field(default=FilterType.LOWPASS)
    filter_design: FilterDesign = Field(default=FilterDesign.BUTTERWORTH)
    cutoff: float = Field(default=1000.0, ge=1.0, le=96000.0)
    cutoff2: Optional[float] = Field(default=3000.0, ge=1.0, le=96000.0)
    order: int = Field(default=4, ge=1, le=10)
    ripple_db: float = Field(default=0.5, ge=0.01, le=10.0)


class FFTConfig(BaseModel):
    n_fft: int = Field(default=1024)
    window: WindowType = Field(default=WindowType.HANNING)
    log_scale: bool = Field(default=True)
    kaiser_beta: float = Field(default=14.0, ge=0.0, le=30.0)

    @field_validator("n_fft")
    def validate_n_fft(cls, v: int) -> int:
        if v <= 0 or (v & (v - 1)) != 0:
            raise ValueError("n_fft must be a power of 2")
        return v


class SignalProcessingRequest(BaseModel):
    generator: SignalGeneratorConfig
    math: MathQuantizerConfig = Field(default_factory=MathQuantizerConfig)
    filter: FilterConfig = Field(default_factory=FilterConfig)
    fft: FFTConfig = Field(default_factory=FFTConfig)


class LispProcessingRequest(BaseModel):
    lisp_code: str
    generator: SignalGeneratorConfig
    fft: FFTConfig = Field(default_factory=FFTConfig)


class PythonScriptRequest(BaseModel):
    python_code: str


class PlotRenderRequest(BaseModel):
    plot_type: str = "waveform"
    title: str = "REI SignalLab DSP Plot"
    raw_signal: Optional[List[float]] = None
    filtered_signal: Optional[List[float]] = None
    frequency: Optional[List[float]] = None
    spectrum_magnitude: Optional[List[float]] = None


class SignalMetrics(BaseModel):
    rms: float
    peak_to_peak: float
    dc_mean: float
    thd_percent: float
    snr_db: float
    sinad_db: float
    sfdr_db: float
    enob_bits: float
    fundamental_freq: float
    peak_magnitude_db: float


class SignalProcessingResponse(BaseModel):
    time: List[float]
    raw_signal: List[float]
    filtered_signal: List[float]
    envelope_signal: Optional[List[float]] = None
    frequency: List[float]
    spectrum_magnitude: List[float]
    spectrum_phase: Optional[List[float]] = None
    metrics: SignalMetrics
    spectrogram_matrix: Optional[List[List[float]]] = None
    spectrogram_times: Optional[List[float]] = None
    spectrogram_frequencies: Optional[List[float]] = None
