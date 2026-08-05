import React, { useState } from 'react';
import { Radio, Filter, Cpu, Sparkles, Sliders, Hash, ShieldCheck, Zap } from 'lucide-react';

export default function ControlPanel({
  generatorConfig,
  setGeneratorConfig,
  mathConfig,
  setMathConfig,
  filterConfig,
  setFilterConfig,
  fftConfig,
  setFFTConfig
}) {
  const [controlTab, setControlTab] = useState('gen'); // gen, mod, math, filter, fft

  const updateGen = (key, val) => {
    setGeneratorConfig(prev => ({ ...prev, [key]: val }));
  };

  const updateMath = (key, val) => {
    setMathConfig(prev => ({ ...prev, [key]: val }));
  };

  const updateFilter = (key, val) => {
    setFilterConfig(prev => ({ ...prev, [key]: val }));
  };

  const updateFFT = (key, val) => {
    setFFTConfig(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="glass-panel p-4 flex flex-col gap-4">
      {/* Studio Instrument Tab Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 text-white font-semibold text-sm tracking-wide">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>STUDIO INSTRUMENTATION & DSP CONTROLS</span>
        </div>

        {/* Tab Selection */}
        <div className="apple-segmented flex-wrap">
          <button
            onClick={() => setControlTab('gen')}
            className={`apple-segmented-item flex items-center gap-1.5 ${controlTab === 'gen' ? 'active' : ''}`}
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" /> Signal Generator
          </button>

          <button
            onClick={() => setControlTab('mod')}
            className={`apple-segmented-item flex items-center gap-1.5 ${controlTab === 'mod' ? 'active' : ''}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> AM/FM Modulator
          </button>

          <button
            onClick={() => setControlTab('math')}
            className={`apple-segmented-item flex items-center gap-1.5 ${controlTab === 'math' ? 'active' : ''}`}
          >
            <Hash className="w-3.5 h-3.5 text-amber-400" /> Math & Quantizer
          </button>

          <button
            onClick={() => setControlTab('filter')}
            className={`apple-segmented-item flex items-center gap-1.5 ${controlTab === 'filter' ? 'active' : ''}`}
          >
            <Filter className="w-3.5 h-3.5 text-emerald-400" /> Digital Filter
          </button>

          <button
            onClick={() => setControlTab('fft')}
            className={`apple-segmented-item flex items-center gap-1.5 ${controlTab === 'fft' ? 'active' : ''}`}
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400" /> FFT & Window
          </button>
        </div>
      </div>

      {/* TAB CONTENT PANES */}

      {/* 1. SIGNAL GENERATOR TAB */}
      {controlTab === 'gen' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-300 font-medium">Waveform Pattern</label>
            <select
              value={generatorConfig.waveform}
              onChange={(e) => updateGen('waveform', e.target.value)}
              className="w-full bg-black/60 border border-white/15 text-cyan-300 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="sine">Sine Wave</option>
              <option value="square">Square Wave</option>
              <option value="triangle">Triangle Wave</option>
              <option value="sawtooth">Sawtooth Wave</option>
              <option value="noise">Gaussian White Noise</option>
              <option value="pink_noise">1/f Pink Noise</option>
              <option value="chirp">Frequency Chirp Sweep</option>
              <option value="ecg">Synthetic ECG Cardiac</option>
              <option value="pulse">Pulse Train (10% Duty)</option>
              <option value="multitone">Multi-tone Harmonic</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-300">Frequency (f)</span>
              <span className="text-cyan-400 font-semibold">{generatorConfig.frequency} Hz</span>
            </div>
            <input
              type="range"
              min="20"
              max="5000"
              step="5"
              value={generatorConfig.frequency}
              onChange={(e) => updateGen('frequency', parseFloat(e.target.value))}
              className="accent-cyan-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-300">Amplitude (Vpp)</span>
              <span className="text-cyan-400 font-semibold">{generatorConfig.amplitude} V</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="10.0"
              step="0.1"
              value={generatorConfig.amplitude}
              onChange={(e) => updateGen('amplitude', parseFloat(e.target.value))}
              className="accent-cyan-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-300">Additive Noise (σ)</span>
              <span className="text-amber-400 font-semibold">{generatorConfig.noise_level}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="2.0"
              step="0.05"
              value={generatorConfig.noise_level}
              onChange={(e) => updateGen('noise_level', parseFloat(e.target.value))}
              className="accent-amber-500"
            />
          </div>
        </div>
      )}

      {/* 2. MODULATOR TAB (Mitov Modulator) */}
      {controlTab === 'mod' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-300 font-medium">Modulation Mode</label>
            <select
              value={generatorConfig.modulation_type || 'none'}
              onChange={(e) => updateGen('modulation_type', e.target.value)}
              className="w-full bg-black/60 border border-white/15 text-indigo-300 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="none">None (Unmodulated Carrier)</option>
              <option value="am">AM (Amplitude Modulation)</option>
              <option value="fm">FM (Frequency Modulation)</option>
              <option value="pm">PM (Phase Modulation)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-300">Modulator Frequency (fm)</span>
              <span className="text-indigo-400 font-semibold">{generatorConfig.mod_frequency || 20} Hz</span>
            </div>
            <input
              type="range"
              min="1"
              max="500"
              step="1"
              disabled={generatorConfig.modulation_type === 'none'}
              value={generatorConfig.mod_frequency || 20}
              onChange={(e) => updateGen('mod_frequency', parseFloat(e.target.value))}
              className="accent-indigo-500 disabled:opacity-40"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-300">Modulation Index (m)</span>
              <span className="text-indigo-400 font-semibold">{generatorConfig.mod_index || 0.5}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="3.0"
              step="0.05"
              disabled={generatorConfig.modulation_type === 'none'}
              value={generatorConfig.mod_index || 0.5}
              onChange={(e) => updateGen('mod_index', parseFloat(e.target.value))}
              className="accent-indigo-500 disabled:opacity-40"
            />
          </div>
        </div>
      )}

      {/* 3. MATH & QUANTIZER TAB (Mitov Signal Math) */}
      {controlTab === 'math' && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={mathConfig.envelope_extraction}
                onChange={(e) => updateMath('envelope_extraction', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
            <span className="text-xs text-amber-300 font-mono">Hilbert Envelope Extractor</span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-300 font-medium">Bit Quantizer Simulation</label>
            <select
              value={mathConfig.bit_depth || 'full'}
              onChange={(e) => updateMath('bit_depth', e.target.value === 'full' ? null : parseInt(e.target.value))}
              className="bg-black/60 border border-white/15 text-amber-300 rounded px-2 py-1.5 text-xs font-mono focus:outline-none"
            >
              <option value="full">Full Floating Precision (32-bit)</option>
              <option value="16">16-bit PCM (CD Quality)</option>
              <option value="12">12-bit ADC</option>
              <option value="8">8-bit Quantizer (Lo-Fi)</option>
              <option value="4">4-bit Crusher</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={mathConfig.dc_remove}
                onChange={(e) => updateMath('dc_remove', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
            <span className="text-xs text-gray-300 font-mono">DC Offset Remover</span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-300">Signal Gain (dB)</span>
              <span className="text-amber-400 font-semibold">{mathConfig.gain_db || 0} dB</span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              step="1"
              value={mathConfig.gain_db || 0}
              onChange={(e) => updateMath('gain_db', parseFloat(e.target.value))}
              className="accent-amber-500"
            />
          </div>
        </div>
      )}

      {/* 4. DIGITAL FILTER TAB */}
      {controlTab === 'filter' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-300 font-medium">Response Type</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterConfig.enabled}
                  onChange={(e) => updateFilter('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            <select
              value={filterConfig.filter_type}
              disabled={!filterConfig.enabled}
              onChange={(e) => updateFilter('filter_type', e.target.value)}
              className="bg-black/60 border border-white/15 text-emerald-300 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none disabled:opacity-50"
            >
              <option value="lowpass">LowPass</option>
              <option value="highpass">HighPass</option>
              <option value="bandpass">BandPass</option>
              <option value="bandstop">BandStop</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-300 font-medium">Topology Design</label>
            <select
              value={filterConfig.filter_design}
              disabled={!filterConfig.enabled}
              onChange={(e) => updateFilter('filter_design', e.target.value)}
              className="bg-black/60 border border-white/15 text-emerald-300 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none disabled:opacity-50"
            >
              <option value="butterworth">Butterworth IIR</option>
              <option value="chebyshev1">Chebyshev Type I</option>
              <option value="chebyshev2">Chebyshev Type II</option>
              <option value="elliptic">Elliptic (Cauer)</option>
              <option value="bessel">Bessel Linear Phase</option>
              <option value="fir_window">Windowed FIR</option>
              <option value="median">Median Non-Linear</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-300">Cutoff (Fc)</span>
              <span className="text-emerald-400 font-semibold">{filterConfig.cutoff} Hz</span>
            </div>
            <input
              type="range"
              min="50"
              max="10000"
              step="25"
              disabled={!filterConfig.enabled}
              value={filterConfig.cutoff}
              onChange={(e) => updateFilter('cutoff', parseFloat(e.target.value))}
              className="accent-emerald-500 disabled:opacity-40"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-300">Order (N)</span>
              <span className="text-white font-semibold">{filterConfig.order}th Order</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              disabled={!filterConfig.enabled}
              value={filterConfig.order}
              onChange={(e) => updateFilter('order', parseInt(e.target.value))}
              className="accent-emerald-500 disabled:opacity-40"
            />
          </div>
        </div>
      )}

      {/* 5. FFT & WINDOW TAB */}
      {controlTab === 'fft' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-300 font-medium">Window Taper Function</label>
            <select
              value={fftConfig.window}
              onChange={(e) => updateFFT('window', e.target.value)}
              className="w-full bg-black/60 border border-white/15 text-purple-300 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-purple-500"
            >
              <option value="hanning">Hanning (General Purpose)</option>
              <option value="hamming">Hamming (Harmonic Resolution)</option>
              <option value="blackman">Blackman (High Selectivity)</option>
              <option value="kaiser">Kaiser Adjustable Window</option>
              <option value="flattop">FlatTop (Precision Magnitude)</option>
              <option value="rectangular">Rectangular (None)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-300 font-medium">FFT Resolution</label>
            <select
              value={fftConfig.n_fft}
              onChange={(e) => updateFFT('n_fft', parseInt(e.target.value))}
              className="w-full bg-black/60 border border-white/15 text-purple-300 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-purple-500"
            >
              <option value="256">256 Points (Real-Time)</option>
              <option value="512">512 Points</option>
              <option value="1024">1024 Points (Standard)</option>
              <option value="2048">2048 Points (High Resolution)</option>
              <option value="4096">4096 Points (Ultra Sharp)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-300">Kaiser Beta (β)</span>
              <span className="text-purple-300 font-semibold">{fftConfig.kaiser_beta || 14}</span>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              step="1"
              value={fftConfig.kaiser_beta || 14}
              onChange={(e) => updateFFT('kaiser_beta', parseFloat(e.target.value))}
              className="accent-purple-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
