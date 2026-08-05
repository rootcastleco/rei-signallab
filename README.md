<div align="center">

# REI SignalLab

### High-Performance Digital Signal Processing & Spectral Instrumentation Suite

*Inspired by **Mitov SignalLab**, engineered with **Apple Human Interface Design Principles** and a **Defending Code Reference Harness** architecture.*

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![SciPy](https://img.shields.io/badge/SciPy-DSP-8CAAE6?style=for-the-badge&logo=scipy&logoColor=white)](https://scipy.org)
[![React 18](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-5.1-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[Features](#key-features) • [Architecture](#architecture--dataflow) • [Math & DSP](#mathematical--dsp-specifications) • [Quick Start](#quick-start) • [API Spec](#api-endpoints) • [Testing](#defensive-harness--testing)

</div>

---

## Overview

**REI SignalLab** is a next-generation laboratory suite for **Digital Signal Processing (DSP)**, spectral analysis, and interactive signal flow modeling. Drawing inspiration from **Mitov SignalLab**, it empowers engineers, researchers, and audio developers to synthesize, filter, measure, and analyze complex signal topologies in real time—without writing tedious boilerplate code.

The application features an **Apple macOS/iOS translucent glassmorphism interface**, HTML5 Canvas 60 FPS oscilloscope hardware rendering, real-time WebAudio DAC synthesis, 2D spectrogram waterfall heatmaps, and a node-based component visual flow diagram.

---

## Key Features

### 1. CRT Oscilloscope (Time Domain)
- **60 FPS Hardware Acceleration**: HTML5 Canvas engine rendering ultra-smooth signal trajectories.
- **Dual-Channel Monitoring**: 
  - **CH1 (Cyan)**: Raw input signal with additive Gaussian noise.
  - **CH2 (Emerald)**: Real-time filtered output signal.
- **Telemetry Controls**: Variable timebase (`0.2ms - 10ms/div`), voltage scaling (`0.1V - 5V/div`), trigger mode level indicator.
- **Precision Crosshair Cursor**: Interactive coordinate readout measuring delta time ($\Delta T$) and peak voltage ($\Delta V$).

### 2. Spectrum Analyzer (Frequency Domain - FFT)
- **Real & Complex FFT**: High-resolution Fast Fourier Transforms ($256$ to $4096$ points).
- **Dual Axis Scaling**: Switch seamlessly between **Linear (Hz)** and **Logarithmic** frequency axes.
- **Harmonic Annotations**: Automatic tracking of fundamental peak frequency and harmonic markers ($2H, 3H, 4H, 5H$).
- **Spectral Metrics**: Instant calculation of Total Harmonic Distortion (**THD %**) and Signal-to-Noise Ratio (**SNR dB**).

### 3. 2D Waterfall Spectrogram
- **Time vs. Frequency Power Rolling Surface**: Real-time spectral heatmap updating over continuous time buffers.
- **Custom Colormaps**: Built-in palette switching (**Plasma**, **Viridis**, **Thermal Heat**, **Jet Rainbow**).

### 4. Visual Component Pipeline (Mitov Flow Editor)
- **Interactive Node Wiring Graph**: Visual representation of signal nodes:
  $$\text{[Signal Generator]} \longrightarrow \text{[DSP Filter]} \longrightarrow \text{[FFT Spectral Engine]} \longrightarrow \text{[Oscilloscope / Audio DAC]}$$
- **Zero-Latency State Visualizer**: Real-time status badges, parameters, and buffer metrics per node block.

### 5. Waveform Generators & Digital Filters
- **Waveforms**: Sine, Square, Triangle, Sawtooth, Gaussian White Noise, Frequency Chirp Sweeps, Synthetic ECG Cardiac Heartbeat, and Multi-tone Harmonic Composites.
- **Digital Filters**: LowPass, HighPass, BandPass, BandStop responses utilizing Butterworth IIR, Chebyshev Type I/II, and Windowed FIR topologies.
- **Window Functions**: Hanning, Hamming, Blackman, Kaiser ($\beta$), FlatTop, and Rectangular.

### 6. Real-Time WebAudio DAC & Data Exporters
- **Live WebAudio Synthesizer**: Monitor synthesized waveforms directly through system speakers.
- **16-bit PCM WAV Export**: Generate downloadable high-fidelity audio `.wav` files directly from current DSP parameters.
- **CSV Data Export**: Export full time-series voltage matrices for MATLAB, Python, or Excel analysis.

---

## Architecture & Dataflow

```
                             ┌─────────────────────────────────────────────────────────┐
                             │               REI SignalLab Web Interface               │
                             │  (React 18 + Vite + Apple Glassmorphism + Canvas 2D)   │
                             └────────────────────────────┬────────────────────────────┘
                                                          │
                                           HTTP REST / WebSocket Stream
                                                          │
                                                          ▼
                             ┌─────────────────────────────────────────────────────────┐
                             │                FastAPI DSP Engine Server                │
                             │         (Pydantic V2 + NumPy + SciPy Signal)           │
                             └────────────────────────────┬────────────────────────────┘
                                                          │
                 ┌────────────────────────────────────────┼────────────────────────────────────────┐
                 ▼                                        ▼                                        ▼
   ┌───────────────────────────┐            ┌───────────────────────────┐            ┌───────────────────────────┐
   │    Signal Synthesis       │            │      Digital Filters      │            │    Spectral Analytics     │
   │  • Sine / Square / Noise  │            │  • Butterworth / Chebyshev│            │  • FFT (256 - 4096 pts)   │
   │  • Chirp / ECG / Multitone│            │  • Low/High/Band Pass/Stop│            │  • THD % & SNR dB Metrics │
   └───────────────────────────┘            └───────────────────────────┘            └───────────────────────────┘
```

---

## Mathematical & DSP Specifications

### 1. Fast Fourier Transform (FFT)
The discrete-time spectrum $X[k]$ is computed from windowed time signal $x[n] \cdot w[n]$:

$$X[k] = \sum_{n=0}^{N-1} x[n] \cdot w[n] \cdot e^{-j \frac{2\pi}{N} k n}$$

Magnitude in decibels relative to full scale ($\text{dBV}$):

$$\text{Mag}_{\text{dB}}[k] = 20 \log_{10} \left( \frac{2 \cdot |X[k]|}{\sum_{n=0}^{N-1} w[n]} \right)$$

### 2. Total Harmonic Distortion (THD)
THD is computed up to the 5th harmonic relative to fundamental peak amplitude $V_1$:

$$\text{THD} (\%) = \frac{\sqrt{V_2^2 + V_3^2 + V_4^2 + V_5^2}}{V_1} \times 100\%$$

### 3. Signal-to-Noise Ratio (SNR)
SNR is estimated from signal power $P_{\text{signal}} = V_1^2$ and residual in-band noise power $P_{\text{noise}}$:

$$\text{SNR}_{\text{dB}} = 10 \log_{10} \left( \frac{P_{\text{signal}}}{P_{\text{noise}}} \right)$$

---

## Technical Stack

| Domain | Technologies |
| :--- | :--- |
| **Backend Core** | Python 3.11+, FastAPI, Uvicorn, SciPy (`scipy.signal`), NumPy |
| **Frontend Framework** | React 18, Vite 5, Tailwind CSS, Lucide Icons |
| **Graphics & Rendering** | HTML5 Canvas 2D Accelerated Engine (60 FPS) |
| **Audio Processing** | Web Audio API (`AudioContext`, `BiquadFilterNode`, `OscillatorNode`) |
| **Quality Assurance** | Pytest, Pydantic V2, Defensive Error Boundaries |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Backend Service Setup

```bash
# Clone the repository
git clone https://github.com/rootcastleco/rei-signallab.git
cd rei-signallab

# Navigate to backend and install requirements
cd backend
pip install -r requirements.txt

# Run pytest unit test suite
$env:PYTHONPATH="backend"; py -m pytest backend/tests

# Start FastAPI DSP Server (Port 8000)
py -m uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Web UI Setup

```bash
# In a new terminal window
cd frontend
npm install
npm run dev
```

Open your browser at `http://localhost:3000`.

---

## API Endpoints

### `POST /api/process`
Main REST computation endpoint for signal generation, filtering, FFT, metrics, and spectrogram matrices.

#### Request Body Schema:
```json
{
  "generator": {
    "waveform": "sine",
    "frequency": 440.0,
    "amplitude": 1.0,
    "phase": 0.0,
    "offset": 0.0,
    "noise_level": 0.0,
    "sample_rate": 44100,
    "duration": 0.1
  },
  "filter": {
    "enabled": true,
    "filter_type": "lowpass",
    "filter_design": "butterworth",
    "cutoff": 1000.0,
    "order": 4
  },
  "fft": {
    "n_fft": 1024,
    "window": "hanning",
    "log_scale": true
  }
}
```

### `POST /api/export/wav`
Generates downloadable 16-bit PCM WAV audio file based on current signal settings.

### `WS /ws/stream`
High-speed WebSocket streaming endpoint pushing live 30 FPS oscilloscope buffer frames to connected clients.

---

## Defensive Harness & Testing

REI SignalLab is built following defensive programming standards:
- **Numerical Bounds Protection**: Inputs clamped defensively against NaN/Infinity, Nyquist violations, and buffer overflows.
- **Unit Test Coverage**: Comprehensive Pytest suite covering signal synthesis, filter attenuation accuracy, FFT frequency bin precision, and API schema contracts.

To execute tests:
```bash
$env:PYTHONPATH="backend"; py -m pytest backend/tests
```

---

## License

Distributed under the **MIT License**. See `LICENSE` for details.

Developed by **RootCastle**.