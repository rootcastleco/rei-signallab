<div align="center">

# REI SignalLab

### High-Performance Digital Signal Processing, Common Lisp Kernel & Spectral Instrumentation Suite

*Inspired by **Mitov SignalLab**, engineered with **Apple Human Interface Design Principles**, **Common Lisp Machine-Level DSP Kernels**, and a **Defending Code Reference Harness** architecture.*

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Common Lisp](https://img.shields.io/badge/Common%20Lisp-SBCL-5A32A3?style=for-the-badge&logo=commonlisp&logoColor=white)](https://common-lisp.net)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![SciPy](https://img.shields.io/badge/SciPy-DSP-8CAAE6?style=for-the-badge&logo=scipy&logoColor=white)](https://scipy.org)
[![React 18](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-5.1-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[Features](#key-features) • [Lisp Kernel](#machine-level-common-lisp-dsp-engine) • [Architecture](#architecture--dataflow) • [Math & DSP](#mathematical--dsp-specifications) • [Quick Start](#quick-start) • [API Spec](#api-endpoints)

</div>

---

## Overview

**REI SignalLab** is a next-generation laboratory suite for **Digital Signal Processing (DSP)**, spectral analysis, and interactive signal flow modeling. Drawing inspiration from **Mitov SignalLab**, it empowers engineers, researchers, and audio developers to synthesize, filter, measure, and analyze complex signal topologies in real time.

The application features an **Obsidian Neon Glassmorphism interface**, HTML5 Canvas 60 FPS oscilloscope hardware rendering, Common Lisp machine-level vector DSP compilation, real-time WebAudio DAC synthesis, 2D spectrogram waterfall heatmaps, and an interactive node-based component visual flow diagram.

---

## Key Features

### 1. CRT Oscilloscope & XY Lissajous Phase Instrument
- **60 FPS Hardware Acceleration**: HTML5 Canvas engine rendering ultra-smooth signal trajectories with CRT phosphor persistence decay simulation.
- **Dual-Channel & XY Plot Modes**:
  - **Time Domain**: CH1 Raw signal (Cyan) vs. CH2 Filtered signal (Emerald) with Hilbert Envelope overlay.
  - **XY Lissajous Plot**: Real-time 2D Phase Space Trajectory plot visualizing phase relationships between CH1 and CH2.
- **Telemetry Controls**: Variable timebase (`0.2ms - 10ms/div`), voltage scaling (`0.1V - 5V/div`), trigger mode level indicator.
- **Precision Crosshair Cursor**: Interactive coordinate readout measuring delta time ($\Delta T$) and peak voltage ($\Delta V$).

### 2. Spectrum Analyzer & Peak Hold Envelope
- **Real & Complex FFT**: High-resolution Fast Fourier Transforms ($256$ to $4096$ points).
- **Peak Hold Max Envelope**: Yellow memory line tracking maximum FFT spectrum values over time.
- **Dual Axis Scaling**: Switch seamlessly between **Linear (Hz)** and **Logarithmic** frequency axes.
- **Harmonic Annotations**: Automatic tracking of fundamental peak frequency and harmonic markers ($2H, 3H, 4H, 5H$).
- **Studio Telemetry**: Instant calculation of Total Harmonic Distortion (**THD %**), Signal-to-Noise Ratio (**SNR dB**), **SINAD (dB)**, **SFDR (dB)**, and **ENOB (bits)**.

### 3. Machine-Level Common Lisp DSP Engine
- **S-Expression DSP Compilation**: Low-level Common Lisp macros executed at hardware vector speeds.
- **Pre-Compiled Macros**:
  - `(biquad-filter-simd signal b0 b1 b2 a1 a2)`: Direct Form II Transposed IIR Biquad Filter.
  - `(lisp-quantize-buffer signal bits)`: N-Bit Vector Signal Quantizer.
  - `(apply-kaiser-window signal beta)`: Kaiser Window Tapering.

### 4. AM / FM / PM Modulation Engine
- **AM (Amplitude Modulation)**: $y(t) = A (1 + m \cdot \text{mod}(t)) \cdot \text{carrier}(t)$
- **FM (Frequency Modulation)**: $y(t) = A \cdot \sin(2\pi f_c t + m \cdot \sin(2\pi f_m t))$
- **PM (Phase Modulation)**: $y(t) = A \cdot \sin(2\pi f_c t + m \cdot \cos(2\pi f_m t))$

### 5. 2D Waterfall Spectrogram
- **Time vs. Frequency Power Rolling Surface**: Real-time spectral heatmap updating over continuous time buffers.
- **Custom Colormaps**: Built-in palette switching (**Plasma**, **Viridis**, **Thermal Heat**, **Jet Rainbow**).

### 6. Visual Component Pipeline (Mitov Flow Editor)
- **Interactive Node Graph**: Visual representation of signal nodes:
  $$\text{[Signal Generator]} \longrightarrow \text{[Modulator]} \longrightarrow \text{[DSP Filter]} \longrightarrow \text{[FFT Engine]} \longrightarrow \text{[Scope / Audio]}$$

### 7. Real-Time WebAudio DAC & Exporters
- **Live WebAudio Synthesizer**: Monitor synthesized waveforms directly through system speakers.
- **16-bit PCM WAV Export**: Generate downloadable high-fidelity audio `.wav` files directly from current DSP parameters.
- **CSV Data Export**: Export full time-series voltage matrices for MATLAB or Python analysis.

---

## Machine-Level Common Lisp DSP Engine

The Common Lisp DSP Engine (`backend/lisp/dsp_kernel.lisp`) processes unboxed `double-float` arrays using maximum SBCL machine-level compiler optimization:

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
                             │       (Pydantic V2 + SciPy + Common Lisp Engine)       │
                             └────────────────────────────┬────────────────────────────┘
                                                          │
                 ┌────────────────────────────────────────┼────────────────────────────────────────┐
                 ▼                                        ▼                                        ▼
   ┌───────────────────────────┐            ┌───────────────────────────┐            ┌───────────────────────────┐
   │    Signal Synthesis       │            │  Common Lisp SIMD Engine  │            │    Spectral Analytics     │
   │  • Sine / Square / Noise  │            │  • (biquad-filter-simd)   │            │  • FFT (256 - 4096 pts)   │
   │  • AM / FM / PM Modulation│            │  • (lisp-quantize-buffer) │            │  • THD, SNR, SINAD, ENOB  │
   └───────────────────────────┘            └───────────────────────────┘            └───────────────────────────┘
```

---

## Mathematical & DSP Specifications

### 1. Fast Fourier Transform (FFT)
$$X[k] = \sum_{n=0}^{N-1} x[n] \cdot w[n] \cdot e^{-j \frac{2\pi}{N} k n}$$

### 2. Total Harmonic Distortion (THD)
$$\text{THD} (\%) = \frac{\sqrt{V_2^2 + V_3^2 + V_4^2 + V_5^2}}{V_1} \times 100\%$$

### 3. Signal-to-Noise Ratio (SNR) & ENOB
$$\text{SNR}_{\text{dB}} = 10 \log_{10} \left( \frac{P_{\text{signal}}}{P_{\text{noise}}} \right), \quad \text{ENOB} = \frac{\text{SINAD}_{\text{dB}} - 1.76}{6.02}$$

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
$env:PYTHONPATH="backend"; py -m pytest backend/tests
py -m uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Web UI Setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## API Endpoints

### `POST /api/process`
Main REST computation endpoint for signal generation, filtering, FFT, metrics, and spectrogram matrices.

### `POST /api/lisp/process`
Executes machine-level Common Lisp S-Expressions on input signal vectors.

#### Request Body Schema:
```json
{
  "lisp_code": "(biquad-filter-simd signal 0.1 0.2 0.1 -0.5 0.25)",
  "generator": {
    "waveform": "sine",
    "frequency": 440.0,
    "amplitude": 1.0,
    "sample_rate": 44100,
    "duration": 0.1
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

---

## License

Distributed under the **MIT License**. See `LICENSE` for details.

Developed by **RootCastle**.