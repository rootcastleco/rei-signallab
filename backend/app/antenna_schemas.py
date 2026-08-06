from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class AntennaType(str, Enum):
    HALF_WAVE_DIPOLE = "half_wave_dipole"
    QUARTER_WAVE_MONOPOLE = "quarter_wave_monopole"
    MICROSTRIP_PATCH = "microstrip_patch"
    PARABOLIC_DISH = "parabolic_dish"

class WaveguideMode(str, Enum):
    TE10 = "TE10"
    TE20 = "TE20"
    TE01 = "TE01"
    TM11 = "TM11"

class AntennaAnalysisRequest(BaseModel):
    frequency_hz: float = Field(default=2.4e9, gt=0)  # 2.4 GHz
    characteristic_impedance_z0: float = Field(default=50.0, gt=0)
    load_impedance_r: float = Field(default=75.0, ge=0)
    load_impedance_x: float = Field(default=25.0)
    tx_power_dbm: float = Field(default=20.0)  # 100 mW
    tx_gain_dbi: float = Field(default=2.15)
    rx_gain_dbi: float = Field(default=2.15)
    distance_m: float = Field(default=100.0, gt=0)
    relative_permittivity_er: float = Field(default=4.4)  # FR4
    waveguide_width_a_mm: float = Field(default=22.86)  # WR-90
    waveguide_height_b_mm: float = Field(default=10.16)

class SmithChartPoint(BaseModel):
    normalized_r: float
    normalized_x: float
    gamma_real: float
    gamma_imag: float
    swr: float

class LinkBudgetResult(BaseModel):
    frequency_hz: float
    wavelength_m: float
    fspl_db: float  # Free Space Path Loss
    rx_power_dbm: float
    rx_power_milliwatts: float
    link_margin_db: float

class AntennaResonanceResult(BaseModel):
    antenna_type: AntennaType
    resonant_freq_hz: float
    wavelength_m: float
    physical_length_mm: float
    physical_width_mm: Optional[float] = None
    effective_permittivity: float
    directivity_dbi: float

class AntennaAnalysisResponse(BaseModel):
    frequency_hz: float
    vswr: float
    return_loss_s11_db: float
    reflection_coefficient_gamma: float
    gamma_phase_deg: float
    input_impedance_z_in: Dict[str, float]
    smith_chart_point: SmithChartPoint
    link_budget: LinkBudgetResult
    antenna_resonance: AntennaResonanceResult
    sweep_frequencies_mhz: List[float]
    sweep_s11_db: List[float]
    sweep_vswr: List[float]
    waveguide_cutoff_hz: Dict[str, float]
    trust_mode: str = Field(default='API_VERIFIED')
