# REI SignalLab - Digital Signal Processing & Visualization Suite

REI SignalLab is a comprehensive, high-performance Digital Signal Processing (DSP) & Spectral Instrumentation Suite inspired by **Mitov SignalLab**.

Built with an **Apple Design Language UI** (translucent glassmorphic panels, SF typography, glowing CRT graticule oscilloscopes, precision control knobs) and a **Defending Code Reference Harness** architecture (rigid input validation, zero division resilience, type-safe FastAPI & Pydantic models, and 100% passing Pytest suite).

---

## Key Features

- ⚡ **60 FPS CRT Oscilloscope**: Multi-channel real-time time-domain visualization with adjustable timebase (`0.2ms - 10ms/div`), voltage scaling (`0.1V - 5V/div`), trigger levels, and cursor delta measurement.
- 📊 **FFT Spectrum Analyzer**: Frequency-domain analysis with linear/logarithmic frequency scales, peak fundamental frequency marker, automatic harmonic annotations ($2H - 5H$), THD % & SNR dB telemetry.
- 🌊 **2D Waterfall Spectrogram**: Rolling spectral power vs time spectrogram with customizable colormaps (Plasma, Viridis, Thermal, Jet).
- 🔀 **Visual Component Pipeline**: Zero-code interactive node wiring diagram showing real-time signal routing (Generator → Filter → FFT → Instrumentation / DAC).
- 📻 **Multi-Waveform Signal Generator**:
  - Sine, Square, Triangle, Sawtooth
  - Gaussian White Noise
  - Frequency Chirp Sweeps
  - Synthetic ECG Cardiac Heartbeat Model
  - Multi-tone Harmonic Composites
- 🎛️ **Digital DSP Filters**:
  - Response Types: LowPass, HighPass, BandPass, BandStop
  - Topologies: Butterworth IIR, Chebyshev Type I/II, Windowed FIR
- 🪟 **Tapering Window Functions**: Hanning, Hamming, Blackman, Kaiser, FlatTop, Rectangular.
- 🔊 **WebAudio API Real-time Synthesizer**: Live audio playback of synthesized & filtered signals directly in the browser.
- 💾 **Export Tools**: One-click 16-bit PCM WAV audio file export & CSV time-series telemetry data export.

---

## Project Structure

```
rei-signallab/
├── backend/
│   ├── app/
│   │   ├── dsp_engine.py    # NumPy/SciPy Signal Processing Engine
│   │   ├── main.py          # FastAPI REST & WebSocket Server
│   │   └── schemas.py       # Defensive Pydantic Input/Output Schemas
│   ├── tests/
│   │   └── test_dsp.py      # Pytest Unit Test Suite
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # Scope, Spectrum, Spectrogram, Control Panel, Pipeline
│   │   ├── App.jsx          # Main Apple Design System Workspace
│   │   └── index.css        # CSS Glassmorphism & UI Tokens
│   └── package.json
└── README.md
```

---

## Quick Start

### 1. Backend Setup & Run

```bash
# Navigate to root directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Run Pytest suite
$env:PYTHONPATH="backend"; py -m pytest backend/tests

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup & Run

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## License

MIT License