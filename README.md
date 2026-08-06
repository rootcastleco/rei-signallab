<div align="center">

# REI SignalLab 2.1

### Extended Typed DSP Node Library, Kahn Execution Engine, Numerical Golden Precision Suite & REI Vibration Analysis Workbench

*Engineered by **[Betuhan Ayribas](https://betuhanayribas.com)** at **[RootCastle](https://rootcastle.com)** — Engineering Beyond Boundaries*

<br/>

<a href="https://betuhanayribas.com"><img src="https://img.shields.io/badge/Betuhan%20Ayribas-betuhanayribas.com-071521?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgMThjLTQuNDIgMC04LTMuNTgtOC04czMuNTgtOCA4LTggOCAzLjU4IDggOC0zLjU4IDgtOCA4eiIvPjwvc3ZnPg==&logoColor=white" alt="Betuhan Ayribas"/></a>
<a href="https://rootcastle.com"><img src="https://img.shields.io/badge/RootCastle-rootcastle.com-087EA4?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTEyIDNMNCA5djEyaDV2LTdoNnY3aDVWOXoiLz48L3N2Zz4=&logoColor=white" alt="RootCastle"/></a>

<br/>

[![Live App on Firebase](https://img.shields.io/badge/Live%20App-signallab--3305b.web.app-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://signallab-3305b.web.app)
[![PDF User Manual](https://img.shields.io/badge/PDF%20Manual-16--Page%20Wiki-FF0000?style=for-the-badge&logo=adobeacrobatreader&logoColor=white)](docs/wiki/REI_SignalLab_2_1_Product_Wiki.tex)
[![GitHub Wiki](https://img.shields.io/badge/GitHub-Wiki-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/rootcastleco/rei-signallab/wiki)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-2.1.0-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![SciPy](https://img.shields.io/badge/SciPy-DSP-8CAAE6?style=for-the-badge&logo=scipy&logoColor=white)](https://scipy.org)
[![React 18](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[Live Demo](https://signallab-3305b.web.app) | [16-Page PDF User Manual](docs/wiki/REI_SignalLab_2_1_Product_Wiki.tex) | [GitHub Wiki](https://github.com/rootcastleco/rei-signallab/wiki) | [Overview](#overview) | [Screenshots](#application-screenshots) | [Vibration Workbench](#rei-vibration-analysis-workbench) | [Canonical Node Library](#canonical-dsp-node-library) | [Numerical Golden Precision](#numerical-golden-precision-suite) | [API Spec](#api-endpoints-summary) | [Quick Start](#quick-start)

</div>

---

## 🏢 About

**REI SignalLab 2.1** is developed and maintained by **[Betuhan Ayribas](https://betuhanayribas.com)**, founder of **[RootCastle](https://rootcastle.com)**.

| | |
| :--- | :--- |
| **Developer** | [Betuhan Ayribas](https://betuhanayribas.com) |
| **Company** | [RootCastle](https://rootcastle.com) — Engineering Beyond Boundaries |
| **Live Application** | [signallab-3305b.web.app](https://signallab-3305b.web.app) |
| **Firebase Mirror** | [signallab-3305b.firebaseapp.com](https://signallab-3305b.firebaseapp.com) |
| **Source Repository** | [github.com/rootcastleco/rei-signallab](https://github.com/rootcastleco/rei-signallab) |
| **GitHub Wiki** | [github.com/rootcastleco/rei-signallab/wiki](https://github.com/rootcastleco/rei-signallab/wiki) |
| **Version** | 2.1.0 |
| **License** | MIT |

---

## Overview

**REI SignalLab 2.1** is an instrument-grade digital signal processing, spectral analysis, visual node graph flow studio, and industrial vibration analysis workbench. Developed by **[Betuhan Ayribas](https://betuhanayribas.com)** at **[RootCastle](https://rootcastle.com)**, it provides:

1. **Canonical Typed Node Library (`.rei-signal 2.1`)**: Versioned node registry (`GET /api/nodes`) exposing 35+ canonical DSP and Vibration nodes with strictly enforced port data types (`Signal<Real64>`, `Signal<Complex128>`, `SpectrumFrame`, `Scalar<Real64>`, `PatternEvent`).
2. **Kahn Topological Execution Engine (`POST /api/graph/execute`)**: Deterministic graph validation and execution engine with 10-point port compatibility checks, cycle detection, and Kahn's topological scheduler.
3. **REI Vibration Analysis Workbench**: End-to-end industrial machinery condition monitoring, single-plane complex vector rotor balancing, kinematic bearing defect frequency tracking (BPFO, BPFI, BSF, FTF), Hilbert envelope demodulation, 1X-10X harmonic order spectrum bar view, and rule-based fault classification.
4. **Numerical Golden Verification Suite**: Comprehensive Pytest suite enforcing IEEE double-precision float64 error $\le 10^{-12}$, FFT/IFFT reconstruction RMS error $\le 10^{-9}$, DCT Type II error $\le 10^{-12}$, and Haar wavelet error $\le 10^{-12}$.
5. **Safe AST Math Expression Evaluator**: Custom expression filter (`generic.real_value_filter`) evaluated safely using Python AST parsing without `exec()` or `eval()`.

---

## Application Screenshots

### 1. REI SignalLab Application Interface
![REI SignalLab 2.1 GUI Screenshot](docs/images/signallab_real_app_screenshot.png)

### 2. Dual CRT Oscilloscope & Spectrum Analyzer Workspace
![REI SignalLab 2.1 Workspace Overview](docs/images/signallab_ui_overview.png)

### 3. Signal Flow Studio Visual Canvas & Typed Node Catalog
![Signal Flow Studio Canvas](docs/images/node_flow_studio.png)

### 4. Python DSP Code Sandbox & Matplotlib Plot Result
![Python DSP Code Sandbox](docs/images/python_lab_preview.png)

---

## ⚙️ REI Vibration Analysis Workbench

The **REI Vibration Analysis Workbench** is a dedicated workspace for industrial machinery diagnostics, rotor balancing, bearing condition monitoring, and telemetry reporting.

```text
Accelerometer / Proximity Probe
        ↓
Sensor Calibration (mV/g, Bias Voltage)
        ↓
High-Pass Regularized Integration (Acceleration → Velocity mm/s → Displacement μm)
        ↓
Time-Domain Statistics (RMS, Peak, Crest Factor, Kurtosis)
        ↓
FFT / 1X-10X Harmonic Order Spectrum / Hilbert Envelope Spectrum
        ↓
Bearing Defect Frequencies (FTF, BPFO, BPFI, BSF)
        ↓
Single-Plane Complex Vector Rotor Balancing
        ↓
Rule-Based Fault Classifier & Automated Vibration Diagnostic Report
```

### Key Vibration Features:
- **Sensor Calibration**: Converts raw ADC voltage signals using sensor sensitivity ($\text{mV/g}$, $\text{mV/mm/s}$) and bias voltage:
  $$\text{Acc}_g = \frac{\text{InputVoltage} - \text{Bias}}{\text{Sensitivity}_{V/g}}$$
- **Double Integration**: Frequency-domain regularized integration ($v(t) = \mathcal{F}^{-1}\left\{\frac{\mathcal{F}\{a(t)\}}{j 2\pi f}\right\}$) converting acceleration ($\text{m/s}^2$) to velocity ($\text{mm/s RMS}$) without low-frequency drift.
- **Kinematic Bearing Defect Frequencies**: Calculates exact frequencies for FTF, BPFO, BPFI, and BSF using roller count $N$, ball diameter $d$, pitch diameter $D$, and contact angle $\phi$:
  $$\text{BPFO} = \frac{N}{2} \cdot f_{\text{shaft}} \cdot \left(1 - \frac{d}{D}\cos\phi\right), \quad \text{BPFI} = \frac{N}{2} \cdot f_{\text{shaft}} \cdot \left(1 + \frac{d}{D}\cos\phi\right)$$
- **Single-Plane Vector Rotor Balancing**: Solves influence coefficient complex vector balance equation ($\vec{V}_0, \vec{V}_1, \vec{W}_{\text{trial}} \to \vec{W}_{\text{correction}}$) rendering polar vector balance plots.
- **1X-10X Harmonic Order Bar View**: Interactive order spectrum bar view displaying fundamental shaft speed 1X, misalignment 2X, looseness 3X, and up to 10X harmonics.
- **Rule-Based Machine Fault Classifier**: Evaluates spectral evidence for Unbalance, Angular/Parallel Misalignment, Looseness, and Bearing Defects.

---

## 🎛️ Canonical DSP Node Library

| Category | Canonical Type | Legacy Alias | Description |
| :--- | :--- | :--- | :--- |
| **Analysis** | `analysis.noise_stats` | `SLNoiseStats` | Coherent gain corrected THD, SNR, SINAD, SFDR, ENOB |
| **Analysis** | `analysis.pattern_detector` | `SLPatternDetector` | Normalized cross-correlation pattern detector |
| **Analysis** | `analysis.min_max` | `SLMinMax` | Min, max, and peak-to-peak amplitude calculator |
| **Arithmetic** | `arithmetic.add` | `SLAdd` | Sample-by-sample signal addition ($x + y$) |
| **Arithmetic** | `arithmetic.subtract` | `SLSubtract` | Sample-by-sample signal subtraction ($x - y$) |
| **Arithmetic** | `arithmetic.multiply` | `SLMultiply` | Sample-by-sample signal multiplication ($x \cdot y$) |
| **Arithmetic** | `arithmetic.divide` | `SLDivide` | Zero-division clamped signal division ($x / y$) |
| **Arithmetic** | `arithmetic.apply_window` | `SLApplyWindow` | Hann, Hamming, Blackman windowing function |
| **Converters** | `converter.complex_to_real` | `SLComplexToReal` | Complex signal splitter (Re, Im, Mag, Phase) |
| **Converters** | `converter.real_to_complex` | `SLRealToComplex` | Real Re/Im to complex signal converter |
| **Converters** | `transform.hilbert` | `SLHilbert` | Hilbert transform envelope follower |
| **Converters** | `transform.power_spectrum` | `SLPowerSpectrum` | Power Spectral Density (PSD / Welch) |
| **Filters** | `filter.lowpass` | `SLLowPass` | LowPass IIR/FIR filter |
| **Filters** | `filter.highpass` | `SLHighPass` | HighPass Butterworth IIR filter |
| **Filters** | `filter.biquad_iir` | `SLBiQuadIir` | Pole-stability checked Biquad SOS filter |
| **Filters** | `filter.median` | `SLMedian` | Spike impulse noise removal median filter |
| **Generic** | `generic.real_value_filter` | `SLGenericRealValue` | AST-sandboxed custom math expression filter |
| **Generators** | `generator.signal` | `SLSignalGen` | Sine, Square, Triangle, Sawtooth, Noise, ECG synthesizer |
| **Generators** | `generator.gaussian_noise` | `SLGaussGen` | Deterministic seeded Gaussian white noise generator |
| **Meters** | `meter.rms` | `SLRMSMeter` | True RMS voltage meter & sliding envelope |
| **Transforms** | `transform.fft` | `SLFourier` | Fast Fourier Transform (FFT) |
| **Transforms** | `transform.inverse_real_fft` | `SLInverseFourier` | Inverse Real FFT time signal reconstructor |
| **Transforms** | `transform.dct` | `SLDct` | Discrete Cosine Transform (DCT Type II) |
| **Transforms** | `transform.haar` | `SLHaar` | Haar Discrete Wavelet Transform (DWT) |
| **Vibration** | `vibration.sensor_calibration` | `SLVibCalibrate` | IEPE & MEMS sensor calibration ($\text{mV/g}$) |
| **Vibration** | `vibration.acceleration_to_velocity` | `SLAccToVel` | High-pass regularized velocity integration ($\text{mm/s}$) |
| **Vibration** | `vibration.velocity_to_displacement` | `SLVelToDisp` | Regularized displacement integration ($\mu\text{m}$) |
| **Vibration** | `vibration.bearing_frequencies` | `SLBearingFreqs` | Kinematic BPFO, BPFI, BSF, FTF bearing frequency calculator |
| **Vibration** | `vibration.envelope_analysis` | `SLEnvelopeAnalysis` | Bandpass + Hilbert envelope spectrum for bearing faults |
| **Vibration** | `vibration.balance.single_plane` | `SLSinglePlaneBalance` | Single-plane complex vector rotor balancing |
| **Vibration** | `vibration.fault_classifier` | `SLFaultClassifier` | Rule-based machine fault diagnostic classifier |

---

## 🎯 Numerical Golden Precision Suite

All mathematical nodes and algorithms are verified against NumPy/SciPy reference standards in `backend/tests/test_golden.py` and `backend/tests/test_vibration_golden.py`:

- **Arithmetic Float64 Error**: $|x_{\text{computed}} - x_{\text{reference}}| \le 1.0 \times 10^{-12}$ (Pass)
- **FFT / IFFT Reconstruction RMS Error**: $RMS \le 1.0 \times 10^{-9}$ (Pass)
- **DCT Type II Reconstruction Error**: $RMS \le 1.0 \times 10^{-12}$ (Pass)
- **Haar Wavelet Reconstruction Error**: $RMS \le 1.0 \times 10^{-12}$ (Pass)
- **Sensor Calibration Precision**: Relative error $\le 0.1\%$ (Pass)
- **Velocity Integration Precision**: Relative error $\le 1.0\%$ (Pass)
- **Bearing Fault Frequency Precision**: Relative error $\le 0.1\%$ (Pass)
- **Single-Plane Rotor Balancing Precision**: Mass error $\le 1.0\%$, Angle error $\le 1.0^\circ$ (Pass)

---

## API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Health check & 2.1.0 feature manifest |
| `GET` | `/api/nodes` | Get canonical node specs registry array |
| `GET` | `/api/nodes/{node_type}` | Get specific canonical node spec |
| `POST` | `/api/graph/validate` | 10-point Graph Validation (`ValidationResult`) |
| `POST` | `/api/graph/execute` | Kahn Topological Graph Execution Engine (`2.1.0`) |
| `POST` | `/api/python/execute` | Restricted Python DSP sandbox engine |
| `POST` | `/api/upload/signal` | Upload `.wav`, `.csv`, `.txt`, `.json` signal files |
| `POST` | `/api/process` | Processing pipeline (Time, FFT, Metrics, Spectrogram) |
| `POST` | `/api/render/plot` | Server-side Matplotlib PNG plot renderer |
| `POST` | `/api/lisp/process` | S-Expression DSP DSL kernel execution |
| `POST` | `/api/export/wav` | Downloadable 16-bit PCM WAV audio generator |

---

## Quick Start

### 1. Clone & Run Backend

```bash
git clone https://github.com/rootcastleco/rei-signallab.git
cd rei-signallab

# Create virtual environment
py -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Run Pytest suite
$env:PYTHONPATH="backend"; py -m pytest backend/tests

# Start FastAPI server
$env:PYTHONPATH="backend"; py -m uvicorn app.main:app --reload --port 8000
```

### 2. Run Frontend Studio

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">

**Developed by [Betuhan Ayribas](https://betuhanayribas.com)**

**[RootCastle](https://rootcastle.com) — Engineering Beyond Boundaries**

REI SignalLab 2.1 • Version 2.1.0 • August 2026

</div>