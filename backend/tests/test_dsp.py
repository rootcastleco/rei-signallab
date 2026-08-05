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
from app.graph_engine import SignalFlowGraphEngine

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "REI SignalLab 2.0 DSP Engine"
    assert data["version"] == "2.0.0"


def test_signal_generator_sine():
    config = SignalGeneratorConfig(waveform=WaveformType.SINE, frequency=440.0, amplitude=2.0, sample_rate=44100, duration=0.1)
    t, y = DSPEngine.generate_signal(config)
    
    assert len(t) == len(y)
    assert len(y) == 4410
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

    fft_config = FFTConfig(n_fft=1024, log_scale=False)
    freqs, mag, _ = DSPEngine.compute_fft(filtered, fs, fft_config)

    idx_440 = np.argmin(np.abs(freqs - 440))
    idx_5000 = np.argmin(np.abs(freqs - 5000))

    assert mag[idx_440] > 10 * mag[idx_5000]


def test_fft_precision():
    target_freq = 1000.0
    config = SignalGeneratorConfig(waveform=WaveformType.SINE, frequency=target_freq, amplitude=1.0, sample_rate=44100, duration=0.1)
    t, y = DSPEngine.generate_signal(config)
    
    fft_config = FFTConfig(n_fft=2048, window=WindowType.HANNING, log_scale=False)
    freqs, mag, _ = DSPEngine.compute_fft(y, 44100, fft_config)
    
    peak_idx = np.argmax(mag)
    detected_freq = freqs[peak_idx]
    
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


def test_api_wav_export_riff_header():
    req = SignalProcessingRequest(
        generator=SignalGeneratorConfig(waveform=WaveformType.SINE, frequency=440.0),
        filter=FilterConfig()
    )
    response = client.post("/api/export/wav", json=req.model_dump())
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    assert response.content[:4] == b"RIFF"


def test_lisp_engine_biquad():
    from app.lisp_engine import LispDSPEngine
    signal_in = np.ones(100, dtype=np.float64)
    lisp_code = "(biquad-filter-simd signal 0.1 0.2 0.1 -0.5 0.25)"
    out, logs = LispDSPEngine.execute_lisp_dsp(lisp_code, signal_in)
    assert len(out) == 100
    assert not np.isnan(out).any()
    assert logs["status"] == "success"


def test_graph_kahns_topological_execution():
    engine = SignalFlowGraphEngine()
    n1 = engine.create_node("SignalGenerator", "Gen", {"frequency": 440}, "n1")
    n2 = engine.create_node("BiquadFilter", "Flt", {"cutoff": 1000}, "n2")
    n3 = engine.create_node("FFTAnalyzer", "FFT", {"n_fft": 1024}, "n3")

    engine.connect("n1", "signal_out", "n2", "signal_in")
    engine.connect("n2", "signal_out", "n3", "signal_in")

    order = engine.topological_sort()
    assert order == ["n1", "n2", "n3"]

    results = engine.run_graph()
    assert "n1" in results
    assert "n2" in results
    assert "n3" in results


def test_graph_port_type_mismatch_rejection():
    engine = SignalFlowGraphEngine()
    engine.create_node("FFTAnalyzer", "FFT", {}, "n1")
    engine.create_node("BiquadFilter", "Flt", {}, "n2")

    with pytest.raises(ValueError, match="Port Type Mismatch"):
        engine.connect("n1", "spectrum_out", "n2", "signal_in")


def test_graph_cycle_detection_rejection():
    engine = SignalFlowGraphEngine()
    engine.create_node("BiquadFilter", "F1", {}, "n1")
    engine.create_node("BiquadFilter", "F2", {}, "n2")

    engine.connect("n1", "signal_out", "n2", "signal_in")
    engine.connect("n2", "signal_out", "n1", "signal_in")

    with pytest.raises(ValueError, match="Cycle detected"):
        engine.topological_sort()
