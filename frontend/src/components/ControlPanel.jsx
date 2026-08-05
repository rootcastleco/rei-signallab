import React from 'react';
import { Radio, Filter, Sliders, Cpu, Activity, Zap } from 'lucide-react';

export default function ControlPanel({
  generatorConfig,
  setGeneratorConfig,
  filterConfig,
  setFilterConfig,
  fftConfig,
  setFFTConfig
}) {
  const updateGen = (key, val) => {
    setGeneratorConfig(prev => ({ ...prev, [key]: val }));
  };

  const updateFilter = (key, val) => {
    setFilterConfig(prev => ({ ...prev, [key]: val }));
  };

  const updateFFT = (key, val) => {
    setFFTConfig(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. SIGNAL GENERATOR CONTROLS */}
      <div className="glass-panel p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs tracking-wide">
            <Radio className="w-4 h-4" /> SIGNAL GENERATOR
          </div>
          <span className="text-[10px] text-gray-400 font-mono">CH1 SOURCE</span>
        </div>

        {/* Waveform Selector */}
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
            <option value="chirp">Frequency Chirp Sweep</option>
            <option value="ecg">Synthetic ECG Cardiac Wave</option>
            <option value="multitone">Multi-tone Harmonic Composite</option>
          </select>
        </div>

        {/* Frequency Slider & Input */}
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

        {/* Amplitude Slider */}
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

        {/* Phase & Offset */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-gray-400 font-mono">Phase (°)</label>
            <input
              type="number"
              value={generatorConfig.phase}
              onChange={(e) => updateGen('phase', parseFloat(e.target.value) || 0)}
              className="bg-black/50 border border-white/15 text-white rounded px-2 py-1 text-xs font-mono"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-gray-400 font-mono">DC Offset (V)</label>
            <input
              type="number"
              step="0.1"
              value={generatorConfig.offset}
              onChange={(e) => updateGen('offset', parseFloat(e.target.value) || 0)}
              className="bg-black/50 border border-white/15 text-white rounded px-2 py-1 text-xs font-mono"
            />
          </div>
        </div>

        {/* Additive Noise Slider */}
        <div className="flex flex-col gap-1 pt-1">
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

      {/* 2. DIGITAL FILTER CONTROLS */}
      <div className="glass-panel p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wide">
            <Filter className="w-4 h-4" /> DIGITAL DSP FILTER
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={filterConfig.enabled}
              onChange={(e) => updateFilter('enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {/* Filter Type & Design */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-300 font-medium">Response Type</label>
            <select
              value={filterConfig.filter_type}
              disabled={!filterConfig.enabled}
              onChange={(e) => updateFilter('filter_type', e.target.value)}
              className="bg-black/60 border border-white/15 text-emerald-300 rounded px-2 py-1.5 text-xs font-mono focus:outline-none disabled:opacity-50"
            >
              <option value="lowpass">LowPass</option>
              <option value="highpass">HighPass</option>
              <option value="bandpass">BandPass</option>
              <option value="bandstop">BandStop</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-300 font-medium">Topology</label>
            <select
              value={filterConfig.filter_design}
              disabled={!filterConfig.enabled}
              onChange={(e) => updateFilter('filter_design', e.target.value)}
              className="bg-black/60 border border-white/15 text-emerald-300 rounded px-2 py-1.5 text-xs font-mono focus:outline-none disabled:opacity-50"
            >
              <option value="butterworth">Butterworth IIR</option>
              <option value="chebyshev1">Chebyshev Type I</option>
              <option value="chebyshev2">Chebyshev Type II</option>
              <option value="fir_window">Windowed FIR</option>
            </select>
          </div>
        </div>

        {/* Cutoff Frequency 1 */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-gray-300">Cutoff Freq (Fc)</span>
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

        {/* Upper Cutoff (for Bandpass/Bandstop) */}
        {(filterConfig.filter_type === 'bandpass' || filterConfig.filter_type === 'bandstop') && (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-gray-300">Upper Cutoff (Fc2)</span>
              <span className="text-emerald-400 font-semibold">{filterConfig.cutoff2 || 3000} Hz</span>
            </div>
            <input
              type="range"
              min="100"
              max="15000"
              step="50"
              disabled={!filterConfig.enabled}
              value={filterConfig.cutoff2 || 3000}
              onChange={(e) => updateFilter('cutoff2', parseFloat(e.target.value))}
              className="accent-emerald-500 disabled:opacity-40"
            />
          </div>
        )}

        {/* Filter Order */}
        <div className="flex flex-col gap-1 pt-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-gray-300">Filter Order (N)</span>
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

      {/* 3. SPECTRAL & WINDOWING CONTROLS */}
      <div className="glass-panel p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs tracking-wide">
            <Cpu className="w-4 h-4" /> FFT & WINDOWING
          </div>
          <span className="text-[10px] text-gray-400 font-mono">SPECTRAL CONFIG</span>
        </div>

        {/* Window Function */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-300 font-medium">Window Taper Function</label>
          <select
            value={fftConfig.window}
            onChange={(e) => updateFFT('window', e.target.value)}
            className="w-full bg-black/60 border border-white/15 text-purple-300 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-purple-500"
          >
            <option value="hanning">Hanning (General Spectral)</option>
            <option value="hamming">Hamming (Harmonic Analysis)</option>
            <option value="blackman">Blackman (High Selectivity)</option>
            <option value="kaiser">Kaiser Window</option>
            <option value="flattop">FlatTop (Precision Amplitude)</option>
            <option value="rectangular">Rectangular (None)</option>
          </select>
        </div>

        {/* FFT Block Size */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-300 font-medium">FFT Block Resolution</label>
          <select
            value={fftConfig.n_fft}
            onChange={(e) => updateFFT('n_fft', parseInt(e.target.value))}
            className="w-full bg-black/60 border border-white/15 text-purple-300 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-purple-500"
          >
            <option value="256">256 Points (Fastest)</option>
            <option value="512">512 Points</option>
            <option value="1024">1024 Points (Standard)</option>
            <option value="2048">2048 Points (High Res)</option>
            <option value="4096">4096 Points (Ultra Res)</option>
          </select>
        </div>

        {/* Kaiser Beta Parameter (if Kaiser selected) */}
        {fftConfig.window === 'kaiser' && (
          <div className="flex flex-col gap-1 pt-1">
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
        )}

        <div className="mt-auto pt-2 border-t border-white/10 text-[11px] text-gray-400 flex items-center justify-between font-mono">
          <span>Sampling Rate:</span>
          <span className="text-white">44,100 Hz</span>
        </div>
      </div>
    </div>
  );
}
