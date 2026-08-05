<div align="center">

# REI SignalLab

### High-Performance Digital Signal Processing, Matplotlib Rendering API & Common Lisp Engine Suite

*Inspired by **Mitov SignalLab**, engineered with **Apple Human Interface Design Principles**, **Server-Side Matplotlib Plot Rendering APIs**, and **Common Lisp Machine-Level DSP Kernels**.*

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.130%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![SciPy](https://img.shields.io/badge/SciPy-DSP-8CAAE6?style=for-the-badge&logo=scipy&logoColor=white)](https://scipy.org)
[![Matplotlib](https://img.shields.io/badge/Matplotlib-Plot%20API-11557C?style=for-the-badge&logo=python&logoColor=white)](https://matplotlib.org)
[![Common Lisp](https://img.shields.io/badge/Common%20Lisp-SBCL-5A32A3?style=for-the-badge&logo=commonlisp&logoColor=white)](https://common-lisp.net)
[![React 18](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[Topics](#repository-topics) | [Overview](#overview) | [Features](#key-features) | [Matplotlib API](#matplotlib-backend-plot-rendering-api) | [Lisp Kernel](#machine-level-common-lisp-dsp-engine) | [API Spec](#api-endpoints-summary) | [Quick Start](#quick-start)

</div>

---

## Repository Topics

`digital-signal-processing` `dsp` `oscilloscope` `spectrum-analyzer` `fastapi` `matplotlib` `common-lisp` `scipy` `react` `vite` `spectrogram` `signal-processing` `signal-synthesis` `audio-processing` `thd-measurement` `snr-calculation` `biquad-filter`

---

## Overview

**REI SignalLab** is a laboratory suite for **Digital Signal Processing (DSP)**, spectral analysis, and interactive signal flow modeling. Drawing inspiration from **Mitov SignalLab**, it empowers engineers, researchers, and audio developers to synthesize, filter, measure, and analyze complex signal topologies in real time via an interactive Web UI or through REST APIs.

The application combines a high-speed **FastAPI & SciPy** computation core, a server-side **Matplotlib Plot Rendering API** for generating publication-ready signal plots, a **Machine-Level Common Lisp DSP Engine**, an HTML5 Canvas 60 FPS oscilloscope hardware renderer, and real-time WebAudio DAC synthesis.

---

## Matplotlib Backend Plot Rendering API

REI SignalLab includes a server-side Matplotlib rendering backend that generates publication-quality PNG plot images directly through HTTP endpoints. These are **real plots rendered by the running API**, not mockups.

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

### 1. Dual-Channel CRT Oscilloscope & XY Lissajous Plot
- **60 FPS Hardware Acceleration**: HTML5 Canvas engine rendering ultra-smooth signal trajectories with CRT phosphor persistence simulation.
- **Dual-Channel & XY Plot Modes**:
  - **Time Domain**: CH1 Raw signal (Cyan) vs. CH2 Filtered signal (Emerald) with Hilbert Envelope overlay.
  - **XY Lissajous Plot**: Real-time 2D Phase Space Trajectory plot visualizing phase relationships between CH1 and CH2.
- **Telemetry Controls**: Variable timebase (`0.2ms - 10ms/div`), voltage scaling (`0.1V - 5V/div`), trigger mode level indicator.
- **Precision Crosshair Cursor**: Interactive coordinate readout measuring delta time and peak voltage.

### 2. Spectrum Analyzer & Peak Hold Envelope
- **Real & Complex FFT**: High-resolution Fast Fourier Transforms (256 to 4096 points).
- **Peak Hold Max Envelope**: Amber memory line tracking maximum FFT spectrum values over time.
- **Dual Axis Scaling**: Switch seamlessly between **Linear (Hz)** and **Logarithmic** frequency axes.
- **Studio Telemetry**: Instant calculation of Total Harmonic Distortion (**THD %**), Signal-to-Noise Ratio (**SNR dB**), **SINAD (dB)**, **SFDR (dB)**, and **ENOB (bits)**.

### 3. Signal Synthesis Engine
- **Waveform Types**: Sine, Square, Triangle, Sawtooth, White Noise, Pink Noise, Chirp Sweep, ECG Cardiac, Pulse, Multitone.
- **Modulation Engine**: AM (Amplitude Modulation), FM (Frequency Modulation), PM (Phase Modulation).
- **Modulation formulas**:
  - AM: $y(t) = A (1 + m \cdot \text{mod}(t)) \cdot \text{carrier}(t)$
  - FM: $y(t) = A \cdot \sin(2\pi f_c t + m \cdot \sin(2\pi f_m t))$
  - PM: $y(t) = A \cdot \sin(2\pi f_c t + m \cdot \cos(2\pi f_m t))$

### 4. Digital Filter Library
- **IIR Filters**: Butterworth, Chebyshev Type I, Chebyshev Type II, Elliptic, Bessel.
- **FIR Filters**: Windowed FIR with configurable window functions.
- **Non-Linear**: Median filter.
- **Filter Types**: LowPass, HighPass, BandPass, BandStop.

### 5. Math & Quantizer Module
- **Hilbert Transform Envelope Extraction**: Analytic signal envelope demodulation.
- **Bit Depth Quantization**: Simulate ADC quantization at 4-bit, 8-bit, 16-bit precision.
- **DC Removal**: Mean subtraction for AC-coupled analysis.

### 6. 2D Spectrogram Waterfall
- Rolling time-frequency surface with selectable colormaps: Viridis, Plasma, Thermal, Jet, Turbo.

### 7. WebAudio DAC Synthesis
- Browser-native real-time audio output using the Web Audio API with configurable waveform playback.

### 8. Data Export
- **CSV Export**: Download time-domain signal data as comma-separated values.
- **WAV Export**: Generate 16-bit PCM WAV audio files from the processed signal chain.

---

## Matplotlib API Usage

### Quick Embed via cURL

```bash
# Oscilloscope PNG
curl "http://127.0.0.1:8000/api/render/plot?waveform=sine&frequency=440&amplitude=1.5&plot_type=oscilloscope" \
     --output oscilloscope.png

# Spectrum PNG
curl "http://127.0.0.1:8000/api/render/plot?waveform=sine&frequency=440&amplitude=1.5&plot_type=spectrum" \
     --output spectrum.png
```

### Python Integration

```python
import requests

# Simple GET request
response = requests.get(
    "http://127.0.0.1:8000/api/render/plot",
    params={"waveform": "sine", "frequency": 1000, "amplitude": 2.0, "plot_type": "oscilloscope"}
)
with open("plot.png", "wb") as f:
    f.write(response.content)

# Advanced POST with filter and modulation
payload = {
    "generator": {
        "waveform": "sine",
        "frequency": 1000.0,
        "amplitude": 2.0,
        "sample_rate": 44100,
        "duration": 0.1,
        "modulation_type": "am",
        "mod_frequency": 50,
        "mod_index": 0.8
    },
    "math": {"envelope_extraction": True},
    "filter": {
        "enabled": True,
        "filter_type": "lowpass",
        "filter_design": "butterworth",
        "cutoff": 1500.0,
        "order": 4
    },
    "fft": {"n_fft": 2048, "window": "hanning", "log_scale": True}
}

response = requests.post(
    "http://127.0.0.1:8000/api/render/plot",
    json=payload,
    params={"plot_type": "oscilloscope"}
)
with open("am_signal.png", "wb") as f:
    f.write(response.content)
```

---

## Machine-Level Common Lisp DSP Engine

The Common Lisp DSP Engine (`backend/lisp/dsp_kernel.lisp`) processes unboxed `double-float` arrays using SBCL machine-level compiler optimization:

```lisp
;;; Machine-Level Biquad IIR Filter (Direct Form II Transposed)
(declaim (inline biquad-filter-simd))
(defun biquad-filter-simd (signal-in b0 b1 b2 a1 a2)
  "Applies 2nd-order IIR Biquad Filter to double-float vector at machine speed."
  (declare (optimize (speed 3) (safety 0) (space 0) (debug 0))
           (type (simple-array double-float (*)) signal-in)
           (type double-float b0 b1 b2 a1 a2))
  (let* ((len (length signal-in))
         (out (make-array len :element-type 'double-float))
         (z1 0.0d0)
         (z2 0.0d0))
    (dotimes (i len out)
      (let* ((x (aref signal-in i))
             (y (+ (* b0 x) z1)))
        (setf z1 (- (+ (* b1 x) z2) (* a1 y)))
        (setf z2 (- (* b2 x) (* a2 y)))
        (setf (aref out i) y)))))
```

### Available S-Expression Macros

| Macro | Description |
| :--- | :--- |
| `(biquad-filter-simd signal b0 b1 b2 a1 a2)` | Direct Form II Transposed IIR Biquad Filter |
| `(lisp-quantize-buffer signal bits)` | N-Bit Vector Signal Quantizer |
| `(apply-kaiser-window signal beta)` | Kaiser Window Tapering Function |

---

## Architecture & Dataflow

```
                             ┌─────────────────────────────────────────────────────────┐
                             │               REI SignalLab Web Interface               │
                             │  (React 18 + Vite + HTML5 Canvas + WebAudio DAC)       │
                             └────────────────────────────┬────────────────────────────┘
                                                          │
                                           HTTP REST / WebSocket Stream
                                                          │
                                                          v
                             ┌─────────────────────────────────────────────────────────┐
                             │                FastAPI DSP Engine Server                │
                             │     (SciPy + Matplotlib Plot Renderer + Lisp Engine)    │
                             └────────────────────────────┬────────────────────────────┘
                                                          │
                 ┌────────────────────────────────────────┼────────────────────────────────────────┐
                 v                                        v                                        v
   ┌───────────────────────────┐            ┌───────────────────────────┐            ┌───────────────────────────┐
   │    Signal Synthesis       │            │  Matplotlib PNG Plot API  │            │  Common Lisp SIMD Engine  │
   │  Sine / Square / Noise    │            │  GET /api/render/plot     │            │  (biquad-filter-simd)     │
   │  AM / FM / PM Modulation  │            │  POST /api/render/plot    │            │  (lisp-quantize-buffer)   │
   └───────────────────────────┘            └───────────────────────────┘            └───────────────────────────┘
```

---

## Mathematical & DSP Specifications

### Fast Fourier Transform (FFT)

$$X[k] = \sum_{n=0}^{N-1} x[n] \cdot w[n] \cdot e^{-j \frac{2\pi}{N} k n}$$

### Total Harmonic Distortion (THD)

$$\text{THD} (\%) = \frac{\sqrt{V_2^2 + V_3^2 + V_4^2 + V_5^2}}{V_1} \times 100\%$$

### Signal-to-Noise Ratio (SNR) & Effective Number of Bits (ENOB)

$$\text{SNR}_{\text{dB}} = 10 \log_{10} \left( \frac{P_{\text{signal}}}{P_{\text{noise}}} \right), \quad \text{ENOB} = \frac{\text{SINAD}_{\text{dB}} - 1.76}{6.02}$$

---

## API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Health check and feature list |
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

Run tests:

```bash
PYTHONPATH=backend pytest backend/tests
```

Start the server:

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

### 3. Generate Matplotlib Documentation Plots

```bash
python generate_docs_plots.py
```

This script hits the running API and saves real PNG plots to `docs/images/`.

---

## License

Distributed under the **MIT License**. See `LICENSE` for details.

Developed by **RootCastle**.