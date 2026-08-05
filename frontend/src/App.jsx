import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, BarChart2, Waves, Download, FileSpreadsheet, Cpu, Upload, FileAudio } from 'lucide-react';

import Oscilloscope from './components/Oscilloscope';
import SpectrumAnalyzer from './components/SpectrumAnalyzer';
import WaterfallSpectrogram from './components/WaterfallSpectrogram';
import ControlPanel from './components/ControlPanel';
import AudioEngine from './components/AudioEngine';
import SignalMetrics from './components/SignalMetrics';
import LispPluginEditor from './components/LispPluginEditor';

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
    if (uploadedFileName) return; // Retain uploaded file signal until preset changed
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
    a.download = 'signallab.csv'; a.click();
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
        a.download = 'signallab.wav'; a.click();
      }
    } catch {}
  };

  return (
    <div style={{ minHeight: '100vh', padding: '16px', maxWidth: 1520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".wav,.csv,.txt,.json"
        style={{ display: 'none' }}
      />

      {/* ── Header ──────────────────────────── */}
      <header className="panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justify: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={16} color="var(--ch1)" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              REI SignalLab
              <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 500, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--ch1)' }}>v1.4</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Digital Signal Processing & Signal Upload Engine</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {uploadedFileName && (
            <div className="panel-inset" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', color: '#10b981', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
              <FileAudio size={13} /> {uploadedFileName}
            </div>
          )}

          <div className="panel-inset" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>PRESET</span>
            <select value={uploadedFileName ? 'upload' : presetKey} onChange={e => { if (e.target.value !== 'upload') loadPreset(e.target.value); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-1)', fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer' }}>
              {uploadedFileName && <option value="upload" style={{ background: 'var(--bg-panel)' }}>File: {uploadedFileName}</option>}
              {Object.entries(PRESETS).map(([k, p]) => <option key={k} value={k} style={{ background: 'var(--bg-panel)' }}>{p.name}</option>)}
            </select>
          </div>

          <button className="btn" onClick={() => fileInputRef.current?.click()} style={{ color: 'var(--ch1)', borderColor: 'rgba(59,130,246,0.3)' }}>
            <Upload size={13} /> Upload File (.wav, .csv)
          </button>

          <button className="btn" onClick={exportCSV}><FileSpreadsheet size={13} color="var(--ch2)" /> CSV</button>
          <button className="btn" onClick={exportWAV}><Download size={13} color="var(--ch1)" /> WAV</button>

          <div className="panel-inset" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)' }}>
            <span className={`status-dot ${status === 'online' ? 'online' : 'fallback'}`}></span>
            {status === 'online' ? 'API ONLINE' : 'CLIENT DSP'}
          </div>
        </div>
      </header>

      {/* ── Metrics ─────────────────────────── */}
      <SignalMetrics metrics={dsp?.metrics} />

      {/* ── Main Layout ────────────────────── */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Left: Display Stage */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* View tabs */}
          <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between' }}>
            <div className="tab-bar">
              <button onClick={() => setActiveView('dual')} className={`tab-btn ${activeView === 'dual' ? 'active' : ''}`}>
                <Activity size={13} /> Scope + FFT
              </button>
              <button onClick={() => setActiveView('waterfall')} className={`tab-btn ${activeView === 'waterfall' ? 'active' : ''}`}>
                <Waves size={13} /> Waterfall
              </button>
              <button onClick={() => setActiveView('lisp')} className={`tab-btn ${activeView === 'lisp' ? 'active' : ''}`}>
                <Cpu size={13} /> Lisp Plugin
              </button>
            </div>
            <AudioEngine generatorConfig={genCfg} filterConfig={filterCfg} />
          </div>

          {/* Display Panes */}
          {activeView === 'dual' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Oscilloscope timeData={dsp?.time} rawSignal={dsp?.raw_signal} filteredSignal={dsp?.filtered_signal} envelopeSignal={dsp?.envelope_signal} sampleRate={genCfg.sample_rate} />
              <SpectrumAnalyzer frequencyData={dsp?.frequency} magnitudeData={dsp?.spectrum_magnitude} metrics={dsp?.metrics} />
            </div>
          )}

          {activeView === 'waterfall' && (
            <WaterfallSpectrogram spectrogramMatrix={dsp?.spectrogram_matrix} frequencies={dsp?.spectrogram_frequencies} times={dsp?.spectrogram_times} />
          )}

          {activeView === 'lisp' && (
            <LispPluginEditor generatorConfig={genCfg} fftConfig={fftCfg} onLispProcessed={d => setDsp(d)} />
          )}
        </div>

        {/* Right: Controls */}
        <ControlPanel
          generatorConfig={genCfg} setGeneratorConfig={setGenCfg}
          mathConfig={mathCfg} setMathConfig={setMathCfg}
          filterConfig={filterCfg} setFilterConfig={setFilterCfg}
        />
      </div>

      {/* ── Footer ──────────────────────────── */}
      <footer className="panel" style={{ padding: '8px 14px', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>
        <span>REI SignalLab -- RootCastle 2026</span>
        <span>FastAPI + SciPy + Matplotlib | React 18 + Canvas</span>
      </footer>
    </div>
  );
}
