from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class SensitivityUnit(str, Enum):
    MV_PER_G = "mV/g"
    V_PER_G = "V/g"
    MV_PER_MS2 = "mV/(m/s²)"

class AccelerationUnit(str, Enum):
    G = "g"
    M_S2 = "m/s²"

class AmplitudeUnit(str, Enum):
    MM_S = "mm/s"
    IN_S = "in/s"
    G = "g"

class RPMSource(str, Enum):
    MANUAL = "manual"
    TACHOMETER = "tachometer"

class RotationDirection(str, Enum):
    CW = "cw"
    CCW = "ccw"

class MeasurementAxis(str, Enum):
    HORIZONTAL = "horizontal"
    VERTICAL = "vertical"
    AXIAL = "axial"

class MeasurementLocation(str, Enum):
    DRIVE_END = "DE"
    NON_DRIVE_END = "NDE"

class SensorCalibrationConfig(BaseModel):
    sensitivity: float = Field(default=100.0, gt=0)
    sensitivity_unit: SensitivityUnit = Field(default=SensitivityUnit.MV_PER_G)
    bias_voltage: float = Field(default=0.0)
    target_unit: AccelerationUnit = Field(default=AccelerationUnit.G)

class MeasurementPointConfig(BaseModel):
    machine_id: str = Field(default='')
    point_id: str = Field(default='')
    location: MeasurementLocation = Field(default=MeasurementLocation.DRIVE_END)
    axis: MeasurementAxis = Field(default=MeasurementAxis.HORIZONTAL)
    mounting_method: str = Field(default='stud')
    operator_note: str = Field(default='')

class RPMConfig(BaseModel):
    rpm_source: RPMSource = Field(default=RPMSource.MANUAL)
    manual_rpm: float = Field(default=1500.0, ge=1, le=200000)
    pulses_per_rev: int = Field(default=1)

class BearingConfig(BaseModel):
    num_elements: int = Field(ge=1)
    ball_diameter_mm: float = Field(gt=0)
    pitch_diameter_mm: float = Field(gt=0)
    contact_angle_deg: float = Field(default=0.0, ge=0, le=90)
    manufacturer: str = Field(default='')
    model: str = Field(default='')

class BalanceInputConfig(BaseModel):
    v0_amp: float = Field(ge=0)
    v0_phase_deg: float
    trial_mass: float = Field(gt=0)
    trial_angle_deg: float
    v1_amp: float = Field(ge=0)
    v1_phase_deg: float
    trial_radius_mm: Optional[float] = Field(default=None)
    correction_radius_mm: Optional[float] = Field(default=None)
    rotation_direction: RotationDirection = Field(default=RotationDirection.CW)
    amplitude_unit: AmplitudeUnit = Field(default=AmplitudeUnit.MM_S)

class VibrationAnalysisRequest(BaseModel):
    signal_data: Optional[List[float]] = Field(default=None)
    sample_rate: int = Field(default=25600, ge=100, le=200000)
    sensor: SensorCalibrationConfig = Field(default_factory=SensorCalibrationConfig)
    measurement_point: MeasurementPointConfig = Field(default_factory=MeasurementPointConfig)
    rpm: RPMConfig = Field(default_factory=RPMConfig)
    bearing: Optional[BearingConfig] = Field(default=None)
    machine_name: str = Field(default='')
    machine_type: str = Field(default='')

class HarmonicOrder(BaseModel):
    order: int
    frequency_hz: float
    amplitude: float
    amplitude_db: float

class VibrationTimeMetrics(BaseModel):
    rms_acc_g: float
    peak_acc_g: float
    rms_vel_mm_s: float
    peak_vel_mm_s: float
    crest_factor: float
    kurtosis: float

class VibrationAnalysisResponse(BaseModel):
    calibrated_signal: List[float]
    velocity_signal: List[float]
    time: List[float]
    time_metrics: VibrationTimeMetrics
    fft_frequencies: List[float]
    fft_magnitude: List[float]
    fft_magnitude_db: List[float]
    envelope_frequencies: Optional[List[float]]
    envelope_magnitude: Optional[List[float]]
    bearing_frequencies: Optional[Dict[str, float]]
    harmonic_orders: List[HarmonicOrder]
    diagnostics: List[Dict[str, Any]]
    balance_result: Optional[Dict[str, Any]]
    trust_mode: str = Field(default='API_VERIFIED')
