from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class SamplingAliasingRequest(BaseModel):
    f_signal_hz: float = Field(default=440.0, gt=0)
    f_sample_hz: float = Field(default=800.0, gt=0)
    duration_s: float = Field(default=0.02, gt=0, le=0.5)


class SamplingAliasingResponse(BaseModel):
    time_continuous: List[float]
    signal_continuous: List[float]
    time_sampled: List[float]
    signal_sampled: List[float]
    f_signal_hz: float
    f_sample_hz: float
    f_nyquist_hz: float
    is_aliased: bool
    f_aliased_hz: float
    trust_mode: str = Field(default="API_VERIFIED")


class ParksMcClellanFirRequest(BaseModel):
    num_taps: int = Field(default=29, ge=3, le=257)
    cutoff_pass_hz: float = Field(default=1000.0, gt=0)
    cutoff_stop_hz: float = Field(default=1500.0, gt=0)
    sample_rate_hz: float = Field(default=8000.0, gt=0)


class ParksMcClellanFirResponse(BaseModel):
    taps: List[float]
    frequencies_hz: List[float]
    magnitude_db: List[float]
    phase_deg: List[float]
    passband_ripple_db: float
    stopband_attenuation_db: float
    trust_mode: str = Field(default="API_VERIFIED")


class AutocorrelationRequest(BaseModel):
    signal_data: Optional[List[float]] = None
    sample_rate_hz: float = Field(default=1000.0, gt=0)
    max_lag_samples: int = Field(default=100, ge=10, le=1000)


class AutocorrelationResponse(BaseModel):
    lags: List[int]
    lag_times_ms: List[float]
    autocorrelation: List[float]
    dominant_period_ms: Optional[float]
    dominant_freq_hz: Optional[float]
    trust_mode: str = Field(default="API_VERIFIED")


class LmsAdaptiveRequest(BaseModel):
    num_taps: int = Field(default=16, ge=2, le=64)
    mu_step_size: float = Field(default=0.01, gt=0, le=0.5)
    f_signal_hz: float = Field(default=50.0, gt=0)
    f_noise_hz: float = Field(default=150.0, gt=0)
    sample_rate_hz: float = Field(default=1000.0, gt=0)
    num_samples: int = Field(default=500, ge=100, le=2000)


class LmsAdaptiveResponse(BaseModel):
    time_ms: List[float]
    desired_clean: List[float]
    noisy_input: List[float]
    filtered_output: List[float]
    error_signal: List[float]
    final_weights: List[float]
    weight_convergence_rms: List[float]
    snr_improvement_db: float
    trust_mode: str = Field(default="API_VERIFIED")


class CwtScalogramRequest(BaseModel):
    f_start_hz: float = Field(default=10.0, gt=0)
    f_stop_hz: float = Field(default=500.0, gt=0)
    num_scales: int = Field(default=64, ge=16, le=128)
    sample_rate_hz: float = Field(default=2000.0, gt=0)
    duration_s: float = Field(default=0.2, gt=0, le=1.0)


class CwtScalogramResponse(BaseModel):
    time_ms: List[float]
    frequencies_hz: List[float]
    scalogram_matrix: List[List[float]]
    peak_time_ms: float
    peak_freq_hz: float
    trust_mode: str = Field(default="API_VERIFIED")
