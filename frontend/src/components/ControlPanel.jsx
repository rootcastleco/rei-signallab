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
    <div className="panel p-4 flex flex-col gap-4 w-full lg:w-72 shrink-0">
      <span className="ctrl-label" style={{ fontSize: '11px', letterSpacing: '0.08em' }}>Controls</span>

      <div className="tab-bar" style={{ padding: '2px' }}>
        {['signal', 'filter', 'mod'].map(s => (
          <button key={s} onClick={() => setSection(s)} className={`tab-btn ${section === s ? 'active' : ''}`} style={{ fontSize: '10.5px', padding: '4px 0' }}>
            {s === 'signal' ? 'Signal' : s === 'filter' ? 'Filter' : 'Mod / Math'}
          </button>
        ))}
      </div>

      {section === 'signal' && (
        <div className="flex flex-col gap-4">
          <div className="ctrl-group">
            <span className="ctrl-label">Waveform</span>
            <select value={generatorConfig.waveform} onChange={e => setGen('waveform', e.target.value)} className="w-full">
              <option value="sine">Sine</option>
              <option value="square">Square</option>
              <option value="triangle">Triangle</option>
              <option value="sawtooth">Sawtooth</option>
              <option value="noise">White Noise</option>
              <option value="chirp">Chirp Sweep</option>
              <option value="ecg">ECG</option>
            </select>
          </div>

          <div className="ctrl-group">
            <div className="ctrl-row">
              <span className="ctrl-label">Frequency</span>
              <span className="ctrl-value" style={{ color: 'var(--ch1)' }}>{generatorConfig.frequency} Hz</span>
            </div>
            <input type="range" min="20" max="5000" step="5" value={generatorConfig.frequency} onChange={e => setGen('frequency', parseFloat(e.target.value))} />
          </div>

          <div className="ctrl-group">
            <div className="ctrl-row">
              <span className="ctrl-label">Amplitude</span>
              <span className="ctrl-value" style={{ color: 'var(--ch2)' }}>{generatorConfig.amplitude} V</span>
            </div>
            <input type="range" min="0.1" max="10" step="0.1" value={generatorConfig.amplitude} onChange={e => setGen('amplitude', parseFloat(e.target.value))} />
          </div>

          <div className="ctrl-group">
            <div className="ctrl-row">
              <span className="ctrl-label">Noise</span>
              <span className="ctrl-value" style={{ color: 'var(--peak)' }}>{generatorConfig.noise_level}</span>
            </div>
            <input type="range" min="0" max="2" step="0.05" value={generatorConfig.noise_level} onChange={e => setGen('noise_level', parseFloat(e.target.value))} />
          </div>
        </div>
      )}

      {section === 'filter' && (
        <div className="flex flex-col gap-4">
          <div className="ctrl-row panel-inset" style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
            <span className="ctrl-label">Enable</span>
            <input type="checkbox" checked={filterConfig.enabled} onChange={e => setFlt('enabled', e.target.checked)} />
          </div>

          <div className="ctrl-group">
            <span className="ctrl-label">Type</span>
            <select value={filterConfig.filter_type} disabled={!filterConfig.enabled} onChange={e => setFlt('filter_type', e.target.value)} className="w-full">
              <option value="lowpass">LowPass</option>
              <option value="highpass">HighPass</option>
              <option value="bandpass">BandPass</option>
              <option value="bandstop">BandStop</option>
            </select>
          </div>

          <div className="ctrl-group">
            <span className="ctrl-label">Design</span>
            <select value={filterConfig.filter_design} disabled={!filterConfig.enabled} onChange={e => setFlt('filter_design', e.target.value)} className="w-full">
              <option value="butterworth">Butterworth</option>
              <option value="chebyshev1">Chebyshev I</option>
              <option value="fir_window">FIR Window</option>
            </select>
          </div>

          <div className="ctrl-group">
            <div className="ctrl-row">
              <span className="ctrl-label">Cutoff Fc</span>
              <span className="ctrl-value" style={{ color: 'var(--ch2)' }}>{filterConfig.cutoff} Hz</span>
            </div>
            <input type="range" min="50" max="10000" step="25" disabled={!filterConfig.enabled} value={filterConfig.cutoff} onChange={e => setFlt('cutoff', parseFloat(e.target.value))} />
          </div>
        </div>
      )}

      {section === 'mod' && (
        <div className="flex flex-col gap-4">
          <div className="ctrl-group">
            <span className="ctrl-label">Modulation</span>
            <select value={generatorConfig.modulation_type || 'none'} onChange={e => setGen('modulation_type', e.target.value)} className="w-full">
              <option value="none">Off</option>
              <option value="am">AM</option>
              <option value="fm">FM</option>
            </select>
          </div>

          <div className="ctrl-group">
            <div className="ctrl-row">
              <span className="ctrl-label">Mod Freq</span>
              <span className="ctrl-value" style={{ color: 'var(--fft)' }}>{generatorConfig.mod_frequency || 20} Hz</span>
            </div>
            <input type="range" min="1" max="300" step="1" disabled={generatorConfig.modulation_type === 'none'} value={generatorConfig.mod_frequency || 20} onChange={e => setGen('mod_frequency', parseFloat(e.target.value))} />
          </div>

          <div className="ctrl-row panel-inset" style={{ padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
            <span className="ctrl-label">Envelope</span>
            <input type="checkbox" checked={mathConfig.envelope_extraction} onChange={e => setMth('envelope_extraction', e.target.checked)} />
          </div>

          <div className="ctrl-group">
            <span className="ctrl-label">Quantizer</span>
            <select value={mathConfig.bit_depth || 'full'} onChange={e => setMth('bit_depth', e.target.value === 'full' ? null : parseInt(e.target.value))} className="w-full">
              <option value="full">Full Precision</option>
              <option value="16">16-bit</option>
              <option value="8">8-bit</option>
              <option value="4">4-bit</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
