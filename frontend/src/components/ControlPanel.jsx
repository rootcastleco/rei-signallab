import React, { useState } from 'react';
import { Sliders, Radio, Filter, Sparkles } from 'lucide-react';

export default function ControlPanel({
  generatorConfig,
  setGeneratorConfig,
  mathConfig,
  setMathConfig,
  filterConfig,
  setFilterConfig
}) {
  const [activeSection, setActiveSection] = useState('generator'); // generator, filter, modulation

  const updateGen = (key, val) => {
    setGeneratorConfig(prev => ({ ...prev, [key]: val }));
  };

  const updateFilter = (key, val) => {
    setFilterConfig(prev => ({ ...prev, [key]: val }));
  };

  const updateMath = (key, val) => {
    setMathConfig(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="studio-panel p-4 flex flex-col gap-4 w-full lg:w-80 shrink-0">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-[#30363D] pb-2.5">
        <div className="flex items-center gap-2 font-semibold text-xs text-[#F0F6FC]">
          <Sliders className="w-4 h-4 text-sky-400" />
          <span>INSTRUMENT CONTROLS</span>
        </div>
      </div>

      {/* Simplified Category Selector */}
      <div className="studio-tabs w-full grid grid-cols-3 text-center">
        <button
          onClick={() => setActiveSection('generator')}
          className={`studio-tab-item ${activeSection === 'generator' ? 'active' : ''}`}
        >
          Signal
        </button>
        <button
          onClick={() => setActiveSection('filter')}
          className={`studio-tab-item ${activeSection === 'filter' ? 'active' : ''}`}
        >
          Filter
        </button>
        <button
          onClick={() => setActiveSection('modulation')}
          className={`studio-tab-item ${activeSection === 'modulation' ? 'active' : ''}`}
        >
          Mod/Math
        </button>
      </div>

      {/* 1. SIGNAL GENERATOR CONTROLS */}
      {activeSection === 'generator' && (
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8B949E] font-medium">Waveform</label>
            <select
              value={generatorConfig.waveform}
              onChange={(e) => updateGen('waveform', e.target.value)}
              className="w-full"
            >
              <option value="sine">Sine Wave</option>
              <option value="square">Square Wave</option>
              <option value="triangle">Triangle Wave</option>
              <option value="sawtooth">Sawtooth Wave</option>
              <option value="noise">White Noise</option>
              <option value="chirp">Chirp Sweep</option>
              <option value="ecg">ECG Heartbeat</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#8B949E]">Frequency</span>
              <span className="text-sky-400 font-semibold">{generatorConfig.frequency} Hz</span>
            </div>
            <input
              type="range"
              min="20"
              max="5000"
              step="5"
              value={generatorConfig.frequency}
              onChange={(e) => updateGen('frequency', parseFloat(e.target.value))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#8B949E]">Amplitude</span>
              <span className="text-sky-400 font-semibold">{generatorConfig.amplitude} V</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="10.0"
              step="0.1"
              value={generatorConfig.amplitude}
              onChange={(e) => updateGen('amplitude', parseFloat(e.target.value))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#8B949E]">Noise Level</span>
              <span className="text-amber-400 font-semibold">{generatorConfig.noise_level}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="2.0"
              step="0.05"
              value={generatorConfig.noise_level}
              onChange={(e) => updateGen('noise_level', parseFloat(e.target.value))}
            />
          </div>
        </div>
      )}

      {/* 2. DSP FILTER CONTROLS */}
      {activeSection === 'filter' && (
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between bg-[#0D1117] p-2 rounded border border-[#30363D]">
            <span className="text-xs font-medium text-[#F0F6FC]">Enable Filter</span>
            <input
              type="checkbox"
              checked={filterConfig.enabled}
              onChange={(e) => updateFilter('enabled', e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8B949E] font-medium">Filter Type</label>
            <select
              value={filterConfig.filter_type}
              disabled={!filterConfig.enabled}
              onChange={(e) => updateFilter('filter_type', e.target.value)}
              className="w-full disabled:opacity-40"
            >
              <option value="lowpass">LowPass</option>
              <option value="highpass">HighPass</option>
              <option value="bandpass">BandPass</option>
              <option value="bandstop">BandStop</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8B949E] font-medium">Filter Design</label>
            <select
              value={filterConfig.filter_design}
              disabled={!filterConfig.enabled}
              onChange={(e) => updateFilter('filter_design', e.target.value)}
              className="w-full disabled:opacity-40"
            >
              <option value="butterworth">Butterworth IIR</option>
              <option value="chebyshev1">Chebyshev I</option>
              <option value="fir_window">Windowed FIR</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#8B949E]">Cutoff (Fc)</span>
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
            />
          </div>
        </div>
      )}

      {/* 3. MODULATION & MATH CONTROLS */}
      {activeSection === 'modulation' && (
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8B949E] font-medium">Modulation Mode</label>
            <select
              value={generatorConfig.modulation_type || 'none'}
              onChange={(e) => updateGen('modulation_type', e.target.value)}
              className="w-full"
            >
              <option value="none">None (Off)</option>
              <option value="am">AM Modulation</option>
              <option value="fm">FM Modulation</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#8B949E]">Mod Frequency</span>
              <span className="text-purple-400 font-semibold">{generatorConfig.mod_frequency || 20} Hz</span>
            </div>
            <input
              type="range"
              min="1"
              max="300"
              step="1"
              disabled={generatorConfig.modulation_type === 'none'}
              value={generatorConfig.mod_frequency || 20}
              onChange={(e) => updateGen('mod_frequency', parseFloat(e.target.value))}
            />
          </div>

          <div className="flex items-center justify-between bg-[#0D1117] p-2 rounded border border-[#30363D] mt-1">
            <span className="text-xs font-medium text-[#F0F6FC]">Hilbert Envelope</span>
            <input
              type="checkbox"
              checked={mathConfig.envelope_extraction}
              onChange={(e) => updateMath('envelope_extraction', e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8B949E] font-medium">Bit Depth Quantizer</label>
            <select
              value={mathConfig.bit_depth || 'full'}
              onChange={(e) => updateMath('bit_depth', e.target.value === 'full' ? null : parseInt(e.target.value))}
              className="w-full"
            >
              <option value="full">Full Floating Precision</option>
              <option value="16">16-bit PCM</option>
              <option value="8">8-bit Quantizer</option>
              <option value="4">4-bit Crusher</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
