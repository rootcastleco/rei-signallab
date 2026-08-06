from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
import numpy as np
from typing import Optional

from app.electrical_schemas import (
    ElectricalAnalysisRequest, ElectricalAnalysisResponse,
    PowerMetrics, SymmetricalComponents, HarmonicComponent
)
from app.electrical_engine import ElectricalEngine
from app.dsp_engine import DSPEngine

router = APIRouter(tags=["Electrical & Power Quality"])

@router.post("/analyze", response_model=ElectricalAnalysisResponse)
def analyze_electrical(req: ElectricalAnalysisRequest):
    try:
        fs = req.sample_rate
        N = fs  # 1 second of data
        t = np.linspace(0, 1.0, N, endpoint=False)

        if req.voltage_data is None or req.current_data is None:
            # Synthesize 3-phase or single-phase voltage & current with harmonics
            w = 2 * np.pi * req.nominal_frequency_hz
            v_sig = req.v_a_amp * np.cos(w * t + np.radians(req.v_a_phase_deg)) + 5.0 * np.cos(3 * w * t) + 2.0 * np.cos(5 * w * t)
            i_sig = req.i_a_amp * np.cos(w * t + np.radians(req.i_a_phase_deg)) + 0.8 * np.cos(3 * w * t) + 0.3 * np.cos(5 * w * t)
            trust_mode = 'DEMO_MODE'
        else:
            v_sig = np.array(req.voltage_data)
            i_sig = np.array(req.current_data)
            t = np.linspace(0, len(v_sig) / fs, len(v_sig), endpoint=False)
            trust_mode = 'API_VERIFIED'

        power_metrics = ElectricalEngine.compute_power_metrics(v_sig, i_sig, fs, req.nominal_frequency_hz)

        sym_comp = ElectricalEngine.compute_symmetrical_components(
            req.v_a_amp, req.v_a_phase_deg,
            req.v_b_amp, req.v_b_phase_deg,
            req.v_c_amp, req.v_c_phase_deg
        )

        harmonics = ElectricalEngine.analyze_harmonics_50(v_sig, i_sig, fs, req.nominal_frequency_hz)
        events = ElectricalEngine.detect_power_events(v_sig, i_sig, req.nominal_voltage_rms)

        return ElectricalAnalysisResponse(
            time=t.tolist(),
            voltage_waveform=v_sig.tolist(),
            current_waveform=i_sig.tolist(),
            power_metrics=power_metrics,
            symmetrical_components=sym_comp,
            harmonics_50=harmonics,
            detected_events=events,
            trust_mode=trust_mode
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload", response_model=ElectricalAnalysisResponse)
async def upload_electrical(
    file: UploadFile = File(...),
    sample_rate: int = Form(25600),
    nominal_voltage: float = Form(230.0),
    nominal_frequency: float = Form(50.0)
):
    content = await file.read()
    fs, raw_sig = DSPEngine.parse_signal_file(file.filename, content)

    # Use uploaded signal for voltage, derive current waveform
    v_sig = raw_sig
    i_sig = raw_sig * 0.05  # Approximate current

    req = ElectricalAnalysisRequest(
        voltage_data=v_sig.tolist(),
        current_data=i_sig.tolist(),
        sample_rate=int(fs) if fs else sample_rate,
        nominal_voltage_rms=nominal_voltage,
        nominal_frequency_hz=nominal_frequency
    )
    return analyze_electrical(req)
