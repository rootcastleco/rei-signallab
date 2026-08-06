import numpy as np
from typing import Dict, Any
from .base import BaseNodeRuntime
from ..graph.types import Frame, FrameMetadata, CanonicalPortType
from ..gps_engine import GpsEngine

class GpsGoldCodeNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        prn = int(self.params.get("prn", 1))
        gold_code = GpsEngine.generate_gold_code(prn)
        meta = FrameMetadata(sample_rate_hz=1.023e6, units="chips")

        return {
            "gold_code_signal": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=meta, data=gold_code.astype(np.float64))
        }

class GpsGeodeticToEcefNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        lat = float(self.params.get("latitude_deg", 41.0082))
        lon = float(self.params.get("longitude_deg", 28.9784))
        alt = float(self.params.get("altitude_m", 50.0))

        x, y, z = GpsEngine.geodetic_to_ecef(lat, lon, alt)
        meta = FrameMetadata(sample_rate_hz=1.0, units="m")

        return {
            "ecef_coords": Frame(data_type=CanonicalPortType.STRUCTURED_FRAME, metadata=meta, data={"x": x, "y": y, "z": z}),
            "ecef_x_m": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=x),
            "ecef_y_m": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=y),
            "ecef_z_m": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=z)
        }

class GpsConstellationSimNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        lat = float(self.params.get("user_lat", 41.0082))
        lon = float(self.params.get("user_lon", 28.9784))
        alt = float(self.params.get("user_alt", 50.0))
        num_sats = int(self.params.get("num_satellites", 8))

        sim_res = GpsEngine.simulate_constellation(lat, lon, alt, num_satellites=num_sats)
        meta = FrameMetadata(sample_rate_hz=1.0)

        return {
            "constellation_status": Frame(data_type=CanonicalPortType.STRUCTURED_FRAME, metadata=meta, data=sim_res),
            "visible_satellites": Frame(data_type=CanonicalPortType.SCALAR_INT64, metadata=meta, data=sim_res.get("visible_count", num_sats)),
            "pdop": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=sim_res.get("pdop", 1.8)),
            "gdop": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=sim_res.get("gdop", 2.1))
        }
