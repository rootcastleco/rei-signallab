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

class BalanceMethod(str, Enum):
    SINGLE_PLANE = "single_plane"
    TWO_PLANE = "two_plane"
    FOUR_RUN_NOPHASE = "four_run_nophase"
    STATIC_COUPLE = "static_couple"
    SPLIT_WEIGHT = "split_weight"

class BalanceInputConfig(BaseModel):
    balance_method: BalanceMethod = Field(default=BalanceMethod.SINGLE_PLANE)
    v0_amp: float = Field(default=4.8, ge=0)
    v0_phase_deg: float = Field(default=72.0)
    trial_mass: float = Field(default=10.0, gt=0)
    trial_angle_deg: float = Field(default=0.0)
    v1_amp: float = Field(default=7.2, ge=0)
    v1_phase_deg: float = Field(default=128.0)
    trial_radius_mm: Optional[float] = Field(default=None)
    correction_radius_mm: Optional[float] = Field(default=None)
    rotation_direction: RotationDirection = Field(default=RotationDirection.CW)
    amplitude_unit: AmplitudeUnit = Field(default=AmplitudeUnit.MM_S)

class TwoPlaneBalanceConfig(BaseModel):
    va0_amp: float = Field(ge=0)
    va0_phase_deg: float
    vb0_amp: float = Field(ge=0)
    vb0_phase_deg: float
    w_ta_mass: float = Field(gt=0)
    w_ta_angle_deg: float
    vaa_amp: float = Field(ge=0)
    vaa_phase_deg: float
    vba_amp: float = Field(ge=0)
    vba_phase_deg: float
    w_tb_mass: float = Field(gt=0)
    w_tb_angle_deg: float
    vab_amp: float = Field(ge=0)
    vab_phase_deg: float
    vbb_amp: float = Field(ge=0)
    vbb_phase_deg: float

class FourRunNoPhaseConfig(BaseModel):
    a0: float = Field(gt=0)
    trial_mass: float = Field(gt=0)
    a1: float = Field(ge=0)
    a2: float = Field(ge=0)
    a3: float = Field(ge=0)

class StaticCoupleConfig(BaseModel):
    va0_amp: float = Field(ge=0)
    va0_phase_deg: float
    vb0_amp: float = Field(ge=0)
    vb0_phase_deg: float

class SplitWeightConfig(BaseModel):
    target_mass: float = Field(gt=0)
    target_angle_deg: float
    hole1_angle_deg: float
    hole2_angle_deg: float

class BeltCalculatorConfig(BaseModel):
    driver_pulley_d1_mm: float = Field(gt=0)
    driven_pulley_d2_mm: float = Field(gt=0)
    belt_length_l_mm: float = Field(gt=0)
    driver_rpm: float = Field(gt=0, le=200000)

class ShaftAlignmentConfig(BaseModel):
    coupling_diameter_dr_mm: float = Field(gt=0)
    dist_coupling_to_front_feet_l1_mm: float = Field(gt=0)
    dist_coupling_to_rear_feet_l2_mm: float = Field(gt=0)
    rim_top: float
    rim_bottom: float
    face_top: float
    face_bottom: float

class UnitConversionConfig(BaseModel):
    value: float
    input_unit: str = Field(min_length=1)
    freq_hz: float = Field(gt=0)

class SdofSimulatorConfig(BaseModel):
    mass_kg: float = Field(gt=0)
    stiffness_n_m: float = Field(gt=0)
    damping_c_n_s_m: float = Field(ge=0)
    x0_m: float = Field(default=0.01)
    v0_m_s: float = Field(default=0.0)
    duration_s: float = Field(default=1.0, gt=0, le=60)
    fs: float = Field(default=1000.0, gt=0, le=200000)

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
