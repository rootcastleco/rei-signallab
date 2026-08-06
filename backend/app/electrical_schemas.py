from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class PhaseSystem(str, Enum):
    SINGLE_PHASE = "single_phase"
    THREE_PHASE_WYE = "three_phase_wye"
    THREE_PHASE_DELTA = "three_phase_delta"

class PowerQualityEvent(str, Enum):
    NORMAL = "normal"
    VOLTAGE_SAG = "voltage_sag"
    VOLTAGE_SWELL = "voltage_swell"
    INTERRUPTION = "interruption"
    INRUSH_CURRENT = "inrush_current"
    HIGH_HARMONICS = "high_harmonics"

class ElectricalAnalysisRequest(BaseModel):
    voltage_data: Optional[List[float]] = Field(default=None)
    current_data: Optional[List[float]] = Field(default=None)
    sample_rate: int = Field(default=25600, ge=100, le=200000)
    nominal_voltage_rms: float = Field(default=230.0, gt=0)
    nominal_frequency_hz: float = Field(default=50.0, gt=0)
    phase_system: PhaseSystem = Field(default=PhaseSystem.SINGLE_PHASE)
    v_a_amp: float = Field(default=230.0, ge=0)
    v_a_phase_deg: float = Field(default=0.0)
    v_b_amp: float = Field(default=230.0, ge=0)
    v_b_phase_deg: float = Field(default=-120.0)
    v_c_amp: float = Field(default=230.0, ge=0)
    v_c_phase_deg: float = Field(default=120.0)
    i_a_amp: float = Field(default=10.0, ge=0)
    i_a_phase_deg: float = Field(default=-25.0)

class PowerMetrics(BaseModel):
    v_rms: float
    i_rms: float
    active_power_w: float
    reactive_power_var: float
    apparent_power_va: float
    power_factor: float
    thd_v_percent: float
    thd_i_percent: float
    fundamental_freq_hz: float

class SymmetricalComponents(BaseModel):
    v0_zero_seq_v: float
    v1_pos_seq_v: float
    v2_neg_seq_v: float
    vuf_percent: float  # Voltage Unbalance Factor (V2/V1 * 100)

class HarmonicComponent(BaseModel):
    order: int
    frequency_hz: float
    v_magnitude_percent: float
    i_magnitude_percent: float
    ieee_519_limit_percent: float
    status: str

class ElectricalAnalysisResponse(BaseModel):
    time: List[float]
    voltage_waveform: List[float]
    current_waveform: List[float]
    power_metrics: PowerMetrics
    symmetrical_components: Optional[SymmetricalComponents] = Field(default=None)
    harmonics_50: List[HarmonicComponent]
    detected_events: List[Dict[str, Any]]
    trust_mode: str = Field(default='API_VERIFIED')
