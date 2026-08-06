# ROOTCASTLE / REI SignalLab 2.1 — Product Wiki

> **Engineering Beyond Boundaries**
> *Digital Signal Processing • Spectral Instrumentation • Typed Node Flow Studio • Vibration Analysis*

---

## Document Scope

This wiki describes the public **REI SignalLab 2.1** application and repository. It covers end-user operation, DSP behavior, data trust labels, graph projects, scripting facilities, APIs, deployment, maintenance, and known boundaries.

---

## 1. Product Overview

**REI SignalLab 2.1** is a browser-based laboratory suite for signal synthesis, transformation, filtering, spectral analysis, visualization, reproducible signal-flow experiments, and industrial machinery vibration analysis. It combines a React interface with a FastAPI/SciPy computation service and offers six principal workspaces:
- Dual Oscilloscope and Spectrum views
- Typed Node Graph Flow Studio (`.rei-signal 2.1`)
- Experimental Python Lab
- 2D Waterfall Spectrogram
- S-Expression DSP Kernel
- REI Vibration Analysis Workbench

### 1.1 Product Identity and Links

| Item | Location or Value |
| :--- | :--- |
| **Live Application** | [https://signallab-3305b.web.app/](https://signallab-3305b.web.app/) |
| **Firebase Mirror** | [https://signallab-3305b.firebaseapp.com/](https://signallab-3305b.firebaseapp.com/) |
| **Source Repository** | [https://github.com/rootcastleco/rei-signallab](https://github.com/rootcastleco/rei-signallab) |
| **Company** | RootCastle — [https://rootcastle.com](https://rootcastle.com) |
| **License** | MIT License |
| **Repository Version** | 2.1.0 |
| **Project Format** | `.rei-signal`, `formatVersion: "2.1"` |

### 1.2 Core Capabilities

- Synthetic waveform generation and modulation (AM, FM, PM)
- WAV, CSV, TXT, and JSON signal ingestion
- DC removal, gain, quantization, and Hilbert envelope extraction
- IIR, FIR, median, Bessel, Chebyshev, elliptic, and Butterworth filtering
- FFT magnitude and phase analysis with selectable windows
- RMS, peak-to-peak, DC, THD, SNR, SINAD, SFDR, ENOB, and fundamental estimates
- Oscilloscope, spectrum, and spectrogram visualizations
- 35+ canonical typed DSP and vibration nodes
- Deterministic Kahn-scheduled node-graph experiments
- GPS L1 C/A SDR Signal Simulator (`gps-sdr-sim` integration): 1023-chip Gold code, WGS84 orbit kinematics, Doppler shifts, C/N0, GDOP/PDOP/HDOP/VDOP, NMEA stream, and SDR binary export (.bin)
- Sensor calibration and conversion among acceleration, velocity, and displacement across 13 standard RITEC units
- 3,570+ rolling element bearing database (SKF, NTN, Cooper, Dodge) with instant search
- Interactive Shaft Orbit Plot simulator with 3-frequency superposition, probe orientations, Keyphasor timing marks, and CW/CCW rotation
- Visual Signal Tone Generator with acoustic beating effect and discrete peak FFT spectrum
- 3-Phase Symmetrical Components ($V_0, V_1, V_2$) and electrical power metrics
- VSWR, Return Loss ($S_{11}$), Friis Path Loss, and Waveguide Cutoff Frequency ($TE_{10}$)
- Hilbert envelope analysis and 1X–10X harmonic order bars
- Single-plane complex-vector rotor balancing and fault classification
- Numerical golden verification for transforms and graph operations
- AST-validated custom real-valued math expressions
- Restricted experimental Python execution with plot capture
- S-expression DSP macro execution
- CSV and 16-bit mono PCM WAV export
- Browser audio synthesis and WebSocket signal streaming
- Server-rendered Matplotlib plot endpoints

---

## 2. System Architecture

### 2.1 Logical Architecture

```text
React 18 + Vite (Browser UI)  ──>  FastAPI 2.1 (HTTP + WebSocket)
      │                                    │
      ├── Canvas Views + WebAudio          ├── NumPy / SciPy DSP Engine
      └── Local Browser DSP Fallback       ├── Canonical Nodes + Kahn Engine
                                           ├── Python + S-Expression Sandbox
                                           └── Vibration Workbench + Plot Renderer
```

### 2.2 Main Source Modules

| Module | Responsibility |
| :--- | :--- |
| `frontend/src/App.jsx` | Application state, presets, upload/export actions, trust-mode switching, and workspace navigation. |
| `frontend/src/components/` | Oscilloscope, spectrum, waterfall, metrics, audio, controls, graph studio, Python/Lisp editors, and `VibrationWorkbench.jsx`. |
| `backend/app/main.py` | FastAPI application, request routes, upload parsing, exports, and streaming. |
| `backend/app/schemas.py` | Enumerations, validation constraints, request structures, and response models. |
| `backend/app/dsp_engine.py` | Generation, modulation, math stages, filtering, FFT, metrics, spectrograms, and plot rendering. |
| `backend/app/graph/` | Canonical port types, registry, graph validation, Kahn topological scheduling, deterministic execution, and telemetry. |
| `backend/app/nodes/` | Canonical DSP and vibration node specifications, aliases, factories, and runtime implementations. |
| `backend/app/vibration_engine.py` | Sensor calibration, double integration, bearing kinematic formulas, single-plane rotor balancing, envelope analysis, rule-based fault classifier. |
| `backend/app/python_engine.py` | Restricted Python namespace, output capture, plot capture, and result extraction. |

---

## 3. Workspaces & Instrumentation

### 3.1 Signal Flow Studio (`.rei-signal 2.1`)
Graph project format supporting double-precision canonical signal types (`Signal<Real64>`, `Signal<Complex128>`, `SpectrumFrame`, `Scalar<Real64>`). Rejects invalid wiring and cycles (`HTTP 422`).

### 3.2 REI Vibration Analysis Workbench
- **Sensor Calibration**: Converts raw ADC voltage using sensitivity ($\text{mV/g}$).
- **Double Integration**: Frequency-domain regularized integration ($v(t) = \mathcal{F}^{-1}\left\{\frac{\mathcal{F}\{a(t)\}}{j 2\pi f}\right\}$).
- **Kinematic Bearing Defect Frequencies**: Calculates FTF, BPFO, BPFI, and BSF from bearing parameters ($N, d, D, \phi$).
- **Single-Plane Complex Vector Rotor Balancing**: Solves influence coefficient matrix ($\vec{V}_0, \vec{V}_1, \vec{W}_{\text{trial}} \to \vec{W}_{\text{correction}}$).
- **1X-10X Harmonic Order Spectrum Bar View**: Displays 1X-10X harmonic orders.
- **Rule-Based Machine Fault Classifier**: Evaluates spectral evidence for Unbalance, Misalignment, Looseness, and Bearing Defects.

---

## 4. API Endpoints Summary

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/` | Health check & 2.1 feature manifest |
| `GET` | `/api/nodes` | Return canonical node catalog registry |
| `POST` | `/api/process` | Full DSP processing pipeline |
| `POST` | `/api/upload/signal` | File ingestion (.wav, .csv, .txt, .json) |
| `POST` | `/api/graph/execute` | Kahn topological graph execution |
| `POST` | `/api/python/execute` | Restricted Python script execution |
| `POST` | `/api/render/plot` | Server-rendered Matplotlib PNG plot |
| `POST` | `/api/export/wav` | Downloadable 16-bit PCM WAV audio buffer |
| `POST` | `/api/dsp-lab/sampling-aliasing` | Sampling theorem & aliasing foldover simulation |
| `POST` | `/api/dsp-lab/fir-parks-mcclellan` | Parks-McClellan equiripple FIR filter design |
| `POST` | `/api/dsp-lab/autocorrelation` | Normalized autocorrelation & pitch detection |
| `POST` | `/api/dsp-lab/lms-adaptive` | LMS adaptive noise canceller algorithm |
| `POST` | `/api/dsp-lab/cwt-scalogram` | Continuous Wavelet Transform (CWT) scalogram |
| `WS` | `/ws/stream` | Real-time WebSocket signal streaming |

---

## 5. Maintenance & Verification

Run Pytest test suite including numerical golden verification tests:

```bash
$env:PYTHONPATH="backend"; py -m pytest backend/tests
```

Build production web application:

```bash
cd frontend
npm run build
```

Deploy to Firebase Hosting:

```bash
npx firebase deploy --only hosting
```
