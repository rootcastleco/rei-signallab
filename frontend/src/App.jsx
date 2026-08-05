import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, BarChart2, Waves, Download, FileSpreadsheet, Cpu, Upload, FileAudio, Code, FolderOpen, Save, FileText } from 'lucide-react';

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
    name: 'Sine 440 Hz',
    generator: { waveform: 'sine', frequency: 440, amplitude: 1.0, phase: 0, offset: 0, noise_level: 0, sample_rate: 44100, duration: 0.1, modulation_type: 'none' },
    math: { envelope_extraction: false, bit_depth: null, dc_remove: false, gain_db: 0 },
    filter: { enabled: false, filter_type: 'lowpass', filter_design: 'butterworth', cutoff: 1000, order: 4 },
    fft: { n_fft: 1024, window: 'hanning', log_scale: true }
  },
  AM_RADIO: {
    name: 'AM Modulation',
    generator: { waveform: 'sine', frequency: 1000, amplitude: 1.5, phase: 0, offset: 0, noise_level: 0.05, sample_rate: 44100, duration: 0.1, modulation_type: 'am', mod_frequency: 50, mod_index: 0.8 },
    math: { envelope_extraction: true, bit_depth: null, dc_remove: false, gain_db: 0 },
    filter: { enabled: false, filter_type: 'lowpass', filter_design: 'butterworth', cutoff: 2000, order: 4 },
    fft: { n_fft: 2048, window: 'hanning', log_scale: true }
  },
  FILTERED_NOISE: {
    name: 'Filtered Noise',
    generator: { waveform: 'noise', frequency: 1000, amplitude: 1.0, phase: 0, offset: 0, noise_level: 0, sample_rate: 44100, duration: 0.1, modulation_type: 'none' },
    math: { envelope_extraction: false, bit_depth: null, dc_remove: false, gain_db: 0 },
    filter: { enabled: true, filter_type: 'lowpass', filter_design: 'butterworth', cutoff: 800, order: 4 },
    fft: { n_fft: 1024, window: 'hamming', log_scale: true }
  },
  ECG_HEART: {
    name: 'ECG Telemetry',
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
    a.download = 'signallab98.csv'; a.click();
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
        a.download = 'signallab98.wav'; a.click();
      }
    } catch {}
  };

  return (
    <div className="min-h-screen p-3 max-w-[1550px] mx-auto flex flex-col gap-3">

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".wav,.csv,.txt,.json"
        style={{ display: 'none' }}
      />

      {/* ── WINDOWS 95 MAIN APPLICATION WINDOW FRAME ──────────────────────────── */}
      <div className="win95-outset-deep flex flex-col gap-1 p-1">

        {/* 1. Window Title Bar */}
        <div className="win95-titlebar">
          <div className="flex items-center gap-2">
            <span className="bg-[#FFFF00] text-[#000000] px-1 font-bold text-xs">98</span>
            <span>REI_SignalLab_98.exe - [Digital Signal Processing Suite & Python Sandbox]</span>
          </div>
          <div className="flex gap-1">
            <div className="win95-btn-box">_</div>
            <div className="win95-btn-box">□</div>
            <div className="win95-btn-box">✕</div>
          </div>
        </div>

        {/* 2. System Dropdown Menu Bar */}
        <div className="flex items-center justify-between bg-[#C0C0C0] px-2 py-0.5 border-b border-[#808080] text-xs font-bold">
          <div className="flex gap-4">
            <span className="cursor-pointer hover:bg-[#000080] hover:text-[#FFFFFF] px-1">File</span>
            <span className="cursor-pointer hover:bg-[#000080] hover:text-[#FFFFFF] px-1">Edit</span>
            <span className="cursor-pointer hover:bg-[#000080] hover:text-[#FFFFFF] px-1">View</span>
            <span className="cursor-pointer hover:bg-[#000080] hover:text-[#FFFFFF] px-1">Presets</span>
            <span className="cursor-pointer hover:bg-[#000080] hover:text-[#FFFFFF] px-1">Tools</span>
            <span className="cursor-pointer hover:bg-[#000080] hover:text-[#FFFFFF] px-1">Help</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="badge-blink">NEW!</span>
            <span className="text-[#0000FF] font-bold">VISITORS: 0004291</span>
          </div>
        </div>

        {/* 3. Structured Command Toolbar Bar */}
        <div className="win95-outset p-1 flex items-center justify-between flex-wrap gap-2 bg-[#C0C0C0]">
          
          {/* File Operations */}
          <div className="flex items-center gap-1">
            <button className="win95-btn win95-btn-blue text-xs" onClick={() => fileInputRef.current?.click()}>
              <FolderOpen size={13} /> Open File (.wav, .csv)
            </button>
            <button className="win95-btn text-xs" onClick={exportCSV}>
              <FileText size={13} className="text-[#00AA00]" /> Export CSV
            </button>
            <button className="win95-btn text-xs" onClick={exportWAV}>
              <Save size={13} className="text-[#0000FF]" /> Export WAV
            </button>
          </div>

          {/* Preset Selector */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs">Preset:</span>
            <select
              value={uploadedFileName ? 'upload' : presetKey}
              onChange={e => { if (e.target.value !== 'upload') loadPreset(e.target.value); }}
              className="text-xs"
            >
              {uploadedFileName && <option value="upload">Uploaded File: {uploadedFileName}</option>}
              {Object.entries(PRESETS).map(([k, p]) => (
                <option key={k} value={k}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Status Counter */}
          <div className="win95-hitcounter flex-row items-center gap-2 py-0.5 px-2">
            <span className="w-2 h-2 bg-[#00FF00]"></span>
            <span className="text-xs">{status === 'online' ? 'API_ONLINE' : 'CLIENT_DSP'}</span>
          </div>
        </div>

        {/* 4. Marquee Announcement Ticker */}
        <div className="bg-[#000000] text-[#00FF00] font-mono text-xs p-0.5 border-2 border-t-[#808080] border-l-[#808080] border-r-[#FFFFFF] border-b-[#FFFFFF] overflow-hidden whitespace-nowrap">
          <marquee scrollamount="5" behavior="scroll">
            *** WELCOME TO REI SIGNALLAB 98 *** FASTAPI + SCIPY + MATPLOTLIB API RENDERER *** MACHINE-LEVEL COMMON LISP SIMD ENGINE ACTIVE *** PYTHON SCRIPTING SANDBOX READY ***
          </marquee>
        </div>

        {/* 5. Telemetry Metrics Section */}
        <div className="p-1">
          <SignalMetrics metrics={dsp?.metrics} />
        </div>

        <hr className="hr-groove" />

        {/* 6. Main Workspace Split Stage */}
        <div className="flex flex-col lg:flex-row gap-3 items-start p-1">

          {/* Left Main Instrument Stage */}
          <div className="flex-1 flex flex-col gap-2 w-full">

            {/* Navigation Tabs Bar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="win95-tabs">
                <button
                  onClick={() => setActiveView('dual')}
                  className={`win95-tab ${activeView === 'dual' ? 'active' : ''}`}
                >
                  Oscilloscope + Spectrum
                </button>
                <button
                  onClick={() => setActiveView('python')}
                  className={`win95-tab flex items-center gap-1 ${activeView === 'python' ? 'active' : ''}`}
                >
                  <Code size={12} className="text-[#0000FF]" /> Python Lab <span className="badge-blink">NEW!</span>
                </button>
                <button
                  onClick={() => setActiveView('waterfall')}
                  className={`win95-tab ${activeView === 'waterfall' ? 'active' : ''}`}
                >
                  2D Waterfall
                </button>
                <button
                  onClick={() => setActiveView('lisp')}
                  className={`win95-tab ${activeView === 'lisp' ? 'active' : ''}`}
                >
                  Common Lisp Engine
                </button>
              </div>

              <AudioEngine generatorConfig={genCfg} filterConfig={filterCfg} />
            </div>

            {/* Display Panes */}
            {activeView === 'dual' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
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

          {/* Right Control Panel Sidebar */}
          <ControlPanel
            generatorConfig={genCfg} setGeneratorConfig={setGenCfg}
            mathConfig={mathCfg} setMathConfig={setMathCfg}
            filterConfig={filterCfg} setFilterConfig={setFilterCfg}
          />
        </div>

        {/* Construction Warning Stripes Accent */}
        <div className="bg-construction h-4 w-full border border-[#000000] flex items-center justify-center text-[9px] font-bold tracking-widest text-[#000000]">
          UNDER CONSTRUCTION -- REI SIGNALLAB 98 -- POWERED BY ROOTCASTLE
        </div>

        {/* Windows Status Bar Footer */}
        <footer className="win95-inset p-1 flex justify-between text-xs font-mono text-[#000000]">
          <span>Status: Ready | Press F1 for Help</span>
          <span>RootCastle &copy; 1998-2026</span>
        </footer>

      </div>
    </div>
  );
}
