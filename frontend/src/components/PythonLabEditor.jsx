import React, { useState } from 'react';

const PYTHON_PRESETS = [
  {
    name: 'Chirp Frequency Sweep',
    code: `# Python DSP Experiment: Chirp Frequency Sweep (100 Hz to 2000 Hz)
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
    name: 'Cardiac ECG Simulator',
    code: `# Python DSP Experiment: Synthetic ECG Heartbeat Simulation
import numpy as np

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

# Add High Frequency Noise & LowPass Filter
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
  }
];

export default function PythonLabEditor({ onPythonProcessed }) {
  const [code, setCode] = useState(PYTHON_PRESETS[0].code);
  const [logs, setLogs] = useState([]);
  const [plotImage, setPlotImage] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const runPythonScript = async () => {
    setIsExecuting(true);
    setLogs(['Running Python DSP simulation script...']);

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

  return (
    <div className="win95-outset p-3 flex flex-col gap-3">
      {/* Title Bar */}
      <div className="win95-titlebar">
        <span>Python_DSP_Sandbox_v3.5.exe</span>
        <div className="flex gap-1">
          <div className="win95-btn-box">_</div>
          <div className="win95-btn-box">□</div>
          <div className="win95-btn-box">✕</div>
        </div>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-2 py-1 border-b border-[#808080]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold">Preset Script:</span>
          <select
            onChange={(e) => setCode(PYTHON_PRESETS[parseInt(e.target.value)].code)}
            className="text-xs font-mono"
          >
            {PYTHON_PRESETS.map((p, idx) => (
              <option key={idx} value={idx}>{p.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={runPythonScript}
          disabled={isExecuting}
          className="win95-btn win95-btn-green"
        >
          {isExecuting ? 'RUNNING...' : 'EXECUTE PYTHON SCRIPT'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Code Notepad Input */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold font-mono">python_script.py [Notepad]</span>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={14}
            className="win95-inset w-full font-mono text-xs p-2 leading-relaxed resize-none bg-[#FFFFCC] text-[#000000]"
          />
        </div>

        {/* Console Log & Matplotlib Output */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold font-mono">MS-DOS Output Terminal</span>
          <div className="win95-crt-screen p-2 h-28 overflow-y-auto text-xs flex flex-col gap-1">
            {logs.map((log, idx) => (
              <div key={idx} className={log.includes('Error') ? 'text-[#FF5555]' : 'text-[#00FF00]'}>
                {log}
              </div>
            ))}
          </div>

          {plotImage && (
            <div className="win95-outset p-1 flex justify-center bg-black">
              <img src={plotImage} alt="Matplotlib Result" className="max-h-[190px] object-contain" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
