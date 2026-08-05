import React, { useState } from 'react';
import { Play, Code, Terminal, Image, Download, Trash2, PlusCircle } from 'lucide-react';

const PYTHON_PRESETS = [
  {
    name: 'Chirp Frequency Sweep (100Hz-2000Hz)',
    code: `# Python DSP Experiment: Chirp Frequency Sweep
import numpy as np
from scipy import signal as scipy_signal

fs = 44100
dur = 0.2
t = np.linspace(0, dur, int(fs * dur), endpoint=False)

# Synthesize Chirp Sweep
raw_signal = scipy_signal.chirp(t, f0=100, t1=dur, f1=2000, method='linear')
filtered_signal = raw_signal

print(f"Generated Chirp Signal: {len(raw_signal)} samples at Fs = {fs} Hz")

# Render Matplotlib Figure
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

# Synthesize ECG P-Q-R-S-T Complex
period = 0.8
t_mod = np.mod(t, period) / period
raw_signal = (
    0.15 * np.exp(-((t_mod - 0.2) ** 2) / (2 * (0.02 ** 2))) -
    0.15 * np.exp(-((t_mod - 0.35) ** 2) / (2 * (0.005 ** 2))) +
    1.00 * np.exp(-((t_mod - 0.4) ** 2) / (2 * (0.01 ** 2))) -
    0.25 * np.exp(-((t_mod - 0.45) ** 2) / (2 * (0.008 ** 2))) +
    0.35 * np.exp(-((t_mod - 0.7) ** 2) / (2 * (0.04 ** 2)))
)

# Add High Frequency Noise & Median Filter
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

fc = 1200  # 1.2 kHz Carrier
fm = 100   # 100 Hz Modulator
m = 0.8    # Modulation Index

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
  },
  {
    name: 'Multitone Audio Synthesis (440Hz+880Hz)',
    code: `# Python DSP Experiment: Multitone Harmonic Audio Synthesis
import numpy as np

fs = 44100
dur = 0.1
t = np.linspace(0, dur, int(fs * dur), endpoint=False)

f1, f2, f3 = 440, 880, 1320  # Fundamental + 2nd + 3rd Harmonics
raw_signal = 1.0 * np.sin(2 * np.pi * f1 * t) + 0.5 * np.sin(2 * np.pi * f2 * t) + 0.25 * np.sin(2 * np.pi * f3 * t)
filtered_signal = raw_signal

print("Synthesized 3-Harmonic Audio Multitone Signal.")

plt.figure(figsize=(9, 3.5), dpi=100)
plt.style.use('dark_background')
plt.plot(t * 1000, raw_signal, color='#00FF00', linewidth=1.5, label='Multitone Waveform')
plt.title('Multitone Harmonic Signal (440Hz + 880Hz + 1320Hz)', color='#FFFFFF', fontsize=11)
plt.xlabel('Time (ms)', color='#808080', fontsize=9)
plt.grid(True, color='#003300', linestyle=':')
plt.legend(loc='upper right', facecolor='#000000', edgecolor='#00FF00')
`
  },
  {
    name: 'SciPy Butterworth LowPass Filter',
    code: `# Python DSP Experiment: Butterworth LowPass Filter Design
import numpy as np
from scipy import signal as scipy_signal

fs = 44100
dur = 0.1
t = np.linspace(0, dur, int(fs * dur), endpoint=False)

# Composite Signal: 440 Hz Fundamental + 4000 Hz Noise Component
raw_signal = np.sin(2 * np.pi * 440 * t) + 0.4 * np.sin(2 * np.pi * 4000 * t)

# Design 4th order Butterworth Lowpass Filter at Fc = 1000 Hz
b, a = scipy_signal.butter(4, 1000.0 / (fs / 2.0), btype='low')
filtered_signal = scipy_signal.filtfilt(b, a, raw_signal)

print("Applied 4th-Order SciPy Butterworth LowPass Filter at Fc = 1000 Hz")

plt.figure(figsize=(9, 3.5), dpi=100)
plt.style.use('dark_background')
plt.plot(t * 1000, raw_signal, color='#FF5555', alpha=0.5, label='Raw Composite Signal')
plt.plot(t * 1000, filtered_signal, color='#00FF00', linewidth=1.8, label='Butterworth LowPass (Fc=1kHz)')
plt.title('Butterworth LowPass IIR Filter Demonstration', color='#FFFFFF', fontsize=11)
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
    setLogs(['Executing Python DSP script in backend sandbox...']);

    try {
      const res = await fetch('/api/python/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ python_code: code })
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
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
      } else {
        const err = await res.json();
        setLogs([`API Error: ${err.detail || 'Execution failed'}`]);
      }
    } catch (e) {
      setLogs([`Execution error: ${e.message}`]);
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
              onClick={() => insertSnippet(`raw_signal = np.sin(2 * np.pi * 440 * t)`)}
              className="win98-btn text-[10px]"
            >
              + Sine Wave
            </button>
            <button
              onClick={() => insertSnippet(`b, a = scipy_signal.butter(4, 1000 / (fs/2), btype='low')\nfiltered_signal = scipy_signal.filtfilt(b, a, raw_signal)`)}
              className="win98-btn text-[10px]"
            >
              + LowPass Filter
            </button>
            <button
              onClick={() => insertSnippet(`plt.plot(t, raw_signal, color='#00FF00')\nplt.title('Custom Signal Plot')`)}
              className="win98-btn text-[10px]"
            >
              + Matplotlib Plot
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
