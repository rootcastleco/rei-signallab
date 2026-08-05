from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
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
    FilterConfig
)
from .dsp_engine import DSPEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("signallab_api")

app = FastAPI(
    title="REI SignalLab API",
    description="High-Performance Digital Signal Processing & Spectral Analysis Engine inspired by Mitov SignalLab",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def get_root():
    return {
        "app": "REI SignalLab DSP Engine",
        "status": "online",
        "version": "1.0.0",
        "features": [
            "Signal Generation (Sine, Square, Triangle, Noise, Chirp, ECG, Multitone)",
            "Digital Filters (Butterworth, Chebyshev, FIR)",
            "FFT & Spectrogram Waterfall Analysis",
            "THD & SNR Measurement",
            "Real-time WebSocket Streaming"
        ]
    }


@app.post("/api/process", response_model=SignalProcessingResponse)
def process_signal(req: SignalProcessingRequest):
    """
    Core REST endpoint for generating, filtering, and calculating spectral analysis for a signal configuration.
    """
    try:
        # 1. Generate Signal
        t, raw_sig = DSPEngine.generate_signal(req.generator)
        fs = req.generator.sample_rate

        # 2. Filter Signal
        filtered_sig = DSPEngine.apply_filter(raw_sig, fs, req.filter)

        # 3. FFT Computation (Linear and dB)
        fft_config_linear = req.fft.model_copy(update={"log_scale": False})
        freqs, mag_linear, phase = DSPEngine.compute_fft(filtered_sig, fs, fft_config_linear)
        _, mag_db, _ = DSPEngine.compute_fft(filtered_sig, fs, req.fft)

        # 4. Signal Metrics (THD, SNR, RMS, P2P)
        metrics = DSPEngine.compute_metrics(filtered_sig, freqs, mag_linear, fs)

        # 5. Spectrogram matrix for waterfall
        spec_freqs, spec_times, spec_matrix = DSPEngine.compute_spectrogram(filtered_sig, fs)

        return SignalProcessingResponse(
            time=t.tolist(),
            raw_signal=raw_sig.tolist(),
            filtered_signal=filtered_sig.tolist(),
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


@app.post("/api/export/wav")
def export_wav(req: SignalProcessingRequest):
    """
    Generates downloadable 16-bit PCM WAV file from the configured signal.
    """
    try:
        t, raw_sig = DSPEngine.generate_signal(req.generator)
        fs = req.generator.sample_rate
        filtered_sig = DSPEngine.apply_filter(raw_sig, fs, req.filter)

        # Normalize signal to [-1.0, 1.0] to avoid clipping
        max_val = np.max(np.abs(filtered_sig))
        if max_val > 0:
            norm_sig = filtered_sig / max_val
        else:
            norm_sig = filtered_sig

        # Convert to 16-bit PCM
        pcm_data = (norm_sig * 32767.0).astype(np.int16)

        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, "wb") as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
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
    """
    Real-time WebSocket streaming endpoint for live Oscilloscope & Spectrum visualization.
    Pushes continuous buffer frames to client.
    """
    await websocket.accept()
    logger.info("WebSocket client connected to SignalLab stream")
    try:
        phase_acc = 0.0
        while True:
            # Receive client update configuration if sent, or read current state
            try:
                data_text = await asyncio.wait_for(websocket.receive_text(), timeout=0.02)
                config_dict = json.loads(data_text)
                gen_cfg = SignalGeneratorConfig(**config_dict.get("generator", {}))
                flt_cfg = FilterConfig(**config_dict.get("filter", {}))
                fft_cfg = FFTConfig(**config_dict.get("fft", {}))
            except asyncio.TimeoutError:
                # Default configuration if no client update frame
                gen_cfg = SignalGeneratorConfig(frequency=440.0, amplitude=1.0)
                flt_cfg = FilterConfig()
                fft_cfg = FFTConfig()
            except Exception:
                gen_cfg = SignalGeneratorConfig()
                flt_cfg = FilterConfig()
                fft_cfg = FFTConfig()

            # Advance continuous phase for smooth motion
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
            await asyncio.sleep(0.033)  # ~30 FPS stream push rate

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket streaming error: {e}")
