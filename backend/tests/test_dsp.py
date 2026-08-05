import pytest
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import (
    SignalGeneratorConfig,
    FilterConfig,
    FFTConfig,
    WaveformType,
    WindowType,
    FilterType,
    FilterDesign,
    SignalProcessingRequest
)
from app.dsp_engine import DSPEngine

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "REI SignalLab DSP Engine"


def test_signal_generator_sine():
    config = SignalGeneratorConfig(waveform=WaveformType.SINE, frequency=440.0, amplitude=2.0, sample_rate=44100, duration=0.1)
    t, y = DSPEngine.generate_signal(config)
    
    assert len(t) == len(y)
    assert len(y) == 4410
    # Peak amplitude check
    assert pytest.approx(np.max(y), abs=0.1) == 2.0
    assert pytest.approx(np.min(y), abs=0.1) == -2.0


def test_signal_generator_all_waveforms():
    for wave_type in WaveformType:
        config = SignalGeneratorConfig(waveform=wave_type, frequency=100.0, amplitude=1.0)
        t, y = DSPEngine.generate_signal(config)
        assert len(y) > 0
        assert not np.isnan(y).any()
        assert not np.isinf(y).any()


def test_lowpass_filter():
    # 440 Hz signal + 5000 Hz high frequency noise
    fs = 44100
    t = np.linspace(0, 0.1, int(fs * 0.1), endpoint=False)
    signal_440 = np.sin(2 * np.pi * 440 * t)
    noise_5000 = 0.5 * np.sin(2 * np.pi * 5000 * t)
    composite = signal_440 + noise_5000

    flt_config = FilterConfig(
        enabled=True,
        filter_type=FilterType.LOWPASS,
        filter_design=FilterDesign.BUTTERWORTH,
        cutoff=1000.0,
        order=4
    )
    filtered = DSPEngine.apply_filter(composite, fs, flt_config)

    # Calculate FFT of filtered signal to verify 5000 Hz component is attenuated
    fft_config = FFTConfig(n_fft=1024, log_scale=False)
    freqs, mag, _ = DSPEngine.compute_fft(filtered, fs, fft_config)

    idx_440 = np.argmin(np.abs(freqs - 440))
    idx_5000 = np.argmin(np.abs(freqs - 5000))

    # Magnitude at 440 Hz should be significantly greater than at 5000 Hz
    assert mag[idx_440] > 10 * mag[idx_5000]


def test_fft_precision():
    target_freq = 1000.0
    config = SignalGeneratorConfig(waveform=WaveformType.SINE, frequency=target_freq, amplitude=1.0, sample_rate=44100, duration=0.1)
    t, y = DSPEngine.generate_signal(config)
    
    fft_config = FFTConfig(n_fft=2048, window=WindowType.HANNING, log_scale=False)
    freqs, mag, _ = DSPEngine.compute_fft(y, 44100, fft_config)
    
    peak_idx = np.argmax(mag)
    detected_freq = freqs[peak_idx]
    
    # Frequency detection accuracy within FFT bin resolution (~21.5 Hz resolution)
    assert pytest.approx(detected_freq, abs=25.0) == target_freq


def test_api_process():
    req = SignalProcessingRequest(
        generator=SignalGeneratorConfig(waveform=WaveformType.SINE, frequency=440.0, amplitude=1.5),
        filter=FilterConfig(enabled=False),
        fft=FFTConfig(n_fft=512)
    )
    response = client.post("/api/process", json=req.model_dump())
    assert response.status_code == 200
    data = response.json()
    assert "raw_signal" in data
    assert "filtered_signal" in data
    assert "spectrum_magnitude" in data
    assert "metrics" in data
    assert data["metrics"]["fundamental_freq"] > 400.0


def test_api_wav_export():
    req = SignalProcessingRequest(
        generator=SignalGeneratorConfig(waveform=WaveformType.SINE, frequency=440.0),
        filter=FilterConfig()
    )
    response = client.post("/api/export/wav", json=req.model_dump())
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    assert len(response.content) > 100


def test_lisp_engine_biquad():
    from app.lisp_engine import LispDSPEngine
    signal_in = np.ones(100, dtype=np.float64)
    lisp_code = "(biquad-filter-simd signal 0.1 0.2 0.1 -0.5 0.25)"
    out, logs = LispDSPEngine.execute_lisp_dsp(lisp_code, signal_in)
    assert len(out) == 100
    assert not np.isnan(out).any()
    assert logs["status"] == "success"


def test_matplotlib_plot_rendering():
    response = client.get("/api/render/plot?waveform=sine&frequency=440&amplitude=1.5&plot_type=oscilloscope")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert len(response.content) > 1000

    response_spectrum = client.get("/api/render/plot?waveform=sine&frequency=440&amplitude=1.5&plot_type=spectrum")
    assert response_spectrum.status_code == 200
    assert response_spectrum.headers["content-type"] == "image/png"
    assert len(response_spectrum.content) > 1000


