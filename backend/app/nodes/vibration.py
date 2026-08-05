import numpy as np
from typing import Dict, Any
from .base import BaseNodeRuntime
from ..graph.types import Frame, FrameMetadata, CanonicalPortType
from ..vibration_engine import VibrationEngine

class SensorCalibrationNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("raw_input")
        if not sig_frame or sig_frame.data is None:
            return {}

        v_raw = np.asarray(sig_frame.data, dtype=np.float64)
        sens = float(self.params.get("sensitivity", 100.0))
        bias = float(self.params.get("bias", 0.0))
        unit = self.params.get("target_unit", "g")

        cal_sig = VibrationEngine.calibrate_sensor(v_raw, sensitivity_mv_per_g=sens, bias_voltage=bias, target_unit=unit)
        meta = sig_frame.metadata.model_copy(update={"units": unit})

        return {"calibrated_signal": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=meta, data=cal_sig)}

class AccelerationToVelocityNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("acceleration_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        acc = np.asarray(sig_frame.data, dtype=np.float64)
        fs = sig_frame.metadata.sample_rate_hz
        cutoff = float(self.params.get("high_pass_cutoff_hz", 10.0))

        if sig_frame.metadata.units == "g":
            acc_m_s2 = acc * VibrationEngine.GRAVITY_M_S2
        else:
            acc_m_s2 = acc

        vel_mm_s = VibrationEngine.integrate_acceleration_to_velocity(acc_m_s2, fs, cutoff_hz=cutoff)
        meta = sig_frame.metadata.model_copy(update={"units": "mm/s"})

        return {"velocity_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=meta, data=vel_mm_s)}

class VelocityToDisplacementNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("velocity_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        vel_mm_s = np.asarray(sig_frame.data, dtype=np.float64)
        fs = sig_frame.metadata.sample_rate_hz
        cutoff = float(self.params.get("high_pass_cutoff_hz", 10.0))

        disp_um = VibrationEngine.integrate_velocity_to_displacement(vel_mm_s, fs, cutoff_hz=cutoff)
        meta = sig_frame.metadata.model_copy(update={"units": "μm"})

        return {"displacement_out": Frame(data_type=CanonicalPortType.SIGNAL_REAL64, metadata=meta, data=disp_um)}

class OverallRMSNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        rms_val = float(np.sqrt(np.mean(sig ** 2))) if len(sig) > 0 else 0.0

        return {"rms": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=sig_frame.metadata, data=round(rms_val, 4))}

class PeakNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        pk_val = float(np.max(np.abs(sig))) if len(sig) > 0 else 0.0

        return {"peak": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=sig_frame.metadata, data=round(pk_val, 4))}

class CrestFactorNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        pk = float(np.max(np.abs(sig))) if len(sig) > 0 else 0.0
        rms = float(np.sqrt(np.mean(sig ** 2))) if len(sig) > 0 else 1e-6
        cf = pk / (rms if rms > 0 else 1e-6)

        return {"crest_factor": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=sig_frame.metadata, data=round(cf, 3))}

class KurtosisNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        std_val = float(np.std(sig))
        if std_val > 0:
            kurt = float(np.mean(((sig - np.mean(sig)) / std_val) ** 4))
        else:
            kurt = 3.0

        return {"kurtosis": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=sig_frame.metadata, data=round(kurt, 3))}

class BearingFrequenciesNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        rpm = float(self.params.get("rpm", 1480.0))
        n_elem = int(self.params.get("num_elements", 8))
        d_ball = float(self.params.get("ball_diameter_mm", 7.9))
        d_pitch = float(self.params.get("pitch_diameter_mm", 38.5))
        phi = float(self.params.get("contact_angle_deg", 0.0))

        freqs = VibrationEngine.compute_bearing_frequencies(rpm, n_elem, d_ball, d_pitch, phi)
        meta = FrameMetadata()

        return {
            "bearing_freqs": Frame(data_type=CanonicalPortType.STRUCTURED_FRAME, metadata=meta, data=freqs.model_dump()),
            "bpfo_hz": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=freqs.bpfo_hz),
            "bpfi_hz": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=freqs.bpfi_hz),
            "bsf_hz": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=freqs.bsf_hz),
            "ftf_hz": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=freqs.ftf_hz)
        }

class EnvelopeAnalysisNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        sig_frame = inputs.get("signal_in")
        if not sig_frame or sig_frame.data is None:
            return {}

        sig = np.asarray(sig_frame.data, dtype=np.float64)
        fs = sig_frame.metadata.sample_rate_hz
        low = float(self.params.get("low_cutoff_hz", 500.0))
        high = float(self.params.get("high_cutoff_hz", 5000.0))

        freqs, env_fft = VibrationEngine.compute_envelope_spectrum(sig, fs, low_cutoff_hz=low, high_cutoff_hz=high)

        return {
            "envelope_spectrum": Frame(data_type=CanonicalPortType.SPECTRUM_FRAME, metadata=sig_frame.metadata, data={"frequencies": freqs, "magnitude": env_fft})
        }

class SinglePlaneBalancingNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        v0_a = float(self.params.get("initial_vibration_amp", 4.8))
        v0_p = float(self.params.get("initial_vibration_phase_deg", 72.0))
        t_m = float(self.params.get("trial_weight_mass", 10.0))
        t_a = float(self.params.get("trial_weight_angle_deg", 0.0))
        v1_a = float(self.params.get("trial_vibration_amp", 7.2))
        v1_p = float(self.params.get("trial_vibration_phase_deg", 128.0))

        res = VibrationEngine.compute_single_plane_balance(v0_a, v0_p, t_m, t_a, v1_a, v1_p)
        meta = FrameMetadata()

        return {
            "balance_result": Frame(data_type=CanonicalPortType.STRUCTURED_FRAME, metadata=meta, data=res.model_dump()),
            "correction_mass": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=res.correction_mass),
            "correction_angle": Frame(data_type=CanonicalPortType.SCALAR_REAL64, metadata=meta, data=res.correction_angle_deg)
        }

class FaultClassifierNode(BaseNodeRuntime):
    def process(self, inputs: Dict[str, Frame]) -> Dict[str, Frame]:
        rms = float(self.params.get("rms_vel_mm_s", 3.5))
        pk = float(self.params.get("peak_acc_g", 1.2))
        cf = float(self.params.get("crest_factor", 3.2))
        kurt = float(self.params.get("kurtosis", 3.1))
        f1 = float(self.params.get("f1_amp_mm_s", 2.8))
        f2 = float(self.params.get("f2_amp_mm_s", 0.6))
        bpfo = float(self.params.get("bpfo_amp", 0.05))
        rpm = float(self.params.get("rpm", 1480.0))

        diags = VibrationEngine.classify_faults(rms, pk, cf, kurt, f1, f2, bpfo, rpm)
        meta = FrameMetadata()
        diag_list = [d.model_dump() for d in diags]

        return {"diagnostics": Frame(data_type=CanonicalPortType.STRUCTURED_FRAME, metadata=meta, data=diag_list)}
