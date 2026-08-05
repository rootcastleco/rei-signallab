import React, { useState } from 'react';

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
    <div className="win95-outset p-3 flex flex-col gap-3 w-full lg:w-72 shrink-0">
      {/* Title Bar */}
      <div className="win95-titlebar">
        <span>DSP_Instrument_Properties</span>
        <div className="flex gap-1">
          <div className="win95-btn-box">?</div>
          <div className="win95-btn-box">✕</div>
        </div>
      </div>

      {/* Windows 95 Tabs */}
      <div className="win95-tabs">
        <button onClick={() => setSection('signal')} className={`win95-tab ${section === 'signal' ? 'active' : ''}`}>
          Generator
        </button>
        <button onClick={() => setSection('filter')} className={`win95-tab ${section === 'filter' ? 'active' : ''}`}>
          Filter
        </button>
        <button onClick={() => setSection('mod')} className={`win95-tab ${section === 'mod' ? 'active' : ''}`}>
          Mod/Math
        </button>
      </div>

      {/* Tab Panel Content Box */}
      <div className="win95-outset p-3 flex flex-col gap-3 bg-[#C0C0C0]">

        {section === 'signal' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold">Waveform Generator:</label>
              <select value={generatorConfig.waveform} onChange={e => setGen('waveform', e.target.value)} className="w-full">
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
              <div className="flex justify-between text-xs font-mono font-bold">
                <span>Frequency:</span>
                <span className="text-[#0000FF]">{generatorConfig.frequency} Hz</span>
              </div>
              <input type="range" min="20" max="5000" step="5" value={generatorConfig.frequency} onChange={e => setGen('frequency', parseFloat(e.target.value))} />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span>Amplitude:</span>
                <span className="text-[#00AA00]">{generatorConfig.amplitude} V</span>
              </div>
              <input type="range" min="0.1" max="10" step="0.1" value={generatorConfig.amplitude} onChange={e => setGen('amplitude', parseFloat(e.target.value))} />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span>Noise Level:</span>
                <span className="text-[#FF0000]">{generatorConfig.noise_level}</span>
              </div>
              <input type="range" min="0" max="2" step="0.05" value={generatorConfig.noise_level} onChange={e => setGen('noise_level', parseFloat(e.target.value))} />
            </div>
          </div>
        )}

        {section === 'filter' && (
          <div className="flex flex-col gap-3">
            <div className="win95-inset p-2 flex items-center justify-between">
              <span className="text-xs font-bold">Enable Filter</span>
              <input type="checkbox" checked={filterConfig.enabled} onChange={e => setFlt('enabled', e.target.checked)} className="cursor-pointer" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold">Filter Type:</label>
              <select value={filterConfig.filter_type} disabled={!filterConfig.enabled} onChange={e => setFlt('filter_type', e.target.value)} className="w-full">
                <option value="lowpass">LowPass</option>
                <option value="highpass">HighPass</option>
                <option value="bandpass">BandPass</option>
                <option value="bandstop">BandStop</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold">Filter Design:</label>
              <select value={filterConfig.filter_design} disabled={!filterConfig.enabled} onChange={e => setFlt('filter_design', e.target.value)} className="w-full">
                <option value="butterworth">Butterworth IIR</option>
                <option value="chebyshev1">Chebyshev I</option>
                <option value="fir_window">Windowed FIR</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span>Cutoff (Fc):</span>
                <span className="text-[#00AA00]">{filterConfig.cutoff} Hz</span>
              </div>
              <input type="range" min="50" max="10000" step="25" disabled={!filterConfig.enabled} value={filterConfig.cutoff} onChange={e => setFlt('cutoff', parseFloat(e.target.value))} />
            </div>
          </div>
        )}

        {section === 'mod' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold">Modulation Mode:</label>
              <select value={generatorConfig.modulation_type || 'none'} onChange={e => setGen('modulation_type', e.target.value)} className="w-full">
                <option value="none">Off (None)</option>
                <option value="am">AM Modulation</option>
                <option value="fm">FM Modulation</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span>Mod Frequency:</span>
                <span className="text-[#0000FF]">{generatorConfig.mod_frequency || 20} Hz</span>
              </div>
              <input type="range" min="1" max="300" step="1" disabled={generatorConfig.modulation_type === 'none'} value={generatorConfig.mod_frequency || 20} onChange={e => setGen('mod_frequency', parseFloat(e.target.value))} />
            </div>

            <div className="win95-inset p-2 flex items-center justify-between">
              <span className="text-xs font-bold">Hilbert Envelope</span>
              <input type="checkbox" checked={mathConfig.envelope_extraction} onChange={e => setMth('envelope_extraction', e.target.checked)} className="cursor-pointer" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold">Bit Quantizer:</label>
              <select value={mathConfig.bit_depth || 'full'} onChange={e => setMth('bit_depth', e.target.value === 'full' ? null : parseInt(e.target.value))} className="w-full">
                <option value="full">Full Floating Precision</option>
                <option value="16">16-bit PCM</option>
                <option value="8">8-bit Quantizer</option>
                <option value="4">4-bit Crusher</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Windows 95 Dialog Buttons */}
      <div className="flex justify-end gap-2 pt-1 border-t border-[#808080]">
        <button className="win95-btn">OK</button>
        <button className="win95-btn">Cancel</button>
        <button className="win95-btn">Apply</button>
      </div>
    </div>
  );
}
