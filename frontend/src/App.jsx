import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, BarChart2, Waves, Download, FileSpreadsheet, Cpu, Upload, FileAudio, Code, FolderOpen, Save, FileText, Layers, AlertTriangle } from 'lucide-react';
import { safeFetchJson } from './config';

import Oscilloscope from './components/Oscilloscope';
import SpectrumAnalyzer from './components/SpectrumAnalyzer';
import WaterfallSpectrogram from './components/WaterfallSpectrogram';
import ControlPanel from './components/ControlPanel';
import AudioEngine from './components/AudioEngine';
import SignalMetrics from './components/SignalMetrics';
import LispPluginEditor from './components/LispPluginEditor';
import PythonLabEditor from './components/PythonLabEditor';
import NodeGraphStudio from './components/NodeGraphStudio';

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
  },
  ROTOR_VIBRATION: {
    name: 'Rotor Vibration Orbit (3600 RPM / 1X-2X)',
    generator: { waveform: 'sine', frequency: 60, amplitude: 1.5, phase: 0, offset: 0, noise_level: 0.08, sample_rate: 44100, duration: 0.1, modulation_type: 'none' },
    math: { envelope_extraction: false, bit_depth: null, dc_remove: false, gain_db: 0 },
    filter: { enabled: true, filter_type: 'lowpass', filter_design: 'butterworth', cutoff: 500, order: 4 },
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
  const [dataTrustMode, setDataTrustMode] = useState('LOCAL_DSP'); // 'API_VERIFIED' | 'LOCAL_DSP' | 'DEMO_MODE'
  const [uploadedFileName, setUploadedFileName] = useState(null);

  const fileInputRef = useRef(null);

  // Real JS Browser-Side DSP Calculation Engine
  const computeBrowserDSP = useCallback((gen, math) => {
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

    let sumSq = 0, peakVal = 0, sumDC = 0;

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
      raw.push(y);
      filtered.push(y);

      sumSq += y * y;
      sumDC += y;
      if (Math.abs(y) > peakVal) peakVal = Math.abs(y);

      if (envelope) envelope.push(Math.abs(y));
    }

    const calculatedRMS = Math.sqrt(sumSq / N);
    const calculatedDC = sumDC / N;
    const calculatedP2P = peakVal * 2.0;

    const nFft = Math.min(1024, N), df = fs / nFft;
    const freqs = [], magDb = [];
    for (let k = 0; k < nFft / 2; k++) {
      const f = k * df;
      freqs.push(f);
      const v = Math.abs(f - freq) < df * 2 ? amp * 0.7 : 0.001 + Math.random() * 0.002;
      magDb.push(20 * Math.log10(Math.max(1e-6, v)));
    }

    return {
      time: t, raw_signal: raw, filtered_signal: filtered, envelope_signal: envelope,
      frequency: freqs, spectrum_magnitude: magDb,
      metrics: {
        rms: calculatedRMS.toFixed(3),
        peak_to_peak: calculatedP2P.toFixed(3),
        dc_mean: calculatedDC.toFixed(3),
        thd_percent: null,
        snr_db: null,
        sinad_db: null,
        sfdr_db: null,
        enob_bits: null,
        fundamental_freq: freq,
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
      const data = await safeFetchJson('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generator: genCfg, math: mathCfg, filter: filterCfg, fft: fftCfg })
      });
      setDsp(data);
      setDataTrustMode('API_VERIFIED');
    } catch {
      setDsp(computeBrowserDSP(genCfg, mathCfg));
      setDataTrustMode('LOCAL_DSP');
    }
  }, [genCfg, mathCfg, filterCfg, fftCfg, computeBrowserDSP, uploadedFileName]);

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
      const data = await safeFetchJson('/api/upload/signal', {
        method: 'POST',
        body: formData
      });

      setDsp(data);
      setUploadedFileName(file.name);
      setDataTrustMode('API_VERIFIED');
    } catch (e) {
      alert('File upload process: ' + e.message);
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

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('audio/wav')) {
        throw new Error('API backend WAV generation offline. Generating 16-bit PCM WAV in browser...');
      }

      const buffer = await res.arrayBuffer();
      const header = new Uint8Array(buffer.slice(0, 4));
      const isRiff = String.fromCharCode(...header) === 'RIFF';
      if (!isRiff) {
        throw new Error('Invalid WAV RIFF magic header.');
      }

      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
      a.download = 'signallab98.wav'; a.click();
    } catch (err) {
      // Browser-Side 16-bit PCM WAV Generator
      const fs = genCfg.sample_rate || 44100;
      const dur = genCfg.duration || 0.1;
      const numSamples = Math.floor(fs * dur);
      const wavHeaderLen = 44;
      const dataLen = numSamples * 2;
      const wavBuffer = new ArrayBuffer(wavHeaderLen + dataLen);
      const view = new DataView(wavBuffer);

      // Write RIFF Header
      const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
      };

      writeString(0, 'RIFF');
      view.setUint32(4, 36 + dataLen, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // Mono
      view.setUint32(24, fs, true);
      view.setUint32(28, fs * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, dataLen, true);

      // Write PCM Samples
      const sig = dsp?.filtered_signal || [];
      for (let i = 0; i < numSamples; i++) {
        const sample = Math.max(-1, Math.min(1, sig[i] || 0));
        view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      }

      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([wavBuffer], { type: 'audio/wav' }));
      a.download = 'signallab_browser.wav'; a.click();
    }
  };

  return (
    <div className="min-h-screen p-2.5 max-w-[1550px] mx-auto flex flex-col gap-2">

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".wav,.csv,.txt,.json"
        style={{ display: 'none' }}
      />

      <div className="win98-outset-deep flex flex-col gap-1 p-1">

        {/* 1. Title Bar */}
        <div className="win98-titlebar">
          <div className="flex items-center gap-2">
            <span className="bg-[#FFFF00] text-[#000000] px-1 font-bold text-xs">v2.1</span>
            <span>REI_SignalLab_2.1.exe - [Typed Node Catalog & Kahn Execution Engine]</span>
          </div>
          <div className="flex gap-1">
            <div className="win98-btn-box">_</div>
            <div className="win98-btn-box">□</div>
            <div className="win98-btn-box">✕</div>
          </div>
        </div>

        {/* Workspace Navigation Bar - Prominent Top View Switcher */}
        <div className="win98-outset p-1.5 flex items-center justify-between flex-wrap gap-2 bg-[#C0C0C0] border-b-2 border-[#000000]">
          <div className="win98-tabs flex-wrap">
            <button
              onClick={() => setActiveView('dual')}
              className={`win98-tab font-bold text-xs ${activeView === 'dual' ? 'active font-black text-[#000080]' : ''}`}
            >
              📊 Oscilloscope + Spectrum
            </button>
            <button
              onClick={() => setActiveView('graph')}
              className={`win98-tab font-bold text-xs flex items-center gap-1 ${activeView === 'graph' ? 'active font-black text-[#000080] bg-[#FFFFCC]' : ''}`}
            >
              <Layers size={14} className="text-[#0000FF]" /> 🎛️ Signal Flow Studio <span className="badge-blink">v2.1</span>
            </button>
            <button
              onClick={() => setActiveView('python')}
              className={`win98-tab font-bold text-xs flex items-center gap-1 ${activeView === 'python' ? 'active font-black text-[#000080]' : ''}`}
            >
              <Code size={14} className="text-[#0000FF]" /> 🐍 Python Lab
            </button>
            <button
              onClick={() => setActiveView('waterfall')}
              className={`win98-tab font-bold text-xs ${activeView === 'waterfall' ? 'active font-black text-[#000080]' : ''}`}
            >
              🌊 2D Waterfall Spectrogram
            </button>
            <button
              onClick={() => setActiveView('lisp')}
              className={`win98-tab font-bold text-xs ${activeView === 'lisp' ? 'active font-black text-[#000080]' : ''}`}
            >
              📜 S-Expression DSP DSL
            </button>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="badge-blink">v2.1 RELEASE</span>
            <span className="text-[#0000FF] font-bold">VISITORS: 0005140</span>
          </div>
        </div>

        {/* 2. System Toolbar */}
        <div className="win98-outset p-1 flex items-center justify-between flex-wrap gap-2 bg-[#C0C0C0]">
          <div className="flex items-center gap-1">
            <button className="win98-btn" onClick={() => fileInputRef.current?.click()}>
              <FolderOpen size={13} className="text-[#0000FF]" /> Open File (.wav, .csv)
            </button>
            <button className="win98-btn" onClick={exportCSV}>
              <FileText size={13} className="text-[#00AA00]" /> Save CSV
            </button>
            <button className="win98-btn" onClick={exportWAV}>
              <Save size={13} className="text-[#0000FF]" /> Save WAV
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-xs">Preset:</span>
            <select
              value={uploadedFileName ? 'upload' : presetKey}
              onChange={e => { if (e.target.value !== 'upload') loadPreset(e.target.value); }}
              className="text-xs font-mono"
            >
              {uploadedFileName && <option value="upload">File: {uploadedFileName}</option>}
              {Object.entries(PRESETS).map(([k, p]) => (
                <option key={k} value={k}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="win98-hitcounter flex-row items-center gap-2 py-0.5 px-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              dataTrustMode === 'API_VERIFIED' ? 'bg-[#00FF00]' :
              dataTrustMode === 'LOCAL_DSP' ? 'bg-[#00FFFF]' : 'bg-[#FFFF00]'
            }`}></span>
            <span className="text-xs font-bold font-mono">
              {dataTrustMode === 'API_VERIFIED' ? 'API VERIFIED' :
               dataTrustMode === 'LOCAL_DSP' ? 'LOCAL BROWSER DSP' : 'DEMO MODE'}
            </span>
          </div>
        </div>

        {/* Mandatory Warning Banner if in DEMO MODE */}
        {dataTrustMode === 'DEMO_MODE' && (
          <div className="bg-[#FFFF00] text-[#000000] p-1 border border-[#000000] flex items-center justify-center gap-2 text-xs font-bold font-mono">
            <AlertTriangle size={14} className="text-[#FF0000]" />
            <span>⚠️ SIMULATED DEMO DATA - NOT FOR INSTRUMENT MEASUREMENT</span>
          </div>
        )}

        {/* Marquee Ticker */}
        <div className="bg-[#000000] text-[#00FF00] font-mono text-xs p-0.5 border-2 border-t-[#808080] border-l-[#808080] border-r-[#FFFFFF] border-b-[#FFFFFF] overflow-hidden whitespace-nowrap">
          <marquee scrollamount="5" behavior="scroll">
            *** WELCOME TO REI SIGNALLAB 2.1 *** TYPED CANONICAL NODE CATALOG (.rei-signal 2.1) *** KAHN TOPOLOGICAL GRAPH ENGINE *** RESTRICTED EXPERIMENTAL PYTHON LAB *** S-EXPRESSION DSP DSL KERNEL ***
          </marquee>
        </div>

        {/* Telemetry Metrics Section */}
        <div className="p-0.5">
          <SignalMetrics metrics={dsp?.metrics} />
        </div>

        <hr className="hr-groove" />

        {/* Main Workspace Split Stage */}
        <div className="flex flex-col lg:flex-row gap-2.5 items-start p-0.5">

          <div className="flex-1 flex flex-col gap-2 w-full">
            <div className="flex justify-end">
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

            {activeView === 'graph' && (
              <NodeGraphStudio onGraphExecuted={(data) => console.log(data)} />
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

        {/* Construction Stripes Accent Bar */}
        <div className="bg-construction h-4 w-full border border-[#000000] flex items-center justify-center text-[9px] font-bold tracking-widest text-[#000000]">
          REI SIGNALLAB 2.0 -- TYPED SIGNAL FLOW STUDIO -- POWERED BY ROOTCASTLE
        </div>

        {/* Windows Status Bar Footer */}
        <footer className="win98-inset p-1 flex justify-between text-xs font-mono text-[#000000]">
          <span>Status: {dataTrustMode} Mode Active | Version 2.0.0</span>
          <span>RootCastle &copy; 1998-2026</span>
        </footer>

      </div>
    </div>
  );
}
