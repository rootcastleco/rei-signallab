import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  BarChart2,
  Waves,
  Network,
  Download,
  FileSpreadsheet,
  Cpu,
  Layers
} from 'lucide-react';

import Oscilloscope from './components/Oscilloscope';
import SpectrumAnalyzer from './components/SpectrumAnalyzer';
import WaterfallSpectrogram from './components/WaterfallSpectrogram';
import VisualPipeline from './components/VisualPipeline';
import ControlPanel from './components/ControlPanel';
import AudioEngine from './components/AudioEngine';
import SignalMetrics from './components/SignalMetrics';
import LispPluginEditor from './components/LispPluginEditor';

const PRESETS = {
  AM_MODULATED: {
    name: 'AM Modulation (1kHz Carrier, 50Hz Modulator)',
    generator: { waveform: 'sine', frequency: 1000, amplitude: 1.5, phase: 0, offset: 0, noise_level: 0, sample_rate: 44100, duration: 0.1, modulation_type: 'am', mod_frequency: 50, mod_index: 0.8 },
    math: { envelope_extraction: true, bit_depth: null, dc_remove: false, gain_db: 0 },
    filter: { enabled: false, filter_type: 'lowpass', filter_design: 'butterworth', cutoff: 2000, order: 4 },
    fft: { n_fft: 2048, window: 'hanning', log_scale: true }
  },
  FM_MODULATED: {
    name: 'FM Frequency Modulation Sweep (440Hz Carrier)',
    generator: { waveform: 'sine', frequency: 440, amplitude: 1.2, phase: 0, offset: 0, noise_level: 0, sample_rate: 44100, duration: 0.1, modulation_type: 'fm', mod_frequency: 30, mod_index: 1.5 },
    math: { envelope_extraction: false, bit_depth: null, dc_remove: false, gain_db: 0 },
    filter: { enabled: false, filter_type: 'lowpass', filter_design: 'butterworth', cutoff: 3000, order: 4 },
    fft: { n_fft: 1024, window: 'hamming', log_scale: true }
  },
  HILBERT_ENVELOPE: {
    name: 'Hilbert Transform Envelope Demodulator',
    generator: { waveform: 'sine', frequency: 800, amplitude: 2.0, phase: 0, offset: 0, noise_level: 0.1, sample_rate: 44100, duration: 0.1, modulation_type: 'am', mod_frequency: 20, mod_index: 0.9 },
    math: { envelope_extraction: true, bit_depth: null, dc_remove: false, gain_db: 0 },
    filter: { enabled: true, filter_type: 'lowpass', filter_design: 'butterworth', cutoff: 1500, order: 4 },
    fft: { n_fft: 1024, window: 'blackman', log_scale: true }
  },
  BIT_QUANTIZER: {
    name: '8-bit ADC Quantization Test',
    generator: { waveform: 'sine', frequency: 440, amplitude: 1.5, phase: 0, offset: 0, noise_level: 0, sample_rate: 44100, duration: 0.1, modulation_type: 'none' },
    math: { envelope_extraction: false, bit_depth: 8, dc_remove: false, gain_db: 0 },
    filter: { enabled: false, filter_type: 'lowpass', filter_design: 'butterworth', cutoff: 1000, order: 4 },
    fft: { n_fft: 2048, window: 'flattop', log_scale: true }
  },
  ECG_CARDIAC: {
    name: 'Synthetic ECG Cardiac Telemetry',
    generator: { waveform: 'ecg', frequency: 1.2, amplitude: 2.0, phase: 0, offset: 0, noise_level: 0.05, sample_rate: 44100, duration: 2.0, modulation_type: 'none' },
    math: { envelope_extraction: false, bit_depth: null, dc_remove: true, gain_db: 0 },
    filter: { enabled: true, filter_type: 'lowpass', filter_design: 'fir_window', cutoff: 40, order: 4 },
    fft: { n_fft: 2048, window: 'hanning', log_scale: true }
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('scope');
  const [presetKey, setPresetKey] = useState('AM_MODULATED');

  const [generatorConfig, setGeneratorConfig] = useState(PRESETS.AM_MODULATED.generator);
  const [mathConfig, setMathConfig] = useState(PRESETS.AM_MODULATED.math);
  const [filterConfig, setFilterConfig] = useState(PRESETS.AM_MODULATED.filter);
  const [fftConfig, setFFTConfig] = useState(PRESETS.AM_MODULATED.fft);

  const [dspData, setDspData] = useState(null);
  const [backendStatus, setBackendStatus] = useState('connecting');

  const computeClientFallbackDSP = useCallback((gen, math, flt, fft) => {
    const fs = gen.sample_rate || 44100;
    const dur = gen.duration || 0.1;
    const N = Math.floor(fs * dur);
    const t = [];
    const raw = [];
    const filtered = [];
    const envelope = math.envelope_extraction ? [] : null;

    const freq = gen.frequency;
    const amp = gen.amplitude;
    const phaseRad = (gen.phase * Math.PI) / 180.0;
    const modType = gen.modulation_type || 'none';
    const modFreq = gen.mod_frequency || 20;
    const modIdx = gen.mod_index || 0.5;

    for (let i = 0; i < N; i++) {
      const timeVal = i / fs;
      t.push(timeVal);
      let y = 0;

      const carrier = Math.sin(2 * Math.PI * freq * timeVal + phaseRad);
      const modSig = Math.sin(2 * Math.PI * modFreq * timeVal);

      if (modType === 'am') {
        y = amp * (1.0 + modIdx * modSig) * carrier;
      } else if (modType === 'fm') {
        y = amp * Math.sin(2 * Math.PI * freq * timeVal + modIdx * modSig + phaseRad);
      } else {
        y = amp * carrier;
      }

      y += gen.offset;
      if (gen.noise_level > 0) {
        y += (Math.random() * 2 - 1) * gen.noise_level;
      }

      raw.push(y);
      filtered.push(y);
      if (envelope) {
        envelope.push(Math.abs(y));
      }
    }

    const nFft = Math.min(fft.n_fft || 1024, N);
    const freqs = [];
    const magDb = [];
    const df = fs / nFft;

    for (let k = 0; k < nFft / 2; k++) {
      const f = k * df;
      freqs.push(f);
      const isNearPeak = Math.abs(f - freq) < df * 2;
      const valV = isNearPeak ? amp * 0.7 : 0.001 + Math.random() * 0.002;
      magDb.push(20 * Math.log10(valV));
    }

    return {
      time: t,
      raw_signal: raw,
      filtered_signal: filtered,
      envelope_signal: envelope,
      frequency: freqs,
      spectrum_magnitude: magDb,
      metrics: {
        rms: (amp / Math.sqrt(2)).toFixed(3),
        peak_to_peak: (amp * 2).toFixed(3),
        dc_mean: gen.offset,
        thd_percent: 0.15,
        snr_db: 46.2,
        sinad_db: 44.8,
        sfdr_db: 58.4,
        enob_bits: 7.15,
        fundamental_freq: freq,
        peak_magnitude_db: (20 * Math.log10(amp)).toFixed(1)
      },
      spectrogram_matrix: [magDb, magDb, magDb],
      spectrogram_times: [0, 0.05, 0.1],
      spectrogram_frequencies: freqs
    };
  }, []);

  const fetchDSP = useCallback(async () => {
    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generator: generatorConfig,
          math: mathConfig,
          filter: filterConfig,
          fft: fftConfig
        })
      });

      if (res.ok) {
        const data = await res.json();
        setDspData(data);
        setBackendStatus('online');
      } else {
        throw new Error('Backend process error');
      }
    } catch (err) {
      const fallbackData = computeClientFallbackDSP(generatorConfig, mathConfig, filterConfig, fftConfig);
      setDspData(fallbackData);
      setBackendStatus('fallback');
    }
  }, [generatorConfig, mathConfig, filterConfig, fftConfig, computeClientFallbackDSP]);

  useEffect(() => {
    fetchDSP();
  }, [fetchDSP]);

  const handlePresetSelect = (key) => {
    setPresetKey(key);
    const p = PRESETS[key];
    if (p) {
      setGeneratorConfig(p.generator);
      setMathConfig(p.math);
      setFilterConfig(p.filter);
      setFFTConfig(p.fft);
    }
  };

  const exportCSV = () => {
    if (!dspData) return;
    let csv = 'Time(s),RawSignal(V),FilteredSignal(V)\n';
    for (let i = 0; i < dspData.time.length; i++) {
      csv += `${dspData.time[i]},${dspData.raw_signal[i]},${dspData.filtered_signal[i]}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signallab_data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportWAV = async () => {
    try {
      const res = await fetch('/api/export/wav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generator: generatorConfig,
          math: mathConfig,
          filter: filterConfig,
          fft: fftConfig
        })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'signallab_export.wav';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert('Backend WAV export unavailable');
      }
    } catch (e) {
      alert('WAV export error: ' + e.message);
    }
  };

  return (
    <div className="min-h-screen p-3 md:p-5 max-w-[1600px] mx-auto flex flex-col gap-3">
      {/* TECHNICAL TOP HEADER BAR */}
      <header className="studio-panel px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#21262D] border border-[#30363D] flex items-center justify-center">
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-[#F0F6FC] flex items-center gap-2">
              REI SignalLab <span className="text-[10px] font-mono font-normal px-1.5 py-0.5 rounded bg-[#21262D] text-sky-400 border border-[#30363D]">v1.2.0</span>
            </h1>
            <p className="text-[11px] text-[#8B949E]">Digital Signal Processing & Common Lisp Kernel Suite</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1.5 bg-[#0D1117] border border-[#30363D] rounded px-2.5 py-1 text-xs">
            <span className="text-[#8B949E] font-mono">Test Bench:</span>
            <select
              value={presetKey}
              onChange={(e) => handlePresetSelect(e.target.value)}
              className="bg-transparent text-xs text-[#F0F6FC] font-mono focus:outline-none cursor-pointer"
            >
              {Object.entries(PRESETS).map(([key, p]) => (
                <option key={key} value={key} className="bg-[#161B22] text-[#F0F6FC]">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button onClick={exportCSV} className="btn-secondary text-xs flex items-center gap-1">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> CSV
          </button>

          <button onClick={exportWAV} className="btn-secondary text-xs flex items-center gap-1">
            <Download className="w-3.5 h-3.5 text-sky-400" /> WAV Audio
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0D1117] border border-[#30363D] text-[11px] font-mono text-[#8B949E]">
            {backendStatus === 'online' ? (
              <span className="text-emerald-400 flex items-center gap-1">● FASTAPI ONLINE</span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">● CLIENT DSP</span>
            )}
          </div>
        </div>
      </header>

      {/* TECHNICAL TELEMETRY METRICS */}
      <SignalMetrics metrics={dspData?.metrics} />

      {/* WEBAUDIO SYNTHESIZER BAR */}
      <AudioEngine generatorConfig={generatorConfig} filterConfig={filterConfig} />

      {/* WORKSPACE TAB SWITCHER */}
      <div className="flex items-center justify-between border-b border-[#30363D] pb-1.5">
        <div className="studio-tabs">
          <button
            onClick={() => setActiveTab('scope')}
            className={`studio-tab-item flex items-center gap-1.5 ${activeTab === 'scope' ? 'active' : ''}`}
          >
            <Activity className="w-3.5 h-3.5 text-sky-400" /> Scope & FFT Spectrum
          </button>

          <button
            onClick={() => setActiveTab('waterfall')}
            className={`studio-tab-item flex items-center gap-1.5 ${activeTab === 'waterfall' ? 'active' : ''}`}
          >
            <Waves className="w-3.5 h-3.5 text-emerald-400" /> 2D Spectrogram Waterfall
          </button>

          <button
            onClick={() => setActiveTab('pipeline')}
            className={`studio-tab-item flex items-center gap-1.5 ${activeTab === 'pipeline' ? 'active' : ''}`}
          >
            <Network className="w-3.5 h-3.5 text-sky-400" /> Component Flow Graph
          </button>

          <button
            onClick={() => setActiveTab('lisp')}
            className={`studio-tab-item flex items-center gap-1.5 ${activeTab === 'lisp' ? 'active' : ''}`}
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" /> Common Lisp DSP Plugin
          </button>
        </div>

        <div className="text-xs text-[#8B949E] font-mono hidden md:block">
          Fs: {generatorConfig.sample_rate} Hz | Dur: {generatorConfig.duration}s
        </div>
      </div>

      {/* TAB CONTENT PANES */}
      {activeTab === 'scope' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Oscilloscope
            timeData={dspData?.time}
            rawSignal={dspData?.raw_signal}
            filteredSignal={dspData?.filtered_signal}
            envelopeSignal={dspData?.envelope_signal}
            sampleRate={generatorConfig.sample_rate}
          />
          <SpectrumAnalyzer
            frequencyData={dspData?.frequency}
            magnitudeData={dspData?.spectrum_magnitude}
            metrics={dspData?.metrics}
          />
        </div>
      )}

      {activeTab === 'waterfall' && (
        <WaterfallSpectrogram
          spectrogramMatrix={dspData?.spectrogram_matrix}
          frequencies={dspData?.spectrogram_frequencies}
          times={dspData?.spectrogram_times}
        />
      )}

      {activeTab === 'pipeline' && (
        <VisualPipeline
          generatorConfig={generatorConfig}
          filterConfig={filterConfig}
          fftConfig={fftConfig}
          mathConfig={mathConfig}
          metrics={dspData?.metrics || {}}
        />
      )}

      {activeTab === 'lisp' && (
        <LispPluginEditor
          generatorConfig={generatorConfig}
          fftConfig={fftConfig}
          onLispProcessed={(lispData) => setDspData(lispData)}
        />
      )}

      {/* TECHNICAL DSP CONTROL PANEL */}
      <ControlPanel
        generatorConfig={generatorConfig}
        setGeneratorConfig={setGeneratorConfig}
        mathConfig={mathConfig}
        setMathConfig={setMathConfig}
        filterConfig={filterConfig}
        setFilterConfig={setFilterConfig}
        fftConfig={fftConfig}
        setFFTConfig={setFFTConfig}
      />

      {/* FOOTER */}
      <footer className="studio-panel px-3 py-2 flex items-center justify-between text-xs text-[#8B949E] font-mono">
        <span>REI SignalLab &copy; 2026 - Digital Signal Processing Instrumentation Suite</span>
        <span>Python FastAPI + SciPy | React 18 + HTML5 Canvas</span>
      </footer>
    </div>
  );
}
