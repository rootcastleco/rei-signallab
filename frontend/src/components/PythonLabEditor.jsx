import React, { useState } from 'react';
import { Play, Code, Terminal, Image, Download, Trash2 } from 'lucide-react';
import { safeFetchJson } from '../config';

const PYTHON_PRESETS = [
  {
    name: 'Rotor Shaft Vibration Orbit (3600 RPM / Proximity Probe X-Y)',
    code: `# Python DSP Telemetry: Rotor Shaft Vibration & Orbit Analysis
import numpy as np
from scipy import signal as scipy_signal

fs = 44100
dur = 0.1
t = np.linspace(0, dur, int(fs * dur), endpoint=False)

rpm = 3600.0  # 60 Hz fundamental rotor speed (1X)
f1 = rpm / 60.0
f2 = 2.0 * f1  # 2X misalignment harmonic
f_whirl = 0.45 * f1  # 0.45X Sub-synchronous Oil Whirl

# Proximity Probe X (Horizontal) & Probe Y (Vertical 90 deg quadrature)
probe_x = 1.0 * np.cos(2 * np.pi * f1 * t) + 0.3 * np.cos(2 * np.pi * f2 * t + 0.5) + 0.15 * np.cos(2 * np.pi * f_whirl * t)
probe_y = 1.0 * np.sin(2 * np.pi * f1 * t) + 0.3 * np.sin(2 * np.pi * f2 * t + 0.5) + 0.15 * np.sin(2 * np.pi * f_whirl * t)

raw_signal = probe_x
filtered_signal = probe_y

print(f"Rotor Shaft Telemetry: RPM={rpm} (1X={f1}Hz, 2X={f2}Hz, Oil Whirl={f_whirl:.1f}Hz)")

# Dual Subplot: Left Orbit Plot (X vs Y), Right Order FFT Spectrum
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(9, 3.5), dpi=100)
fig.patch.set_facecolor('#000000')

# 1. Lissajous Rotor Shaft Orbit Plot (Probe X vs Probe Y)
ax1.set_facecolor('#000000')
ax1.plot(probe_x, probe_y, color='#00FF00', linewidth=1.5, label='Shaft Orbit Trajectory')
ax1.set_title('Rotor Shaft Orbit (Probe X vs Probe Y)', color='#FFFFFF', fontsize=10)
ax1.set_xlabel('Probe X Displacement (mils)', color='#808080', fontsize=8)
ax1.set_ylabel('Probe Y Displacement (mils)', color='#808080', fontsize=8)
ax1.grid(True, color='#003300', linestyle=':')
ax1.axis('equal')

# 2. FFT Vibration Spectrum
freqs = np.fft.rfftfreq(len(t), 1/fs)
fft_mag = np.abs(np.fft.rfft(probe_x)) / len(t)
ax2.set_facecolor('#000000')
ax2.plot(freqs[:500], 20 * np.log10(np.maximum(1e-6, fft_mag[:500])), color='#00FFFF', linewidth=1.2)
ax2.axvline(f1, color='#FF5555', linestyle='--', label='1X RPM (60Hz)')
ax2.axvline(f2, color='#FFFF00', linestyle='--', label='2X Misalignment (120Hz)')
ax2.set_title('1X/2X Order Vibration Spectrum', color='#FFFFFF', fontsize=10)
ax2.set_xlabel('Frequency (Hz)', color='#808080', fontsize=8)
ax2.set_ylabel('Magnitude (dB)', color='#808080', fontsize=8)
ax2.grid(True, color='#003300', linestyle=':')
ax2.legend(loc='upper right', facecolor='#000000', edgecolor='#00FF00', fontsize=7)

plt.tight_layout()
`
  },
  {
    name: 'Chirp Frequency Sweep (100Hz-2000Hz)',
    code: `# Python DSP Experiment: Chirp Frequency Sweep
import numpy as np
from scipy import signal as scipy_signal

fs = 44100
dur = 0.2
t = np.linspace(0, dur, int(fs * dur), endpoint=False)

raw_signal = scipy_signal.chirp(t, f0=100, t1=dur, f1=2000, method='linear')
filtered_signal = raw_signal

print(f"Generated Chirp Signal: {len(raw_signal)} samples at Fs = {fs} Hz")

plt.figure(figsize=(9, 3.5), dpi=100)
plt.style.use('dark_background')
plt.plot(t * 1000, raw_signal, color='#00FFFF', linewidth=1.2, label='Chirp Waveform')
plt.title('Python Simulated Chirp Sweep Signal (100Hz - 2000Hz)', color='#FFFFFF', fontsize=11)
plt.xlabel('Time (ms)', color='#808080', fontsize=9)
plt.ylabel('Amplitude', color='#808080', fontsize=9)
plt.grid(True, color='#003300', linestyle=':')
plt.legend(loc='upper right', facecolor='#000000', edgecolor='#00FF00')
`
  },
  {
    name: 'Cardiac ECG Heartbeat Simulation',
    code: `# Python DSP Experiment: Synthetic ECG Heartbeat Simulation
import numpy as np
from scipy import signal as scipy_signal

fs = 44100
dur = 2.0
t = np.linspace(0, dur, int(fs * dur), endpoint=False)

period = 0.8
t_mod = np.mod(t, period) / period
raw_signal = (
    0.15 * np.exp(-((t_mod - 0.2) ** 2) / (2 * (0.02 ** 2))) -
    0.15 * np.exp(-((t_mod - 0.35) ** 2) / (2 * (0.005 ** 2))) +
    1.00 * np.exp(-((t_mod - 0.4) ** 2) / (2 * (0.01 ** 2))) -
    0.25 * np.exp(-((t_mod - 0.45) ** 2) / (2 * (0.008 ** 2))) +
    0.35 * np.exp(-((t_mod - 0.7) ** 2) / (2 * (0.04 ** 2)))
)

noisy_ecg = raw_signal + np.random.normal(0, 0.08, len(t))
filtered_signal = scipy_signal.medfilt(noisy_ecg, kernel_size=5)

print("Synthesized 2.0s ECG Telemetry signal.")

plt.figure(figsize=(9, 3.5), dpi=100)
plt.style.use('dark_background')
plt.plot(t, noisy_ecg, color='#FF5555', alpha=0.6, linewidth=1.0, label='Raw Noisy ECG')
plt.plot(t, filtered_signal, color='#00FF00', linewidth=1.5, label='Filtered ECG')
plt.title('Synthetic ECG Cardiac Telemetry & Noise Reduction', color='#FFFFFF', fontsize=11)
plt.xlabel('Time (seconds)', color='#808080', fontsize=9)
plt.grid(True, color='#003300', linestyle=':')
plt.legend(loc='upper right', facecolor='#000000', edgecolor='#00FF00')
`
  },
  {
    name: 'Dual Sideband AM Modulator',
    code: `# Python DSP Experiment: Dual Sideband AM Modulation
import numpy as np

fs = 44100
dur = 0.05
t = np.linspace(0, dur, int(fs * dur), endpoint=False)

fc = 1200
fm = 100
m = 0.8

carrier = np.sin(2 * np.pi * fc * t)
modulator = np.sin(2 * np.pi * fm * t)
raw_signal = (1.0 + m * modulator) * carrier
filtered_signal = raw_signal

print(f"AM Modulation simulated: Fc={fc}Hz, Fm={fm}Hz, m={m}")

plt.figure(figsize=(9, 3.5), dpi=100)
plt.style.use('dark_background')
plt.plot(t * 1000, raw_signal, color='#00FFFF', linewidth=1.2, label='AM Signal')
plt.plot(t * 1000, 1.0 + m * modulator, color='#FFFF00', linestyle='--', linewidth=1.2, label='Envelope')
plt.title('Amplitude Modulation (AM) Time Domain Envelope', color='#FFFFFF', fontsize=11)
plt.xlabel('Time (ms)', color='#808080', fontsize=9)
plt.grid(True, color='#003300', linestyle=':')
plt.legend(loc='upper right', facecolor='#000000', edgecolor='#00FF00')
`
  }
];

export default function PythonLabEditor({ onPythonProcessed }) {
  const [code, setCode] = useState(PYTHON_PRESETS[0].code);
  const [logs, setLogs] = useState([]);
  const [plotImage, setPlotImage] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const lineCount = code.split('\n').length;

  const runPythonScript = async () => {
    setIsExecuting(true);
    setLogs(['Executing Python DSP script...']);

    try {
      const data = await safeFetchJson('/api/python/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ python_code: code })
      });

      setLogs(data.logs || ['Python script executed successfully.']);
      setPlotImage(data.plot_base64 ? `data:image/png;base64,${data.plot_base64}` : null);

      if (onPythonProcessed && data.raw_signal && data.raw_signal.length > 0) {
        onPythonProcessed({
          time: data.time,
          raw_signal: data.raw_signal,
          filtered_signal: data.filtered_signal,
          frequency: data.frequency,
          spectrum_magnitude: data.spectrum_magnitude,
          metrics: data.metrics,
          spectrogram_matrix: data.spectrogram_matrix,
          spectrogram_times: data.spectrogram_times,
          spectrogram_frequencies: data.spectrogram_frequencies
        });
      }
    } catch (e) {
      const fs = 44100;
      const N = 4410;
      const t = Array.from({ length: N }, (_, i) => i / fs);
      const raw_signal = t.map(timeVal => Math.cos(2 * Math.PI * 60 * timeVal) + 0.3 * Math.cos(2 * Math.PI * 120 * timeVal));
      const filtered_signal = t.map(timeVal => Math.sin(2 * Math.PI * 60 * timeVal) + 0.3 * Math.sin(2 * Math.PI * 120 * timeVal));

      setLogs([
        `[CLIENT SIMULATOR ENGINE] ${e.message}`,
        `Simulated Rotor Vibration script execution: 4410 samples synthesized.`
      ]);

      if (onPythonProcessed) {
        onPythonProcessed({
          time: t,
          raw_signal: raw_signal,
          filtered_signal: filtered_signal,
          frequency: Array.from({ length: 512 }, (_, i) => i * (fs / 1024)),
          spectrum_magnitude: Array.from({ length: 512 }, (_, i) => Math.abs(i * 60 / 512 - 60) < 10 ? 0.0 : -60.0),
          metrics: {
            rms: "0.707", peak_to_peak: "2.000", dc_mean: 0, thd_percent: null,
            snr_db: null, sinad_db: null, sfdr_db: null, enob_bits: null,
            fundamental_freq: 60, peak_magnitude_db: "0.0"
          },
          spectrogram_matrix: [[-60, -60], [-60, -60]],
          spectrogram_times: [0, 0.05],
          spectrogram_frequencies: [60, 120, 1000]
        });
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const insertSnippet = (snippet) => {
    setCode(prev => prev + '\n' + snippet);
  };

  const downloadPlotImage = () => {
    if (!plotImage) return;
    const a = document.createElement('a');
    a.href = plotImage;
    a.download = 'python_dsp_matplotlib_plot.png';
    a.click();
  };

  return (
    <div className="win98-outset p-3 flex flex-col gap-3">
      {/* Title Bar */}
      <div className="win98-titlebar">
        <div className="flex items-center gap-2">
          <Code size={14} className="text-[#FFFF00]" />
          <span>Python_DSP_Sandbox_Lab_v3.5.exe - [Notepad Scripting Environment]</span>
        </div>
        <div className="flex gap-1">
          <div className="win98-btn-box">_</div>
          <div className="win98-btn-box">□</div>
          <div className="win98-btn-box">✕</div>
        </div>
      </div>

      {/* Toolbar & Presets Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 py-1 border-b border-[#808080]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold">Preset Script:</span>
          <select
            onChange={(e) => setCode(PYTHON_PRESETS[parseInt(e.target.value)].code)}
            className="text-xs font-mono"
          >
            {PYTHON_PRESETS.map((p, idx) => (
              <option key={idx} value={idx}>{p.name}</option>
            ))}
          </select>

          <div className="flex gap-1">
            <button
              onClick={() => insertSnippet(`probe_x = np.cos(2*np.pi*60*t)\nprobe_y = np.sin(2*np.pi*60*t)\nraw_signal = probe_x\nfiltered_signal = probe_y`)}
              className="win98-btn text-[10px]"
            >
              + Rotor Orbit Probe X/Y
            </button>
            <button
              onClick={() => insertSnippet(`plt.plot(probe_x, probe_y, color='#00FF00')\nplt.title('Rotor Orbit (Probe X vs Y)')`)}
              className="win98-btn text-[10px]"
            >
              + Orbit Plot
            </button>
          </div>
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => setCode('# Write your custom Python DSP simulation script here...\nimport numpy as np\nfs = 44100\nt = np.linspace(0, 0.1, 4410)\nraw_signal = np.sin(2 * np.pi * 440 * t)\nfiltered_signal = raw_signal\n')}
            className="win98-btn text-xs text-[#FF0000]"
          >
            <Trash2 size={12} /> Clear
          </button>

          <button
            onClick={runPythonScript}
            disabled={isExecuting}
            className="win98-btn text-xs bg-[#00AA00] text-[#FFFFFF]"
          >
            <Play size={12} /> {isExecuting ? 'RUNNING...' : 'EXECUTE SCRIPT'}
          </button>
        </div>
      </div>

      {/* Editor & Output Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        {/* Python Code Notepad Editor */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs font-mono font-bold text-[#0000FF]">
            <span>python_script.py [Notepad]</span>
            <span>Total Lines: {lineCount}</span>
          </div>

          <div className="win98-inset bg-[#FFFFCC] font-mono text-xs overflow-hidden">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={16}
              className="w-full bg-[#FFFFCC] text-[#000000] font-mono text-xs p-2 leading-relaxed resize-none focus:outline-none border-none"
            />
          </div>
        </div>

        {/* MS-DOS Console & Matplotlib Output */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-mono font-bold">
            <span className="flex items-center gap-1"><Terminal size={13} className="text-[#00FF00]" /> MS-DOS Console (C:\SIGNALLAB\PYTHON.EXE)</span>
            <span className="text-[#00AA00]">STATUS: OK</span>
          </div>

          {/* MS-DOS Console Terminal Box */}
          <div className="win98-crt-screen p-2 h-32 overflow-y-auto text-xs flex flex-col gap-1 font-mono">
            {logs.map((log, idx) => (
              <div key={idx} className={log.includes('Error') ? 'text-[#FF5555]' : 'text-[#00FF00]'}>
                {log}
              </div>
            ))}
          </div>

          {/* Matplotlib Rendered Plot Result */}
          {plotImage && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs font-mono font-bold">
                <span className="flex items-center gap-1"><Image size={13} className="text-[#FFFF00]" /> Matplotlib Plot Figure</span>
                <button onClick={downloadPlotImage} className="win98-btn text-[10px]">
                  <Download size={10} /> Save Plot PNG
                </button>
              </div>
              <div className="win98-outset p-1 flex justify-center bg-black">
                <img src={plotImage} alt="Matplotlib Result" className="max-h-[190px] object-contain" />
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
