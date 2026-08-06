from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ElectronBeamConfig(BaseModel):
    energy_gev: float = Field(default=3.0, gt=0.1, le=15.0)
    current_amp: float = Field(default=0.5, gt=0.001, le=5.0)
    emittance_x_nm: float = Field(default=1.0, ge=0.01)
    emittance_y_nm: float = Field(default=0.01, ge=0.001)
    energy_spread: float = Field(default=0.001, ge=0.0)


class UndulatorConfig(BaseModel):
    period_mm: float = Field(default=20.0, gt=1.0, le=200.0)
    num_periods: int = Field(default=100, ge=5, le=500)
    peak_field_tesla: float = Field(default=0.8, gt=0.01, le=5.0)


class SrwSimulationRequest(BaseModel):
    electron_beam: ElectronBeamConfig = Field(default_factory=ElectronBeamConfig)
    undulator: UndulatorConfig = Field(default_factory=UndulatorConfig)
    observation_dist_m: float = Field(default=10.0, gt=0.1, le=500.0)
    max_harmonic: int = Field(default=5, ge=1, le=9)


class SrwSimulationResponse(BaseModel):
    gamma: float
    deflection_k: float
    fundamental_energy_ev: float
    harmonics_ev: Dict[int, float]
    total_radiated_power_kw: float
    peak_spectral_flux: float
    energy_axis_ev: List[float]
    flux_spectrum: List[float]
    transverse_x_mm: List[float]
    transverse_y_mm: List[float]
    intensity_2d_matrix: List[List[float]]
    angular_x_mrad: List[float]
    angular_power_density: List[float]
    trust_mode: str = Field(default="API_VERIFIED")
