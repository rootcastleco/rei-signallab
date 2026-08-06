from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
import numpy as np
import io
import wave
import logging
from typing import Dict, Any, Optional, List

from app.schemas import (
    SignalProcessingRequest,
    LispProcessingRequest,
    PythonScriptRequest,
    PlotRenderRequest,
    SignalProcessingResponse
)
from app.dsp_engine import DSPEngine
from app.lisp_engine import LispDSPEngine
from app.python_engine import PythonSandboxEngine
from app.graph.registry import NodeRegistry, NodeSpec
from app.graph.validator import GraphValidator
from app.graph.engine import GraphExecutionEngine
from app.graph.migration import ProjectMigrationManager
from app.vibration_routes import router as vibration_router
from app.electrical_routes import router as electrical_router
from app.antenna_routes import router as antenna_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("signallab")

app = FastAPI(
    title="REI SignalLab 2.1 Engine API",
    description="Instrument-Grade Typed Signal Processing, Node Graph Engine & Sandbox Suite",
    version="2.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "app": "REI SignalLab 2.1 DSP Engine",
        "version": "2.1.0",
        "status": "online",
        "engine": "SciPy/FastAPI",
        "registered_nodes_count": len(NodeRegistry.list_all())
    }

# 1. Node Catalog Registry Endpoints
@app.get("/api/nodes")
def list_nodes():
    return [spec.model_dump() for spec in NodeRegistry.list_all()]

@app.get("/api/nodes/{node_type}")
def get_node_spec(node_type: str):
    spec = NodeRegistry.get(node_type)
    if not spec:
        raise HTTPException(status_code=404, detail=f"Node type '{node_type}' not found in registry.")
    return spec.model_dump()

# 2. Graph Validation & Execution Endpoints
@app.post("/api/graph/validate")
def validate_graph(request_data: Dict[str, Any]):
    project = request_data.get("project", request_data)
    migrated_project = ProjectMigrationManager.migrate_to_2_1(project)
    val_result = GraphValidator.validate_graph(migrated_project)
    if not val_result.valid:
        return JSONResponse(status_code=422, content=val_result.model_dump())
    return val_result.model_dump()

@app.post("/api/graph/execute")
def execute_graph(request_data: Dict[str, Any]):
    project = request_data.get("project", request_data)
    migrated_project = ProjectMigrationManager.migrate_to_2_1(project)

    engine = GraphExecutionEngine()
    exec_result = engine.execute_project(migrated_project)

    if exec_result.get("status") == "error":
        return JSONResponse(status_code=422, content=exec_result)

    return exec_result

# 3. Time-Domain / Spectral DSP Endpoint
@app.post("/api/process", response_model=SignalProcessingResponse)
def process_signal(req: SignalProcessingRequest):
    try:
        t, raw_sig = DSPEngine.generate_signal(req.generator)

        if req.math.dc_remove:
            raw_sig = raw_sig - np.mean(raw_sig)

        if req.math.gain_db != 0:
            gain_lin = 10.0 ** (req.math.gain_db / 20.0)
            raw_sig = raw_sig * gain_lin

        if req.math.bit_depth and req.math.bit_depth in [8, 12, 16]:
            q_max = 2.0 ** (req.math.bit_depth - 1) - 1
            raw_sig = np.round(raw_sig * q_max) / q_max

        envelope_sig = None
        if req.math.envelope_extraction:
            envelope_sig = DSPEngine.extract_envelope(raw_sig)

        filtered_sig = DSPEngine.apply_filter(raw_sig, req.generator.sample_rate, req.filter)
        freqs, mag_db, phase = DSPEngine.compute_fft(filtered_sig, req.generator.sample_rate, req.fft)

        fft_linear_cfg = req.fft.model_copy(update={"log_scale": False})
        _, mag_linear, _ = DSPEngine.compute_fft(filtered_sig, req.generator.sample_rate, fft_linear_cfg)

        metrics = DSPEngine.compute_metrics(filtered_sig, freqs, mag_linear, req.generator.sample_rate)
        freqs_spec, times_spec, matrix_spec = DSPEngine.compute_spectrogram(filtered_sig, req.generator.sample_rate)

        return SignalProcessingResponse(
            time=t.tolist(),
            raw_signal=raw_sig.tolist(),
            filtered_signal=filtered_sig.tolist(),
            envelope_signal=envelope_sig.tolist() if envelope_sig is not None else None,
            frequency=freqs.tolist(),
            spectrum_magnitude=mag_db.tolist(),
            metrics=metrics,
            spectrogram_matrix=matrix_spec.tolist(),
            spectrogram_times=times_spec.tolist(),
            spectrogram_frequencies=freqs_spec.tolist()
        )
    except Exception as e:
        logger.error(f"Error processing signal: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"DSP Engine Processing Failure: {str(e)}")

# 4. Signal File Upload
@app.post("/api/upload/signal")
async def upload_signal(
    file: UploadFile = File(...),
    filter_enabled: bool = Form(False),
    filter_cutoff: float = Form(1000.0),
    filter_type: str = Form("lowpass"),
    envelope_extraction: bool = Form(False)
):
    try:
        content = await file.read()
        fs, raw_sig = DSPEngine.parse_signal_file(file.filename, content)

        t = np.linspace(0, len(raw_sig) / fs, len(raw_sig), endpoint=False)

        flt_cfg = type("FltCfg", (), {"enabled": filter_enabled, "cutoff": filter_cutoff, "filter_type": filter_type, "filter_design": "butterworth", "order": 4})()
        filtered_sig = DSPEngine.apply_filter(raw_sig, fs, flt_cfg)

        envelope_sig = DSPEngine.extract_envelope(filtered_sig) if envelope_extraction else None

        fft_cfg = type("FFTCfg", (), {"n_fft": 1024, "window": "hanning", "log_scale": True})()
        freqs, mag_db, phase = DSPEngine.compute_fft(filtered_sig, fs, fft_cfg)

        fft_linear_cfg = type("FFTCfg", (), {"n_fft": 1024, "window": "hanning", "log_scale": False})()
        _, mag_linear, _ = DSPEngine.compute_fft(filtered_sig, fs, fft_linear_cfg)

        metrics = DSPEngine.compute_metrics(filtered_sig, freqs, mag_linear, fs)
        freqs_spec, times_spec, matrix_spec = DSPEngine.compute_spectrogram(filtered_sig, fs)

        return {
            "time": t.tolist(),
            "raw_signal": raw_sig.tolist(),
            "filtered_signal": filtered_sig.tolist(),
            "envelope_signal": envelope_sig.tolist() if envelope_sig is not None else None,
            "frequency": freqs.tolist(),
            "spectrum_magnitude": mag_db.tolist(),
            "metrics": metrics.model_dump(),
            "spectrogram_matrix": matrix_spec.tolist(),
            "spectrogram_times": times_spec.tolist(),
            "spectrogram_frequencies": freqs_spec.tolist()
        }
    except Exception as e:
        logger.error(f"Error parsing uploaded file: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Signal File Parse Error: {str(e)}")

# 5. Python Sandbox Script Execution
@app.post("/api/python/execute")
def execute_python_script(req: PythonScriptRequest):
    res = PythonSandboxEngine.execute_script(req.python_code)
    if res.get("status") == "error":
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res

# 6. S-Expression DSL Execution
@app.post("/api/lisp/process")
def process_lisp_expression(req: LispProcessingRequest):
    try:
        t, raw_sig = DSPEngine.generate_signal(req.generator)
        lisp_sig, lisp_logs = LispDSPEngine.execute_lisp_dsp(req.lisp_code, raw_sig)

        freqs, mag_db, phase = DSPEngine.compute_fft(lisp_sig, req.generator.sample_rate, req.fft)

        fft_linear_cfg = req.fft.model_copy(update={"log_scale": False})
        _, mag_linear, _ = DSPEngine.compute_fft(lisp_sig, req.generator.sample_rate, fft_linear_cfg)
        metrics = DSPEngine.compute_metrics(lisp_sig, freqs, mag_linear, req.generator.sample_rate)

        freqs_spec, times_spec, matrix_spec = DSPEngine.compute_spectrogram(lisp_sig, req.generator.sample_rate)

        return {
            "time": t.tolist(),
            "raw_signal": raw_sig.tolist(),
            "filtered_signal": lisp_sig.tolist(),
            "frequency": freqs.tolist(),
            "spectrum_magnitude": mag_db.tolist(),
            "metrics": metrics,
            "spectrogram_matrix": matrix_spec.tolist(),
            "spectrogram_times": times_spec.tolist(),
            "spectrogram_frequencies": freqs_spec.tolist(),
            "lisp_logs": lisp_logs
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"S-Expression DSL Execution Error: {str(e)}")

# 7. Downloadable WAV Stream
@app.post("/api/export/wav")
def export_wav(req: SignalProcessingRequest):
    try:
        _, raw_sig = DSPEngine.generate_signal(req.generator)
        filtered_sig = DSPEngine.apply_filter(raw_sig, req.generator.sample_rate, req.filter)

        sig_norm = np.clip(filtered_sig, -1.0, 1.0)
        pcm_16 = (sig_norm * 32767).astype(np.int16)

        wav_io = io.BytesIO()
        with wave.open(wav_io, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(req.generator.sample_rate)
            wav_file.writeframes(pcm_16.tobytes())

        wav_io.seek(0)
        return Response(content=wav_io.read(), media_type="audio/wav", headers={"Content-Disposition": "attachment; filename=signallab21.wav"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"WAV Export Failure: {str(e)}")

app.include_router(vibration_router, prefix="/api/vibration")
app.include_router(electrical_router, prefix="/api/electrical")
app.include_router(antenna_router, prefix="/api/antenna")
