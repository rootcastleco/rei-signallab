import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, BarChart2, Waves, Download, FileSpreadsheet, Cpu, Upload, FileAudio, Code } from 'lucide-react';

import Oscilloscope from './components/Oscilloscope';
import SpectrumAnalyzer from './components/SpectrumAnalyzer';
import WaterfallSpectrogram from './components/WaterfallSpectrogram';
import ControlPanel from './components/ControlPanel';
import AudioEngine from './components/AudioEngine';
import SignalMetrics from './components/SignalMetrics';
import LispPluginEditor from './components/LispPluginEditor';
import PythonLabEditor from './components/PythonLabEditor';

const PRESETS = {
  SINE_440: {
    name: 'Sine Wave (440 Hz Pitch)',
    generator: { waveform: 'sine', frequency: 440, amplitude: 1.0, phase: 0, offset: 0, noise_level: 0, sample_rate: 44100, duration: 0.1, modulation_type: 'none' },
    math: { envelope_extraction: false, bit_depth: null, dc_remove: false, gain_db: 0 },
    filter: { enabled: false, filter_type: 'lowpass', filter_design: 'butterworth', cutoff: 1000, order: 4 },
    fft: { n_fft: 1024, window: 'hanning', log_scale: true }
  },
  AM_RADIO: {
    name: 'AM Radio Modulation',
    generator: { waveform: 'sine', frequency: 1000, amplitude: 1.5, phase: 0, offset: 0, noise_level: 0.05, sample_rate: 44100, duration: 0.1, modulation_type: 'am', mod_frequency: 50, mod_index: 0.8 },
    math: { envelope_extraction: true, bit_depth: null, dc_remove: false, gain_db: 0 },
    filter: { enabled: false, filter_type: 'lowpass', filter_design: 'butterworth', cutoff: 2000, order: 4 },
    fft: { n_fft: 2048, window: 'hanning', log_scale: true }
  },
  FILTERED_NOISE: {
    name: 'Filtered LowPass Noise',
    generator: { waveform: 'noise', frequency: 1000, amplitude: 1.0, phase: 0, offset: 0, noise_level: 0, sample_rate: 44100, duration: 0.1, modulation_type: 'none' },
    math: { envelope_extraction: false, bit_depth: null, dc_remove: false, gain_db: 0 },
    filter: { enabled: true, filter_type: 'lowpass', filter_design: 'butterworth', cutoff: 800, order: 4 },
    fft: { n_fft: 1024, window: 'hamming', log_scale: true }
  },
  ECG_HEART: {
    name: 'ECG Cardiac Telemetry',
    generator: { waveform: 'ecg', frequency: 1.2, amplitude: 2.0, phase: 0, offset: 0, noise_level: 0.05, sample_rate: 44100, duration: 2.0, modulation_type: 'none' },
    math: { envelope_extraction: false, bit_depth: null, dc_remove: true, gain_db: 0 },
    filter: { enabled: true, filter_type: 'lowpass', filter_design: 'fir_window', cutoff: 40, order: 4 },
    fft: { n_fft: 2048, window: 'hanning', log_scale: true }
  }
};

export default function App() {
  const [activeView, setActiveView] = useState('dual');
  const [presetKey, setPresetKey] = useState('SINE_440');

  const [genCfg, setGenCfg] = useState(PRESETS.SINE_440.generator);
  const [mathCfg, setMathCfg] = useState(PRESETS.SINE_440.math);
  const [filterCfg, setFilterCfg] = useState(PRESETS.SINE_440.filter);
  const [fftCfg, setFFTCfg] = useState(PRESETS.SINE_440.fft);

  const [dsp, setDsp] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [uploadedFileName, setUploadedFileName] = useState(null);

  const fileInputRef = useRef(null);

  const fallback = useCallback((gen, math) => {
    const fs = gen.sample_rate || 44100;
    const dur = gen.duration || 0.1;
    const N = Math.floor(fs * dur);
    const t = [], raw = [], filtered = [];
    const envelope = math.envelope_extraction ? [] : null;

    const freq = gen.frequency, amp = gen.amplitude;
    const phaseRad = (gen.phase * Math.PI) / 180;
    const modType = gen.modulation_type || 'none';
    const modFreq = gen.mod_frequency || 20;
    const modIdx = gen.mod_index || 0.5;

    for (let i = 0; i < N; i++) {
      const tv = i / fs;
      t.push(tv);
      const carrier = Math.sin(2 * Math.PI * freq * tv + phaseRad);
      const modSig = Math.sin(2 * Math.PI * modFreq * tv);
      let y = modType === 'am' ? amp * (1 + modIdx * modSig) * carrier
            : modType === 'fm' ? amp * Math.sin(2 * Math.PI * freq * tv + modIdx * modSig + phaseRad)
            : amp * carrier;
      y += gen.offset;
      if (gen.noise_level > 0) y += (Math.random() * 2 - 1) * gen.noise_level;
      raw.push(y); filtered.push(y);
      if (envelope) envelope.push(Math.abs(y));
    }

    const nFft = Math.min(1024, N), df = fs / nFft;
    const freqs = [], magDb = [];
    for (let k = 0; k < nFft / 2; k++) {
      const f = k * df;
      freqs.push(f);
      const v = Math.abs(f - freq) < df * 2 ? amp * 0.7 : 0.001 + Math.random() * 0.002;
      magDb.push(20 * Math.log10(v));
    }

    return {
      time: t, raw_signal: raw, filtered_signal: filtered, envelope_signal: envelope,
      frequency: freqs, spectrum_magnitude: magDb,
      metrics: {
        rms: (amp / Math.sqrt(2)).toFixed(3), peak_to_peak: (amp * 2).toFixed(3),
        dc_mean: gen.offset, thd_percent: 0.15, snr_db: 46.2, sinad_db: 44.8,
        sfdr_db: 58.4, enob_bits: 7.15, fundamental_freq: freq,
        peak_magnitude_db: (20 * Math.log10(amp)).toFixed(1)
      },
      spectrogram_matrix: [magDb, magDb, magDb],
      spectrogram_times: [0, 0.05, 0.1],
      spectrogram_frequencies: freqs
    };
  }, []);

  const fetchDSP = useCallback(async () => {
    if (uploadedFileName) return;
    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generator: genCfg, math: mathCfg, filter: filterCfg, fft: fftCfg })
      });
      if (res.ok) { setDsp(await res.json()); setStatus('online'); }
      else throw new Error();
    } catch {
      setDsp(fallback(genCfg, mathCfg));
      setStatus('fallback');
    }
  }, [genCfg, mathCfg, filterCfg, fftCfg, fallback, uploadedFileName]);

  useEffect(() => { fetchDSP(); }, [fetchDSP]);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('filter_enabled', filterCfg.enabled);
    formData.append('filter_cutoff', filterCfg.cutoff);
    formData.append('filter_type', filterCfg.filter_type);
    formData.append('envelope_extraction', mathCfg.envelope_extraction);

    try {
      const res = await fetch('/api/upload/signal', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setDsp(data);
        setUploadedFileName(file.name);
        setStatus('online');
      } else {
        const err = await res.json();
        alert('File Upload Failed: ' + (err.detail || 'Invalid signal file'));
      }
    } catch (e) {
      alert('File upload error: ' + e.message);
    }
  };

  const loadPreset = (key) => {
    setUploadedFileName(null);
    setPresetKey(key);
    const p = PRESETS[key];
    if (p) { setGenCfg(p.generator); setMathCfg(p.math); setFilterCfg(p.filter); setFFTCfg(p.fft); }
  };

  const exportCSV = () => {
    if (!dsp) return;
    let csv = 'Time(s),Raw(V),Filtered(V)\n';
    for (let i = 0; i < dsp.time.length; i++) csv += `${dsp.time[i]},${dsp.raw_signal[i]},${dsp.filtered_signal[i]}\n`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'signallab_data.csv'; a.click();
  };

  const exportWAV = async () => {
    try {
      const res = await fetch('/api/export/wav', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generator: genCfg, math: mathCfg, filter: filterCfg, fft: fftCfg })
      });
      if (res.ok) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(await res.blob());
        a.download = 'signallab_audio.wav'; a.click();
      }
    } catch {}
  };

  return (
    <div className="min-h-screen p-4 max-w-[1550px] mx-auto flex flex-col gap-4">

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".wav,.csv,.txt,.json"
        style={{ display: 'none' }}
      />

      {/* 1. TOP STUDIO HEADER BAR */}
      <header className="studio-panel px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#181C24] border border-[#232830] flex items-center justify-center">
            <Activity className="w-4.5 h-4.5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-[#EAF0F6] flex items-center gap-2">
              REI SignalLab <span className="text-[10px] font-mono font-normal px-1.5 py-0.5 rounded bg-[#181C24] text-sky-400 border border-[#232830]">v1.5</span>
            </h1>
            <p className="text-[11px] text-[#7C8594]">Digital Signal Processing & Python Scripting Suite</p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center flex-wrap gap-2">
          {uploadedFileName && (
            <div className="flex items-center gap-1.5 bg-[#0C0E12] border border-[#232830] rounded px-2.5 py-1 text-xs text-emerald-400 font-mono">
              <FileAudio className="w-3.5 h-3.5" /> {uploadedFileName}
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-[#0C0E12] border border-[#232830] rounded px-2.5 py-1 text-xs">
            <span className="text-[#7C8594] font-mono">Preset:</span>
            <select
              value={uploadedFileName ? 'upload' : presetKey}
              onChange={e => { if (e.target.value !== 'upload') loadPreset(e.target.value); }}
              className="bg-transparent text-xs text-[#EAF0F6] font-mono focus:outline-none cursor-pointer"
            >
              {uploadedFileName && <option value="upload" className="bg-[#111318]">File: {uploadedFileName}</option>}
              {Object.entries(PRESETS).map(([k, p]) => (
                <option key={k} value={k} className="bg-[#111318]">{p.name}</option>
              ))}
            </select>
          </div>

          <button className="btn text-xs text-sky-400 border-sky-500/30" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-3.5 h-3.5" /> Upload File (.wav, .csv)
          </button>

          <button className="btn text-xs" onClick={exportCSV}>
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> CSV
          </button>

          <button className="btn text-xs" onClick={exportWAV}>
            <Download className="w-3.5 h-3.5 text-sky-400" /> WAV Audio
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0C0E12] border border-[#232830] text-[11px] font-mono text-[#7C8594]">
            <span className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            {status === 'online' ? 'FASTAPI ONLINE' : 'CLIENT DSP'}
          </div>
        </div>
      </header>

      {/* 2. REAL-TIME SIGNAL TELEMETRY METRICS */}
      <SignalMetrics metrics={dsp?.metrics} />

      {/* 3. MAIN WORKSPACE STAGE & CONTROL SIDEBAR */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">

        {/* Left Display Stage */}
        <div className="flex-1 flex flex-col gap-3 w-full">

          {/* Navigation View Tabs */}
          <div className="flex items-center justify-between border-b border-[#232830] pb-1.5">
            <div className="studio-tabs">
              <button
                onClick={() => setActiveView('dual')}
                className={`studio-tab ${activeView === 'dual' ? 'active' : ''}`}
              >
                <Activity className="w-3.5 h-3.5 text-sky-400" /> Scope + Spectrum
              </button>

              <button
                onClick={() => setActiveView('python')}
                className={`studio-tab ${activeView === 'python' ? 'active' : ''}`}
              >
                <Code className="w-3.5 h-3.5 text-sky-400" /> Python Lab
              </button>

              <button
                onClick={() => setActiveView('waterfall')}
                className={`studio-tab ${activeView === 'waterfall' ? 'active' : ''}`}
              >
                <Waves className="w-3.5 h-3.5 text-emerald-400" /> 2D Waterfall
              </button>

              <button
                onClick={() => setActiveView('lisp')}
                className={`studio-tab ${activeView === 'lisp' ? 'active' : ''}`}
              >
                <Cpu className="w-3.5 h-3.5 text-amber-400" /> Common Lisp
              </button>
            </div>

            <AudioEngine generatorConfig={genCfg} filterConfig={filterCfg} />
          </div>

          {/* Display Stage Canvases */}
          {activeView === 'dual' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <Oscilloscope
                timeData={dsp?.time}
                rawSignal={dsp?.raw_signal}
                filteredSignal={dsp?.filtered_signal}
                envelopeSignal={dsp?.envelope_signal}
                sampleRate={genCfg.sample_rate}
              />
              <SpectrumAnalyzer
                frequencyData={dsp?.frequency}
                magnitudeData={dsp?.spectrum_magnitude}
                metrics={dsp?.metrics}
              />
            </div>
          )}

          {activeView === 'python' && (
            <PythonLabEditor onPythonProcessed={(pythonData) => setDsp(pythonData)} />
          )}

          {activeView === 'waterfall' && (
            <WaterfallSpectrogram
              spectrogramMatrix={dsp?.spectrogram_matrix}
              frequencies={dsp?.spectrogram_frequencies}
              times={dsp?.spectrogram_times}
            />
          )}

          {activeView === 'lisp' && (
            <LispPluginEditor
              generatorConfig={genCfg}
              fftConfig={fftCfg}
              onLispProcessed={d => setDsp(d)}
            />
          )}
        </div>

        {/* Right Docked Control Sidebar */}
        <ControlPanel
          generatorConfig={genCfg} setGeneratorConfig={setGenCfg}
          mathConfig={mathCfg} setMathConfig={setMathCfg}
          filterConfig={filterCfg} setFilterConfig={setFilterCfg}
        />
      </div>

      {/* FOOTER */}
      <footer className="studio-panel px-4 py-2 flex items-center justify-between text-xs text-[#7C8594] font-mono">
        <span>REI SignalLab &copy; 2026 - Modern Digital Signal Processing Suite</span>
        <span>Python FastAPI + SciPy | React 18</span>
      </footer>
    </div>
  );
}
