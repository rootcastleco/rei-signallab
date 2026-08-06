# REI SignalLab 2.1 — MATLAB Add-On & Client API Toolbox

> **Engineered by [Batuhan Ayribas](https://batuhanayribas.com) at [RootCastle](https://rootcastle.com)**
> *Digital Signal Processing • Spectral Instrumentation • Vibration Analysis • MATLAB Integration*

---

## 🚀 Quick Start in MATLAB

### 1. Installation & Path Registration
Run the 1-click installer inside MATLAB command window:

```matlab
% Add REI SignalLab to MATLAB Path
install_rei_signallab
```

### 2. Connect & Process Signals in MATLAB
```matlab
% Create REISignalLab Client Object
lab = REISignalLab('https://signallab.site');

% Test Connection
lab.checkHealth();

% Synthesize & Filter Signal
sig = lab.processSignal('sine', 440, 1.0, 44100, 0.1, 'lowpass', 1000);

% Plot Time Waveform & FFT Spectrum
figure;
subplot(2,1,1); plot(sig.time, sig.signal); title('Signal Waveform');
subplot(2,1,2); stem(sig.fft.frequencies, sig.fft.magnitude); title('FFT Spectrum');
```

---

## ⚙️ Core MATLAB Methods

| Method | Syntax | Description |
| :--- | :--- | :--- |
| **Constructor** | `lab = REISignalLab(url)` | Connects to REI SignalLab API (`https://signallab.site` or `http://localhost:8000`) |
| **Health Check** | `lab.checkHealth()` | Validates live connection and engine readiness |
| **Process Signal** | `lab.processSignal(...)` | Synthesizes waveforms, applies IIR/FIR filters, extracts THD/SNR/RMS |
| **Vibration Analysis** | `lab.analyzeVibration(...)` | Single-plane rotor balancing & condition monitoring |
| **Bearing Search** | `lab.searchBearing('6205')` | Searches 3,570+ bearing catalog for BPFO, BPFI, BSF, FTF frequencies |
| **Electrical Analysis** | `lab.analyzeElectrical(Va, Vb, Vc)` | Computes 3-phase Fortescue symmetrical components ($V_0, V_1, V_2$) & THD% |
| **Antenna RF Analysis** | `lab.analyzeAntenna(freq, zReal, zImag)` | Computes VSWR, Return Loss $S_{11}$, and Friis Link Budget Margin |
| **AI Senior Copilot** | `lab.askAiCopilot(prompt, type)` | Runs OpenRouter LLM scientific reasoning directly inside MATLAB |

---

## 📁 Repository Files

- `REISignalLab.m`: Core MATLAB Object-Oriented Client Class
- `install_rei_signallab.m`: 1-Click MATLAB Path Registration & Self-Test Script
- `examples/matlab_demo.m`: Comprehensive MATLAB Demonstration Script
