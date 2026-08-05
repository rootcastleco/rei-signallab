<div align="center">

# REI SignalLab

### High-Performance Digital Signal Processing, Python Script Sandbox, Matplotlib Rendering API & Common Lisp Engine Suite

*Inspired by **Mitov SignalLab**, engineered with **Apple Human Interface Design Principles**, **Python Code Sandbox Simulation Lab**, **Server-Side Matplotlib Plot Rendering APIs**, and **Common Lisp Machine-Level DSP Kernels**.*

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.140%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![SciPy](https://img.shields.io/badge/SciPy-DSP-8CAAE6?style=for-the-badge&logo=scipy&logoColor=white)](https://scipy.org)
[![Matplotlib](https://img.shields.io/badge/Matplotlib-Plot%20API-11557C?style=for-the-badge&logo=python&logoColor=white)](https://matplotlib.org)
[![Common Lisp](https://img.shields.io/badge/Common%20Lisp-SBCL-5A32A3?style=for-the-badge&logo=commonlisp&logoColor=white)](https://common-lisp.net)
[![React 18](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[Topics](#repository-topics) | [Overview](#overview) | [Python Code Lab](#python-dsp-scripting--simulation-sandbox) | [Features](#key-features) | [Matplotlib API](#matplotlib-backend-plot-rendering-api) | [Lisp Kernel](#machine-level-common-lisp-dsp-engine) | [API Spec](#api-endpoints-summary) | [Quick Start](#quick-start)

</div>

---

## Repository Topics

`digital-signal-processing` `dsp` `oscilloscope` `spectrum-analyzer` `python-sandbox` `fastapi` `matplotlib` `common-lisp` `scipy` `react` `vite` `spectrogram` `signal-processing` `signal-synthesis` `audio-processing` `thd-measurement` `snr-calculation` `biquad-filter` `file-upload`

---

## Overview

**REI SignalLab** is a laboratory suite for **Digital Signal Processing (DSP)**, spectral analysis, interactive Python signal code scripting, and signal flow modeling. Drawing inspiration from **Mitov SignalLab**, it empowers engineers, researchers, and audio developers to synthesize, filter, measure, script, and analyze complex signal topologies in real time via an interactive Web UI or through REST APIs.

The application combines a high-speed **FastAPI & SciPy** computation core, an interactive **Python Scripting & Simulation Sandbox Lab**, a server-side **Matplotlib Plot Rendering API** for generating publication-ready signal plots, a **Machine-Level Common Lisp DSP Engine**, an HTML5 Canvas 60 FPS oscilloscope hardware renderer, signal file upload (`.wav`, `.csv`, `.txt`, `.json`), and real-time WebAudio DAC synthesis.

---

## Python DSP Scripting & Simulation Sandbox

REI SignalLab features an integrated **Python Code Lab** allowing users to write custom Python signal processing code, run live simulations, generate signals using NumPy and SciPy, render custom Matplotlib plots, and observe real-time telemetry metrics directly in the browser or via API (`POST /api/python/execute`).

### Example Python Experiment Script:

```python
# Python DSP Experiment: Synthetic ECG Heartbeat Simulation & LowPass Filter
import numpy as np
from scipy import signal as scipy_signal

fs = 44100
dur = 2.0
t = np.linspace(0, dur, int(fs * dur), endpoint=False)

# Synthesize ECG P-Q-R-S-T Complex Waveform
period = 0.8
t_mod = np.mod(t, period) / period
raw_signal = (
    0.15 * np.exp(-((t_mod - 0.2) ** 2) / (2 * (0.02 ** 2))) -
    0.15 * np.exp(-((t_mod - 0.35) ** 2) / (2 * (0.005 ** 2))) +
    1.00 * np.exp(-((t_mod - 0.4) ** 2) / (2 * (0.01 ** 2))) -
    0.25 * np.exp(-((t_mod - 0.45) ** 2) / (2 * (0.008 ** 2))) +
    0.35 * np.exp(-((t_mod - 0.7) ** 2) / (2 * (0.04 ** 2)))
)

# Add Gaussian Noise & Apply Filter
noisy_signal = raw_signal + np.random.normal(0, 0.08, len(t))
filtered_signal = scipy_signal.medfilt(noisy_signal, kernel_size=5)

print(f"Generated {len(t)} samples of Cardiac ECG telemetry.")

# Render Custom Matplotlib Plot
plt.figure(figsize=(9, 3.5), dpi=100)
plt.style.use('dark_background')
plt.plot(t, noisy_signal, color='#F87171', alpha=0.6, label='Raw Noisy ECG')
plt.plot(t, filtered_signal, color='#34D399', linewidth=1.5, label='Filtered ECG')
plt.title('Synthetic ECG Cardiac Telemetry Experiment', color='#F0F6FC', fontsize=11)
plt.xlabel('Time (s)', color='#8B949E')
plt.grid(True, color='#232830', linestyle=':')
plt.legend(loc='upper right', facecolor='#161B22', edgecolor='#30363D')
```

---

## Matplotlib Backend Plot Rendering API

REI SignalLab includes a server-side Matplotlib rendering backend that generates publication-quality PNG plot images directly through HTTP endpoints.

### Oscilloscope Time-Domain Plot

Rendered via `GET /api/render/plot?waveform=sine&frequency=1000&amplitude=1.5&plot_type=oscilloscope`

![Oscilloscope Time Domain Plot - 1kHz Sine Wave](docs/images/plot_oscilloscope.png)

### FFT Spectrum Analyzer Plot

Rendered via `GET /api/render/plot?waveform=sine&frequency=1000&amplitude=1.5&plot_type=spectrum`

![FFT Spectrum Analyzer Plot - 1kHz Sine](docs/images/plot_spectrum.png)

### AM Modulated Signal (Carrier 1kHz, Modulator 80Hz)

Rendered via `POST /api/render/plot` with AM modulation and Hilbert envelope extraction enabled.

![AM Modulated Signal with Hilbert Envelope](docs/images/plot_am_modulation.png)

### FM Modulation Spectrum

Rendered via `POST /api/render/plot` with FM modulation showing characteristic sideband structure.

![FM Modulation Spectrum](docs/images/plot_fm_spectrum.png)

---

## Key Features

### 1. Python Code Sandbox & Experiment Environment
- Interactive Python code editor for writing custom NumPy, SciPy, and Matplotlib signal processing scripts.
- Terminal stdout execution logger and embedded base64 PNG plot viewer.
- Presets for Chirp sweeps, Cardiac ECG simulation, and AM/FM Quadrature Modulators.

### 2. Signal File Upload Engine
- Supports uploading `.wav`, `.csv`, `.txt`, and `.json` signal data files.
- Automatically parses PCM audio streams, tabular CSV data, or JSON signal vectors and feeds them directly into the Oscilloscope, Spectrum Analyzer, and Spectrogram Waterfall.

### 3. Dual-Channel CRT Oscilloscope & XY Lissajous Plot
- **60 FPS Hardware Acceleration**: HTML5 Canvas engine rendering ultra-smooth signal trajectories with CRT phosphor persistence simulation.
- **Dual-Channel & XY Plot Modes**:
  - **Time Domain**: CH1 Raw signal (Cyan) vs. CH2 Filtered signal (Emerald) with Hilbert Envelope overlay.
  - **XY Lissajous Plot**: Real-time 2D Phase Space Trajectory plot visualizing phase relationships between CH1 and CH2.
- **Precision Crosshair Cursor**: Interactive coordinate readout measuring delta time and peak voltage.

### 4. Spectrum Analyzer & Peak Hold Envelope
- **Real & Complex FFT**: High-resolution Fast Fourier Transforms (256 to 4096 points).
- **Peak Hold Max Envelope**: Amber memory line tracking maximum FFT spectrum values over time.
- **Studio Telemetry**: Instant calculation of Total Harmonic Distortion (**THD %**), Signal-to-Noise Ratio (**SNR dB**), **SINAD (dB)**, **SFDR (dB)**, and **ENOB (bits)**.

### 5. Signal Synthesis & Digital Filter Library
- **Waveform Types**: Sine, Square, Triangle, Sawtooth, White Noise, Pink Noise, Chirp Sweep, ECG Cardiac, Pulse, Multitone.
- **Modulation Engine**: AM (Amplitude Modulation), FM (Frequency Modulation), PM (Phase Modulation).
- **IIR/FIR Filters**: Butterworth, Chebyshev I/II, Elliptic, Bessel, Windowed FIR, Median.

---

## API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Health check and feature list |
| `POST` | `/api/python/execute` | Executes user Python DSP scripts, returns stdout logs, plots, and metrics |
| `POST` | `/api/upload/signal` | Uploads `.wav`, `.csv`, `.txt`, `.json` signal files for DSP processing |
| `POST` | `/api/process` | Full signal processing (Time, FFT, Metrics, Spectrogram) |
| `POST` | `/api/render/plot` | Matplotlib PNG plot from JSON body (`?plot_type=oscilloscope` or `spectrum`) |
| `GET` | `/api/render/plot` | URL query parameter Matplotlib PNG plot renderer |
| `POST` | `/api/lisp/process` | Execute Common Lisp S-expression DSP macros on signal vectors |
| `POST` | `/api/export/wav` | Generate 16-bit PCM WAV downloadable audio buffer |
| `WS` | `/ws/stream` | Real-time WebSocket streaming buffer endpoint |

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm

### 1. Backend Service Setup

```bash
git clone https://github.com/rootcastleco/rei-signallab.git
cd rei-signallab/backend
pip install -r requirements.txt
```

Run unit tests:

```bash
PYTHONPATH=backend pytest backend/tests
```

Start backend server:

```bash
PYTHONPATH=backend uvicorn app.main:app --port 8000
```

### 2. Frontend Web UI Setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## License

Distributed under the **MIT License**. See `LICENSE` for details.

Developed by **RootCastle**.