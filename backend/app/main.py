import uuid
import logging
import time
import io
import wave
import numpy as np
from typing import Dict, Any, Optional, List

from fastapi import Depends, FastAPI, HTTPException, Request, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse

from app.config import settings
from app.ratelimit import compute_rate_limit, sandbox_rate_limit, enforce as enforce_rate_limit
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

from app.health import router as health_router
from app.vibration_routes import router as vibration_router
from app.electrical_routes import router as electrical_router
from app.antenna_routes import router as antenna_router
from app.gps_routes import router as gps_router
from app.unpingco_routes import router as unpingco_router
from app.srw_routes import router as srw_router
from app.ai_routes import router as ai_router

# Configure Structured Logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger("rei-signallab-api")

app = FastAPI(
    title="REI SignalLab 2.1 Engine API",
    description="Instrument-Grade Typed Signal Processing, Node Graph Engine & Sandbox Suite",
    version=settings.APP_VERSION
)

# 1. Production CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# 2. Request ID & Structured Logging Middleware
@app.middleware("http")
async def request_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    start_time = time.time()

    # Content-Length check for upload limit
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > settings.MAX_UPLOAD_BYTES:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={
                "code": "PAYLOAD_TOO_LARGE",
                "message": f"Request body exceeds maximum allowed size of {settings.MAX_UPLOAD_BYTES} bytes.",
                "details": {"max_bytes": settings.MAX_UPLOAD_BYTES},
                "requestId": request_id
            }
        )

    # Global per-caller budget. Route-level buckets narrow this further for
    # compute and sandbox endpoints.
    try:
        enforce_rate_limit(request, "global", settings.RATE_LIMIT_DEFAULT_PER_WINDOW)
    except HTTPException as exc:
        # Middleware runs outside the exception-handler chain, so the structured
        # error envelope is built here.
        detail = exc.detail if isinstance(exc.detail, dict) else {}
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": detail.get("code", "RATE_LIMIT_EXCEEDED"),
                "message": detail.get("message", "Rate limit exceeded."),
                "details": detail.get("details"),
                "requestId": request_id,
            },
            headers={**(exc.headers or {}), "X-Request-ID": request_id},
        )

    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)

    response.headers["X-Request-ID"] = request_id
    logger.info(f"event=api_request_completed requestId={request_id} method={request.method} path={request.url.path} status={response.status_code} durationMs={duration_ms} commitSha={settings.COMMIT_SHA}")

    return response


# 3. Structured Error Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    detail = exc.detail

    if isinstance(detail, dict):
        code = detail.get("code", f"HTTP_{exc.status_code}")
        message = detail.get("message", detail.get("detail", str(detail)))
        details = detail.get("details", None)
    else:
        code = f"HTTP_{exc.status_code}"
        message = str(detail)
        details = None

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": code,
            "message": message,
            "details": details,
            "requestId": request_id
        },
        # Preserved so protocol headers set by the raiser survive the envelope
        # (e.g. Retry-After on a 429).
        headers=exc.headers or None
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logger.error(f"Unhandled exception requestId={request_id}: {str(exc)}", exc_info=True)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An internal server error occurred.",
            "details": None if settings.APP_ENV == "production" else str(exc),
            "requestId": request_id
        }
    )


# 4. Mount Health & Feature Routers
app.include_router(health_router)
app.include_router(vibration_router, prefix="/api/vibration")
app.include_router(electrical_router, prefix="/api/electrical")
app.include_router(antenna_router, prefix="/api/antenna")
app.include_router(gps_router, prefix="/api/gps")
app.include_router(unpingco_router, prefix="/api/dsp-lab")
app.include_router(srw_router, prefix="/api/srw")
app.include_router(ai_router, prefix="/api/ai")


@app.get("/")
def read_root():
    return {
        "app": "REI SignalLab 2.1 DSP Engine",
        "service": "rei-signallab-api",
        "version": settings.APP_VERSION,
        "status": "online",
        "engine": "SciPy/FastAPI",
        "registered_nodes_count": len(NodeRegistry.list_all())
    }


# 5. Node Catalog Registry Endpoints
@app.get("/api/nodes")
def list_nodes():
    return [spec.model_dump() for spec in NodeRegistry.list_all()]


@app.get("/api/nodes/{node_type}")
def get_node_spec(node_type: str):
    spec = NodeRegistry.get(node_type)
    if not spec:
        raise HTTPException(status_code=404, detail=f"Node type '{node_type}' not found in registry.")
    return spec.model_dump()


# 6. Graph Validation & Execution Endpoints
@app.post("/api/graph/validate")
def validate_graph(request_data: Dict[str, Any]):
    project = request_data.get("project", request_data)
    migrated_project = ProjectMigrationManager.migrate_to_2_1(project)
    val_result = GraphValidator.validate_graph(migrated_project)
    if not val_result.valid:
        return JSONResponse(status_code=422, content=val_result.model_dump())
    return val_result.model_dump()


@app.post("/api/graph/execute", dependencies=[Depends(compute_rate_limit)])
def execute_graph(request_data: Dict[str, Any]):
    project = request_data.get("project", request_data)
    migrated_project = ProjectMigrationManager.migrate_to_2_1(project)

    engine = GraphExecutionEngine()
    exec_result = engine.execute_project(migrated_project)

    if exec_result.get("status") == "error":
        return JSONResponse(status_code=422, content=exec_result)

    return exec_result


# 7. Time-Domain / Spectral DSP Endpoint
@app.post("/api/process", response_model=SignalProcessingResponse, dependencies=[Depends(compute_rate_limit)])
def process_signal(req: SignalProcessingRequest):
    try:
        t, raw_sig = DSPEngine.generate_signal(req.generator)

        if len(raw_sig) > settings.MAX_SIGNAL_SAMPLES:
            raise HTTPException(
                status_code=400,
                detail=f"Signal length {len(raw_sig)} exceeds maximum sample limit of {settings.MAX_SIGNAL_SAMPLES}."
            )

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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing signal: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"DSP Engine Processing Failure: {str(e)}")


# 8. Signal File Upload Endpoint
@app.post("/api/upload/signal", dependencies=[Depends(compute_rate_limit)])
async def upload_signal(
    file: UploadFile = File(...),
    filter_enabled: bool = Form(False),
    filter_cutoff: float = Form(1000.0),
    filter_type: str = Form("lowpass"),
    envelope_extraction: bool = Form(False)
):
    try:
        content = await file.read()
        if len(content) > settings.MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Uploaded file size ({len(content)} bytes) exceeds limit of {settings.MAX_UPLOAD_BYTES} bytes."
            )

        fs, raw_sig = DSPEngine.parse_signal_file(file.filename, content)

        if len(raw_sig) > settings.MAX_SIGNAL_SAMPLES:
            raise HTTPException(
                status_code=400,
                detail=f"Decoded signal samples ({len(raw_sig)}) exceeds limit of {settings.MAX_SIGNAL_SAMPLES}."
            )

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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing uploaded file: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Signal File Parse Error: {str(e)}")


# 9. Python Sandbox Script Execution
@app.post("/api/python/execute", dependencies=[Depends(sandbox_rate_limit)])
def execute_python_script(req: PythonScriptRequest):
    if not settings.ENABLE_PYTHON_SANDBOX:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "SANDBOX_DISABLED",
                "message": (
                    "The Python DSP Sandbox is disabled on this deployment. "
                    "It executes user-supplied code and is opt-in via ENABLE_PYTHON_SANDBOX."
                ),
            },
        )

    res = PythonSandboxEngine.execute_script(req.python_code)
    if res.get("status") == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "SANDBOX_EXECUTION_FAILED",
                "message": (res.get("logs") or ["Script execution failed."])[0],
                "details": {"logs": res.get("logs", [])},
            },
        )
    return res


# 10. S-Expression DSL Execution
@app.post("/api/lisp/process", dependencies=[Depends(compute_rate_limit)])
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"S-Expression DSL Execution Error: {str(e)}")


# 11. Downloadable WAV Stream
@app.post("/api/export/wav", dependencies=[Depends(compute_rate_limit)])
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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"WAV Export Failure: {str(e)}")
