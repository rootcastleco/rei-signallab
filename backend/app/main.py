from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel, Field
import numpy as np
import io
import wave
import asyncio
import json
import logging

from .schemas import (
    SignalProcessingRequest,
    SignalProcessingResponse,
    FFTConfig,
    SignalGeneratorConfig,
    FilterConfig,
    WaveformType,
    FilterType,
    FilterDesign
)
from .dsp_engine import DSPEngine
from .lisp_engine import LispDSPEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("signallab_api")

app = FastAPI(
    title="REI SignalLab API with Matplotlib & Common Lisp Engine",
    description="High-Performance Digital Signal Processing, Server-Side Matplotlib Plot Rendering, and Common Lisp Plugin Engine",
    version="1.3.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LispProcessingRequest(BaseModel):
    lisp_code: str = Field(default="(biquad-filter-simd signal 0.1 0.2 0.1 -0.5 0.25)")
    generator: SignalGeneratorConfig
    fft: FFTConfig = Field(default_factory=FFTConfig)


@app.get("/")
def get_root():
    return {
        "app": "REI SignalLab DSP Engine",
        "status": "online",
        "version": "1.3.0",
        "features": [
            "Matplotlib Server-Side PNG/SVG API Plot Renderer",
            "Machine-Level Common Lisp DSP Plugin Engine",
            "Signal Generation (Sine, Square, Triangle, Noise, Pink Noise, Chirp, ECG, Multitone, Pulse)",
            "Modulation Engine (AM, FM, PM)",
            "Math & Quantizer (Hilbert Envelope, Bit Depth Simulation)",
            "Digital Filters (Butterworth, Chebyshev, Elliptic, Bessel, Median, FIR)",
            "FFT & Spectrogram Waterfall Analysis",
            "Studio Telemetry (THD, SNR, SINAD, SFDR, ENOB)",
            "Real-time WebSocket Streaming"
        ]
    }


@app.post("/api/process", response_model=SignalProcessingResponse)
def process_signal(req: SignalProcessingRequest):
    try:
        t, raw_sig = DSPEngine.generate_signal(req.generator)
        fs = req.generator.sample_rate
        quantized_sig, envelope_sig = DSPEngine.apply_math_quantizer(raw_sig, req.math)
        filtered_sig = DSPEngine.apply_filter(quantized_sig, fs, req.filter)

        fft_config_linear = req.fft.model_copy(update={"log_scale": False})
        freqs, mag_linear, phase = DSPEngine.compute_fft(filtered_sig, fs, fft_config_linear)
        _, mag_db, _ = DSPEngine.compute_fft(filtered_sig, fs, req.fft)

        metrics = DSPEngine.compute_metrics(filtered_sig, freqs, mag_linear, fs)
        spec_freqs, spec_times, spec_matrix = DSPEngine.compute_spectrogram(filtered_sig, fs)

        return SignalProcessingResponse(
            time=t.tolist(),
            raw_signal=raw_sig.tolist(),
            filtered_signal=filtered_sig.tolist(),
            envelope_signal=envelope_sig.tolist() if envelope_sig is not None else None,
            frequency=freqs.tolist(),
            spectrum_magnitude=mag_db.tolist(),
            spectrum_phase=phase.tolist(),
            metrics=metrics,
            spectrogram_matrix=spec_matrix.tolist(),
            spectrogram_times=spec_times.tolist(),
            spectrogram_frequencies=spec_freqs.tolist()
        )
    except Exception as e:
        logger.error(f"Error in process_signal: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"DSP computation error: {str(e)}")


@app.post("/api/render/plot")
def render_plot_post(req: SignalProcessingRequest, plot_type: str = Query("oscilloscope", enum=["oscilloscope", "spectrum"])):
    """
    POST Endpoint: Renders a high-resolution Matplotlib PNG plot for API clients.
    """
    try:
        t, raw_sig = DSPEngine.generate_signal(req.generator)
        fs = req.generator.sample_rate
        quantized_sig, envelope_sig = DSPEngine.apply_math_quantizer(raw_sig, req.math)
        filtered_sig = DSPEngine.apply_filter(quantized_sig, fs, req.filter)

        if plot_type == "spectrum":
            freqs, mag_linear, _ = DSPEngine.compute_fft(filtered_sig, fs, req.fft.model_copy(update={"log_scale": False}))
            freqs, mag_db, _ = DSPEngine.compute_fft(filtered_sig, fs, req.fft)
            metrics = DSPEngine.compute_metrics(filtered_sig, freqs, mag_linear, fs)
            png_bytes = DSPEngine.render_matplotlib_spectrum(freqs, mag_db, metrics)
        else:
            png_bytes = DSPEngine.render_matplotlib_oscilloscope(t, raw_sig, filtered_sig, envelope_sig)

        return Response(content=png_bytes, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matplotlib plot rendering failed: {str(e)}")


@app.get("/api/render/plot")
def render_plot_get(
    waveform: WaveformType = Query(WaveformType.SINE),
    frequency: float = Query(440.0, ge=0.1, le=20000.0),
    amplitude: float = Query(1.0, ge=0.0, le=100.0),
    filter_enabled: bool = Query(False),
    filter_cutoff: float = Query(1000.0, ge=1.0, le=96000.0),
    plot_type: str = Query("oscilloscope", enum=["oscilloscope", "spectrum"])
):
    """
    GET Endpoint: Quick URL-based Matplotlib PNG plot rendering for embeddable API usage.
    Example: GET /api/render/plot?waveform=sine&frequency=440&amplitude=1.5
    """
    try:
        gen = SignalGeneratorConfig(waveform=waveform, frequency=frequency, amplitude=amplitude)
        flt = FilterConfig(enabled=filter_enabled, cutoff=filter_cutoff)
        fft = FFTConfig()

        t, raw_sig = DSPEngine.generate_signal(gen)
        fs = gen.sample_rate
        filtered_sig = DSPEngine.apply_filter(raw_sig, fs, flt)

        if plot_type == "spectrum":
            freqs, mag_linear, _ = DSPEngine.compute_fft(filtered_sig, fs, fft.model_copy(update={"log_scale": False}))
            freqs, mag_db, _ = DSPEngine.compute_fft(filtered_sig, fs, fft)
            metrics = DSPEngine.compute_metrics(filtered_sig, freqs, mag_linear, fs)
            png_bytes = DSPEngine.render_matplotlib_spectrum(freqs, mag_db, metrics)
        else:
            png_bytes = DSPEngine.render_matplotlib_oscilloscope(t, raw_sig, filtered_sig)

        return Response(content=png_bytes, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matplotlib GET rendering failed: {str(e)}")


@app.post("/api/lisp/process", response_model=SignalProcessingResponse)
def process_lisp_plugin(req: LispProcessingRequest):
    try:
        t, raw_sig = DSPEngine.generate_signal(req.generator)
        fs = req.generator.sample_rate
        lisp_filtered, logs = LispDSPEngine.execute_lisp_dsp(req.lisp_code, raw_sig, fs)

        fft_config_linear = req.fft.model_copy(update={"log_scale": False})
        freqs, mag_linear, phase = DSPEngine.compute_fft(lisp_filtered, fs, fft_config_linear)
        _, mag_db, _ = DSPEngine.compute_fft(lisp_filtered, fs, req.fft)

        metrics = DSPEngine.compute_metrics(lisp_filtered, freqs, mag_linear, fs)
        spec_freqs, spec_times, spec_matrix = DSPEngine.compute_spectrogram(lisp_filtered, fs)

        return SignalProcessingResponse(
            time=t.tolist(),
            raw_signal=raw_sig.tolist(),
            filtered_signal=lisp_filtered.tolist(),
            frequency=freqs.tolist(),
            spectrum_magnitude=mag_db.tolist(),
            spectrum_phase=phase.tolist(),
            metrics=metrics,
            spectrogram_matrix=spec_matrix.tolist(),
            spectrogram_times=spec_times.tolist(),
            spectrogram_frequencies=spec_freqs.tolist()
        )
    except Exception as e:
        logger.error(f"Error executing Lisp plugin: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Lisp DSP Kernel error: {str(e)}")


@app.post("/api/export/wav")
def export_wav(req: SignalProcessingRequest):
    try:
        t, raw_sig = DSPEngine.generate_signal(req.generator)
        fs = req.generator.sample_rate
        quantized_sig, _ = DSPEngine.apply_math_quantizer(raw_sig, req.math)
        filtered_sig = DSPEngine.apply_filter(quantized_sig, fs, req.filter)

        max_val = np.max(np.abs(filtered_sig))
        norm_sig = filtered_sig / max_val if max_val > 0 else filtered_sig
        pcm_data = (norm_sig * 32767.0).astype(np.int16)

        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(fs)
            wav_file.writeframes(pcm_data.tobytes())

        wav_buffer.seek(0)
        return StreamingResponse(
            wav_buffer,
            media_type="audio/wav",
            headers={"Content-Disposition": "attachment; filename=signallab_export.wav"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"WAV export failed: {str(e)}")


@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    try:
        phase_acc = 0.0
        while True:
            try:
                data_text = await asyncio.wait_for(websocket.receive_text(), timeout=0.02)
                config_dict = json.loads(data_text)
                gen_cfg = SignalGeneratorConfig(**config_dict.get("generator", {}))
                flt_cfg = FilterConfig(**config_dict.get("filter", {}))
                fft_cfg = FFTConfig(**config_dict.get("fft", {}))
            except asyncio.TimeoutError:
                gen_cfg = SignalGeneratorConfig()
                flt_cfg = FilterConfig()
                fft_cfg = FFTConfig()
            except Exception:
                gen_cfg = SignalGeneratorConfig()
                flt_cfg = FilterConfig()
                fft_cfg = FFTConfig()

            gen_cfg.phase = (gen_cfg.phase + phase_acc) % 360.0
            phase_acc = (phase_acc + 15.0) % 360.0

            t, raw_sig = DSPEngine.generate_signal(gen_cfg)
            fs = gen_cfg.sample_rate
            filtered_sig = DSPEngine.apply_filter(raw_sig, fs, flt_cfg)
            freqs, mag_db, _ = DSPEngine.compute_fft(filtered_sig, fs, fft_cfg)

            payload = {
                "time": t[:512].tolist(),
                "raw_signal": raw_sig[:512].tolist(),
                "filtered_signal": filtered_sig[:512].tolist(),
                "frequency": freqs[:256].tolist(),
                "spectrum_magnitude": mag_db[:256].tolist(),
            }
            await websocket.send_json(payload)
            await asyncio.sleep(0.033)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket streaming error: {e}")
