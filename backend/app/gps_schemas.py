from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class IQFormat(str, Enum):
    INT8 = "int8"        # HackRF One, LimeSDR (8-bit signed)
    INT16 = "int16"      # USRP, BladeRF (16-bit signed)
    UINT8 = "uint8"      # RTL-SDR (8-bit unsigned)

class DynamicMotionType(str, Enum):
    STATIC = "static"
    CIRCULAR = "circular"
    LINEAR_WAYPOINT = "linear_waypoint"

class GpsSimulationRequest(BaseModel):
    latitude_deg: float = Field(37.7749, ge=-90.0, le=90.0)
    longitude_deg: float = Field(-122.4194, ge=-180.0, le=180.0)
    altitude_m: float = Field(10.0, ge=-1000.0, le=100000.0)
    elevation_mask_deg: float = Field(5.0, ge=0.0, le=90.0)
    sample_rate_hz: int = Field(2600000, ge=1000000, le=20000000)
    duration_s: float = Field(0.1, ge=0.01, le=5.0)
    iq_format: IQFormat = IQFormat.INT8
    motion_type: DynamicMotionType = DynamicMotionType.STATIC
    speed_m_s: float = Field(0.0, ge=0.0, le=1000.0)

class SatelliteInfo(BaseModel):
    prn: int
    elevation_deg: float
    azimuth_deg: float
    doppler_hz: float
    snr_db_hz: float
    pseudorange_m: float
    visible: bool
    ecef_x_m: float
    ecef_y_m: float
    ecef_z_m: float

class GpsSimulationResponse(BaseModel):
    timestamp_utc: str
    user_ecef_x: float
    user_ecef_y: float
    user_ecef_z: float
    total_satellites: int
    visible_satellites_count: int
    gdop: float
    pdop: float
    hdop: float
    vdop: float
    satellites: List[SatelliteInfo]
    fft_frequencies: List[float]
    fft_magnitude_db: List[float]
    sample_rate_hz: int
    iq_data_preview_i: List[float]
    iq_data_preview_q: List[float]
    nmea_sentence: str
    trust_mode: str = "API_VERIFIED"
