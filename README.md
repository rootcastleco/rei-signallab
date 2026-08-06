<div align="center">

# REI SignalLab 2.1

### Extended Typed DSP Node Library, Kahn Execution Engine, Numerical Golden Precision Suite & REI Vibration Analysis Workbench

*Engineered by **[Batuhan Ayribas](https://batuhanayribas.com)** at **[RootCastle](https://rootcastle.com)** — Engineering Beyond Boundaries*

<br/>

<a href="https://batuhanayribas.com"><img src="https://img.shields.io/badge/Batuhan%20Ayribas-batuhanayribas.com-071521?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgMThjLTQuNDIgMC04LTMuNTgtOC04czMuNTgtOCA4LTggOCAzLjU4IDggOC0zLjU4IDgtOCA4eiIvPjwvc3ZnPg==&logoColor=white" alt="Batuhan Ayribas"/></a>
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

**REI SignalLab 2.1** is developed and maintained by **[Batuhan Ayribas](https://batuhanayribas.com)**, founder of **[RootCastle](https://rootcastle.com)**.

| | |
| :--- | :--- |
| **Developer** | [Batuhan Ayribas](https://batuhanayribas.com) |
| **Company** | [RootCastle](https://rootcastle.com) — Engineering Beyond Boundaries |
| **Live Application** | [signallab-3305b.web.app](https://signallab-3305b.web.app) |
| **Firebase Mirror** | [signallab-3305b.firebaseapp.com](https://signallab-3305b.firebaseapp.com) |
| **Source Repository** | [github.com/rootcastleco/rei-signallab](https://github.com/rootcastleco/rei-signallab) |
| **GitHub Wiki** | [github.com/rootcastleco/rei-signallab/wiki](https://github.com/rootcastleco/rei-signallab/wiki) |
| **Version** | 2.1.0 |
| **License** | MIT |

---

## Overview

**REI SignalLab 2.1** is an instrument-grade digital signal processing, spectral analysis, visual node graph flow studio, and industrial vibration analysis workbench. Developed by **[Batuhan Ayribas](https://batuhanayribas.com)** at **[RootCastle](https://rootcastle.com)**, it provides:

1. **Canonical Typed Node Library (`.rei-signal 2.1`)**: Versioned node registry (`GET /api/nodes`) exposing 35+ canonical DSP and Vibration nodes with strictly enforced port data types (`Signal<Real64>`, `Signal<Complex128>`, `SpectrumFrame`, `Scalar<Real64>`, `PatternEvent`).
2. **Kahn Topological Execution Engine (`POST /api/graph/execute`)**: Deterministic graph validation and execution engine with 10-point port compatibility checks, cycle detection, and Kahn's topological scheduler.
3. **REI Vibration Analysis Workbench**: End-to-end industrial machinery condition monitoring, single-plane complex vector rotor balancing, kinematic bearing defect frequency tracking (BPFO, BPFI, BSF, FTF), Hilbert envelope demodulation, 1X-10X harmonic order spectrum bar view, and rule-based fault classification.
4. **Numerical Golden Verification Suite**: Comprehensive Pytest suite enforcing IEEE double-precision float64 error $\le 10^{-12}$, FFT/IFFT reconstruction RMS error $\le 10^{-9}$, DCT Type II error $\le 10^{-12}$, and Haar wavelet error $\le 10^{-12}$.
5. **Safe AST Math Expression Evaluator**: Custom expression filter (`generic.real_value_filter`) evaluated safely using Python AST parsing without `exec()` or `eval()`

---

## 🚀 Production Deployment & Cloud Run Integration

REI SignalLab is deployed using **Google Cloud Run** (`rei-signallab-api` in `europe-west1`) and **Firebase Hosting** (`signallab-3305b`). Firebase CDN proxies all `/api/**` calls directly to the Cloud Run FastAPI container.

For complete setup, health probes, and rollback procedures, refer to [**`docs/DEPLOYMENT.md`**](docs/DEPLOYMENT.md).

### Quick Deployment

```bash
# 1. Authenticate with Google Cloud
gcloud auth login
gcloud config set project signallab-3305b

# 2. Execute Cloud Run Deployment Script
GCP_PROJECT_ID=signallab-3305b GCP_REGION=europe-west1 ./scripts/deploy-cloud-run.sh

# 3. Deploy Frontend Assets & API Rewrites to Firebase Hosting
npx firebase deploy --only hosting
```

### Health Verification Commands

```bash
curl -fsS https://signallab-3305b.web.app/api/health/live
curl -fsS https://signallab-3305b.web.app/api/health/ready
curl -fsS https://signallab-3305b.web.app/api/version
```

---

## Application Screenshots

### 1. REI SignalLab 2.1 Workspace & GPS SDR Simulator
![REI SignalLab 2.1 Hero Screenshot](docs/images/signallab_v2.1_hero.png)

### 2. Dual CRT Oscilloscope & Spectrum Analyzer Workspace
![REI SignalLab 2.1 Workspace Overview](docs/images/signallab_ui_overview.png)

### 3. Signal Flow Studio Visual Canvas & Typed Node Catalog
![Signal Flow Studio Canvas](docs/images/node_flow_studio.png)

---

## 🛰️ GPS SDR Signal Simulator Workbench (`gps-sdr-sim`)

The **GPS L1 C/A SDR Signal Simulator Workbench** is modeled after Takuji Ebinuma's open-source [`gps-sdr-sim`](https://github.com/osqzss/gps-sdr-sim). It provides full constellation orbit propagation, baseband I/Q synthesis, and downloadable binary signal streams for software-defined radios.

- **1023-Chip C/A Gold Code Generator**: Generates exact 1023-chip PRN 1–32 Gold Code sequences at $1.023\text{ MHz}$ using G1 ($x^{10} + x^3 + 1$) and G2 LFSR polynomials.
- **Orbit Kinematics & Coordinate Transformations**: Computes WGS84 Geodetic $(Lat, Lon, Alt) \to$ ECEF $(X, Y, Z)$ and ENU vector coordinates for 32 MEO satellites.
- **Doppler Shift & C/N0 Estimation**: Calculates line-of-sight range, propagation delay, Doppler frequency shift ($\pm 5\text{ kHz}$), and Carrier-to-Noise Ratio ($C/N_0 = 35\text{--}50\text{ dB-Hz}$).
- **Dilution of Precision (DOP)**: Calculates GDOP, PDOP, HDOP, and VDOP from the satellite observation geometry matrix $G$.
- **Polar Skyplot & Spectrum Visualizations**: Real-time canvas rendering of polar satellite skyplots ($0^\circ\text{--}360^\circ$ azimuth, $0^\circ\text{--}90^\circ$ elevation), baseband spectrum, I/Q scatter plot, and Gold Code auto-correlation peaks.
- **Multi-SDR Binary Export**: Export raw binary baseband signal streams (`.bin`) formatted for HackRF, LimeSDR (8-bit signed `int8`), USRP, BladeRF (16-bit signed `int16`), and RTL-SDR (8-bit unsigned `uint8`).
---

## ☀️ SRW Synchrotron & Undulator Radiation Workbench

Modeled after Oleg Chubar's [`SRW`](https://github.com/ochubar/SRW) (Synchrotron Radiation Workshop), this module provides relativistic electron beam kinematics and undulator radiation wave optics calculations backed by FastAPI endpoints (`/api/srw/*`):

- **Relativistic Electron Beam Dynamics**: Calculates Lorentz factor $\gamma = E_e / (m_e c^2)$ and electron energy spread for 0.1–15 GeV storage rings.
- **Undulator Deflection Parameter ($K$)**: Computes $K = \frac{e B_0 \lambda_u}{2\pi m_e c} \approx 0.9337 \cdot B_0 [\text{T}] \cdot \lambda_u [\text{cm}]$.
- **Harmonic Photon Energies ($E_n$)**: Computes fundamental $E_1 = \frac{949.63 E_e^2}{\lambda_u (1 + K^2/2)}$ and odd harmonic energies $E_3, E_5, E_7$ (eV).
- **Total Radiated Power ($P_{\text{rad}}$)**: Computes undulator total power $P_{\text{rad}} [\text{kW}] = 0.6331 E_e^2 B_0^2 L_u I_e$.
- **Spectral Flux & Wavefront Intensity**: Visualizes spectral flux distribution $F(E)$, 2D transverse wavefront intensity heatmap $I(x,y)$ on observation screens, and angular power density $d^2P/d\Omega$.

---

## ⚙️ REI Vibration Analysis Workbench & Condition Monitoring Suite

The **REI Vibration Analysis Workbench** is an end-to-end industrial condition monitoring suite incorporating comprehensive diagnostics tools:

- **13 Standard Industrial Vibration Units**: Supports simultaneous conversion across Acceleration ($g$ RMS/Peak, $\text{in/s}^2$, $\text{mm/s}^2$), Velocity ($\text{mm/s}$, $\text{in/s}$), and Displacement ($\text{mils}$ pk-pk, $\text{mm}$ pk-pk, $\mu\text{m}$ pk-pk).
- **3,570+ Kinematic Bearing Catalog**: Integrated database of over 3,570 rolling element bearings across **SKF**, **NTN**, **Cooper**, and **Dodge** with an instant 🔍 Search button. Computes exact BPFO, BPFI, BSF, and FTF fault frequencies.
- **Interactive Shaft Orbit Plot Simulator**:
  - Superimposes up to 3 frequency components (F1 1X, F2 2X/Misalignment, F3 Sub-Synchronous Whirl).
  - Configurable X/Y probe amplitudes, phase angles, and 5 probe pair orientations (e.g., $45^\circ\text{R} \ \& \ 45^\circ\text{L}$).
  - Keyphasor TDC timing mark placement once per 1X revolution and Clockwise / Counter-Clockwise (CW/CCW) rotation direction.
- **Visual Signal Tone Generator**: Dual sine wave acoustic tone generator demonstrating beating effects ($\Delta f = |F_1 - F_2|$) with real-time waveform and discrete peak spectrum visualization.
- **Rotor Balancing & Fault Classification**: Single-plane complex vector balancing ($\vec{V}_0, \vec{V}_1, \vec{W}_{\text{trial}} \to \vec{W}_{\text{correction}}$) and rule-based diagnostic fault classifier.

---

## 📘 Digital Signal Processing Lab (DSP Lab)

This module provides interactive educational and analytical tools backed by SciPy API endpoints (`/api/dsp-lab/*`):

- **Sampling Theorem & Aliasing Fold-Over**: Visualizes continuous signal $s(t) = \sin(2\pi f t)$ vs discrete samples $s[n]$, highlights Nyquist frequency $f_{\text{nyquist}} = f_s / 2$, and calculates folded aliased frequency $f_{\text{aliased}} = |f_{\text{signal}} - k \cdot f_{\text{sample}}|$.
- **Parks-McClellan Optimal Equiripple FIR Filter Design**: Uses `scipy.signal.remez` to compute optimal Type I FIR impulse response $h[n]$ and magnitude response $|H(e^{j\omega})|$ dB with exact passband ripple and stopband attenuation metrics.
- **Autocorrelation & Pitch Detector ($R_{xx}[\tau]$)**: Computes normalized autocorrelation sequence $R_{xx}[\tau] = \frac{\sum x[n]x[n+\tau]}{\sum x^2[n]}$ and extracts dominant fundamental pitch frequency $f_0$.
- **Least Mean Squares (LMS) Adaptive Noise Canceller**: Implements LMS adaptive filter iteration ($y[n] = \mathbf{w}^T \mathbf{x}[n]$, $e[n] = d[n] - y[n]$, $\mathbf{w}[n+1] = \mathbf{w}[n] + 2\mu e[n] \mathbf{x}[n]$) demonstrating real-time interference rejection and SNR improvement.
- **Continuous Wavelet Transform (CWT) Time-Frequency Scalogram**: Computes 2D wavelet scalogram matrix $|W(a,b)|$ using Morlet/Ricker wavelets for chirp time-frequency analysis.

---

## ⚡ Electrical & 📡 Antenna RF Workbenches

- **⚡ Electrical Workbench**: 3-phase symmetrical component decomposition ($V_0, V_1, V_2$) via Fortescue matrix transform, real/reactive/apparent power ($P, Q, S$), power factor ($\cos\phi$), and THD.
- **📡 Antenna & RF Workbench**: VSWR & Return Loss ($S_{11}$), Friis Free Space Path Loss (FSPL), and Rectangular Waveguide Cutoff Frequency ($TE_{10}$).

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

**Developed by [Batuhan Ayribas](https://batuhanayribas.com)**

**[RootCastle](https://rootcastle.com) — Engineering Beyond Boundaries**

REI SignalLab 2.1 • Version 2.1.0 • August 2026

</div>