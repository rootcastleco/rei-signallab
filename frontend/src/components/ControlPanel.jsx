import React, { useState } from 'react';
import { Sliders } from 'lucide-react';

export default function ControlPanel({
  generatorConfig, setGeneratorConfig,
  mathConfig, setMathConfig,
  filterConfig, setFilterConfig
}) {
  const [section, setSection] = useState('signal');

  const setGen = (k, v) => setGeneratorConfig(p => ({ ...p, [k]: v }));
  const setFlt = (k, v) => setFilterConfig(p => ({ ...p, [k]: v }));
  const setMth = (k, v) => setMathConfig(p => ({ ...p, [k]: v }));

  return (
    <div className="studio-panel p-4 flex flex-col gap-4 w-full lg:w-80 shrink-0">
      <div className="flex items-center justify-between border-b border-[#232830] pb-2.5">
        <div className="flex items-center gap-2 font-semibold text-xs text-[#EAF0F6]">
          <Sliders className="w-4 h-4 text-sky-400" />
          <span>INSTRUMENT CONTROLS</span>
        </div>
      </div>

      <div className="studio-tabs w-full grid grid-cols-3 text-center">
        <button
          onClick={() => setSection('signal')}
          className={`studio-tab ${section === 'signal' ? 'active' : ''}`}
        >
          Signal
        </button>
        <button
          onClick={() => setSection('filter')}
          className={`studio-tab ${section === 'filter' ? 'active' : ''}`}
        >
          Filter
        </button>
        <button
          onClick={() => setSection('mod')}
          className={`studio-tab ${section === 'mod' ? 'active' : ''}`}
        >
          Mod/Math
        </button>
      </div>

      {section === 'signal' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#7C8594] font-medium">Waveform</label>
            <select
              value={generatorConfig.waveform}
              onChange={e => setGen('waveform', e.target.value)}
              className="w-full"
            >
              <option value="sine">Sine Wave</option>
              <option value="square">Square Wave</option>
              <option value="triangle">Triangle Wave</option>
              <option value="sawtooth">Sawtooth Wave</option>
              <option value="noise">White Noise</option>
              <option value="chirp">Chirp Sweep</option>
              <option value="ecg">ECG Cardiac</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#7C8594]">Frequency</span>
              <span className="text-sky-400 font-semibold">{generatorConfig.frequency} Hz</span>
            </div>
            <input type="range" min="20" max="5000" step="5" value={generatorConfig.frequency} onChange={e => setGen('frequency', parseFloat(e.target.value))} />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#7C8594]">Amplitude</span>
              <span className="text-emerald-400 font-semibold">{generatorConfig.amplitude} V</span>
            </div>
            <input type="range" min="0.1" max="10" step="0.1" value={generatorConfig.amplitude} onChange={e => setGen('amplitude', parseFloat(e.target.value))} />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#7C8594]">Noise Level</span>
              <span className="text-amber-400 font-semibold">{generatorConfig.noise_level}</span>
            </div>
            <input type="range" min="0" max="2" step="0.05" value={generatorConfig.noise_level} onChange={e => setGen('noise_level', parseFloat(e.target.value))} />
          </div>
        </div>
      )}

      {section === 'filter' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between bg-[#0C0E12] p-2.5 rounded border border-[#232830]">
            <span className="text-xs font-medium text-[#EAF0F6]">Enable Filter</span>
            <input type="checkbox" checked={filterConfig.enabled} onChange={e => setFlt('enabled', e.target.checked)} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#7C8594] font-medium">Filter Type</label>
            <select value={filterConfig.filter_type} disabled={!filterConfig.enabled} onChange={e => setFlt('filter_type', e.target.value)} className="w-full">
              <option value="lowpass">LowPass</option>
              <option value="highpass">HighPass</option>
              <option value="bandpass">BandPass</option>
              <option value="bandstop">BandStop</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#7C8594] font-medium">Filter Design</label>
            <select value={filterConfig.filter_design} disabled={!filterConfig.enabled} onChange={e => setFlt('filter_design', e.target.value)} className="w-full">
              <option value="butterworth">Butterworth IIR</option>
              <option value="chebyshev1">Chebyshev I</option>
              <option value="fir_window">Windowed FIR</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#7C8594]">Cutoff (Fc)</span>
              <span className="text-emerald-400 font-semibold">{filterConfig.cutoff} Hz</span>
            </div>
            <input type="range" min="50" max="10000" step="25" disabled={!filterConfig.enabled} value={filterConfig.cutoff} onChange={e => setFlt('cutoff', parseFloat(e.target.value))} />
          </div>
        </div>
      )}

      {section === 'mod' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#7C8594] font-medium">Modulation Mode</label>
            <select value={generatorConfig.modulation_type || 'none'} onChange={e => setGen('modulation_type', e.target.value)} className="w-full">
              <option value="none">Off (None)</option>
              <option value="am">AM Modulation</option>
              <option value="fm">FM Modulation</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#7C8594]">Mod Frequency</span>
              <span className="text-purple-400 font-semibold">{generatorConfig.mod_frequency || 20} Hz</span>
            </div>
            <input type="range" min="1" max="300" step="1" disabled={generatorConfig.modulation_type === 'none'} value={generatorConfig.mod_frequency || 20} onChange={e => setGen('mod_frequency', parseFloat(e.target.value))} />
          </div>

          <div className="flex items-center justify-between bg-[#0C0E12] p-2.5 rounded border border-[#232830]">
            <span className="text-xs font-medium text-[#EAF0F6]">Hilbert Envelope</span>
            <input type="checkbox" checked={mathConfig.envelope_extraction} onChange={e => setMth('envelope_extraction', e.target.checked)} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#7C8594] font-medium">Bit Quantizer</label>
            <select value={mathConfig.bit_depth || 'full'} onChange={e => setMth('bit_depth', e.target.value === 'full' ? null : parseInt(e.target.value))} className="w-full">
              <option value="full">Full Precision</option>
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
