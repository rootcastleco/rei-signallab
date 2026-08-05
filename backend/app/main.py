from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
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
    version="1.1.0"
)

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
        "version": "1.1.0",
        "features": [
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
        # 1. Generate Base/Modulated Signal
        t, raw_sig = DSPEngine.generate_signal(req.generator)
        fs = req.generator.sample_rate

        # 2. Math & Quantizer Ops (Gain, Bit quantization, Hilbert envelope)
        quantized_sig, envelope_sig = DSPEngine.apply_math_quantizer(raw_sig, req.math)

        # 3. Apply Digital Filter
        filtered_sig = DSPEngine.apply_filter(quantized_sig, fs, req.filter)

        # 4. FFT Computation
        fft_config_linear = req.fft.model_copy(update={"log_scale": False})
        freqs, mag_linear, phase = DSPEngine.compute_fft(filtered_sig, fs, fft_config_linear)
        _, mag_db, _ = DSPEngine.compute_fft(filtered_sig, fs, req.fft)

        # 5. Calculate Metrics (THD, SNR, SINAD, SFDR, ENOB)
        metrics = DSPEngine.compute_metrics(filtered_sig, freqs, mag_linear, fs)

        # 6. Spectrogram matrix for waterfall
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
