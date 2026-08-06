import numpy as np
from typing import Dict, Any
from .base import BaseNodeRuntime
from ..graph.types import Frame, FrameMetadata, CanonicalPortType
from ..electrical_engine import ElectricalEngine

class ElectricalPowerMetricsNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        v_frame = inputs.get("voltage_in")
        i_frame = inputs.get("current_in")

        if not v_frame or v_frame.data is None or not i_frame or i_frame.data is None:
            # Fallback to parameter or synthetic signal if not connected
            fs = 10000.0
            t = np.linspace(0, 0.1, 1000, endpoint=False)
            v_sig = 230.0 * np.sqrt(2) * np.sin(2 * np.pi * 50.0 * t)
            i_sig = 10.0 * np.sqrt(2) * np.sin(2 * np.pi * 50.0 * t - 0.5)
        else:
            v_sig = np.asarray(v_frame.data, dtype=np.float64)
            i_sig = np.asarray(i_frame.data, dtype=np.float64)
            fs = v_frame.metadata.sample_rate_hz or 10000.0

        metrics = ElectricalEngine.compute_power_metrics(v_sig, i_sig, fs)
        meta = FrameMetadata(sample_rate_hz=fs)

        return {
            "power_metrics": Frame(data_type=CanonicalPortType.STRUCTURED_FRAME, metadata=meta, data=metrics.model_dump()),
            "v_rms": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=metrics.v_rms),
            "i_rms": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=metrics.i_rms),
            "active_power_w": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=metrics.active_power_w),
            "reactive_power_var": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=metrics.reactive_power_var),
            "apparent_power_va": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=metrics.apparent_power_va),
            "power_factor": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=metrics.power_factor),
            "thd_v_percent": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=metrics.thd_v_percent),
            "thd_i_percent": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=metrics.thd_i_percent)
        }

class ElectricalSymmetricalComponentsNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        va_frame = inputs.get("va_in")
        vb_frame = inputs.get("vb_in")
        vc_frame = inputs.get("vc_in")

        if not va_frame or not vb_frame or not vc_frame:
            t = np.linspace(0, 0.04, 400, endpoint=False)
            va = 230.0 * np.sqrt(2) * np.sin(2 * np.pi * 50.0 * t)
            vb = 230.0 * np.sqrt(2) * np.sin(2 * np.pi * 50.0 * t - 2 * np.pi / 3)
            vc = 230.0 * np.sqrt(2) * np.sin(2 * np.pi * 50.0 * t + 2 * np.pi / 3)
        else:
            va = np.asarray(va_frame.data, dtype=np.float64)
            vb = np.asarray(vb_frame.data, dtype=np.float64)
            vc = np.asarray(vc_frame.data, dtype=np.float64)

        sym = ElectricalEngine.compute_symmetrical_components(va, vb, vc)
        meta = FrameMetadata(sample_rate_hz=5000.0)

        return {
            "symmetrical_components": Frame(data_type=CanonicalPortType.STRUCTURED_FRAME, metadata=meta, data=sym.model_dump()),
            "v0_magnitude": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=sym.v0_magnitude),
            "v1_magnitude": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=sym.v1_magnitude),
            "v2_magnitude": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=sym.v2_magnitude),
            "unbalance_factor_percent": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=sym.unbalance_factor_percent)
        }
