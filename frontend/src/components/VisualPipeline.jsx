import React, { useState } from 'react';
import { Network, Radio, Filter, Cpu, Volume2, Sparkles, Sliders, CheckCircle2, AlertCircle } from 'lucide-react';

export default function VisualPipeline({ generatorConfig, filterConfig, fftConfig, mathConfig, metrics }) {
  const [activeNode, setActiveNode] = useState('gen'); // gen, mod, math, filter, fft, out

  return (
    <div className="glass-panel p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-sky-400" />
          <span className="font-semibold text-sm tracking-wide text-white">INTERACTIVE COMPONENT VISUAL PIPELINE (MITOV WORKFLOW)</span>
        </div>
        <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Direct DSP Routing Active
        </span>
      </div>

      {/* Node Flow Map */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative py-4 px-2">
        {/* Node 1: Generator */}
        <div
          onClick={() => setActiveNode('gen')}
          className={`glass-card p-3.5 cursor-pointer rounded-xl border transition-all flex flex-col gap-2 ${
            activeNode === 'gen'
              ? 'border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-500/20 bg-cyan-500/10'
              : 'border-cyan-500/30 hover:border-cyan-400/60'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-cyan-400">
            <span className="flex items-center gap-1"><Radio className="w-4 h-4" /> Generator</span>
            <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-1.5 py-0.5 rounded uppercase font-mono">
              {generatorConfig.waveform}
            </span>
          </div>
          <div className="text-[11px] space-y-1 text-gray-300 font-mono pt-1">
            <div className="flex justify-between"><span>f:</span> <span className="text-white">{generatorConfig.frequency} Hz</span></div>
            <div className="flex justify-between"><span>A:</span> <span className="text-white">{generatorConfig.amplitude} V</span></div>
          </div>
        </div>

        {/* Node 2: Modulator */}
        <div
          onClick={() => setActiveNode('mod')}
          className={`glass-card p-3.5 cursor-pointer rounded-xl border transition-all flex flex-col gap-2 ${
            activeNode === 'mod'
              ? 'border-indigo-400 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/20 bg-indigo-500/10'
              : 'border-indigo-500/30 hover:border-indigo-400/60'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-400">
            <span className="flex items-center gap-1"><Sparkles className="w-4 h-4" /> Modulator</span>
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded uppercase font-mono">
              {generatorConfig.modulation_type || 'NONE'}
            </span>
          </div>
          <div className="text-[11px] space-y-1 text-gray-300 font-mono pt-1">
            <div className="flex justify-between"><span>fm:</span> <span className="text-white">{generatorConfig.mod_frequency || 20} Hz</span></div>
            <div className="flex justify-between"><span>m:</span> <span className="text-white">{generatorConfig.mod_index || 0.5}</span></div>
          </div>
        </div>

        {/* Node 3: Filter */}
        <div
          onClick={() => setActiveNode('filter')}
          className={`glass-card p-3.5 cursor-pointer rounded-xl border transition-all flex flex-col gap-2 ${
            filterConfig.enabled
              ? activeNode === 'filter'
                ? 'border-emerald-400 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/20 bg-emerald-500/10'
                : 'border-emerald-500/40 hover:border-emerald-400'
              : 'border-white/10 opacity-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
            <span className="flex items-center gap-1"><Filter className="w-4 h-4" /> DSP Filter</span>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded uppercase font-mono">
              {filterConfig.enabled ? filterConfig.filter_design : 'BYPASS'}
            </span>
          </div>
          <div className="text-[11px] space-y-1 text-gray-300 font-mono pt-1">
            <div className="flex justify-between"><span>Type:</span> <span className="text-white">{filterConfig.filter_type}</span></div>
            <div className="flex justify-between"><span>Fc:</span> <span className="text-white">{filterConfig.cutoff} Hz</span></div>
          </div>
        </div>

        {/* Node 4: FFT Processor */}
        <div
          onClick={() => setActiveNode('fft')}
          className={`glass-card p-3.5 cursor-pointer rounded-xl border transition-all flex flex-col gap-2 ${
            activeNode === 'fft'
              ? 'border-purple-400 ring-2 ring-purple-500/30 shadow-lg shadow-purple-500/20 bg-purple-500/10'
              : 'border-purple-500/30 hover:border-purple-400/60'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-purple-400">
            <span className="flex items-center gap-1"><Cpu className="w-4 h-4" /> FFT Engine</span>
            <span className="bg-purple-500/20 text-purple-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
              {fftConfig.n_fft} PTS
            </span>
          </div>
          <div className="text-[11px] space-y-1 text-gray-300 font-mono pt-1">
            <div className="flex justify-between"><span>Win:</span> <span className="text-white uppercase">{fftConfig.window}</span></div>
            <div className="flex justify-between"><span>SNR:</span> <span className="text-purple-300">{metrics.snr_db || 0} dB</span></div>
          </div>
        </div>

        {/* Node 5: Output Hardware */}
        <div
          onClick={() => setActiveNode('out')}
          className={`glass-card p-3.5 cursor-pointer rounded-xl border transition-all flex flex-col gap-2 ${
            activeNode === 'out'
              ? 'border-amber-400 ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/20 bg-amber-500/10'
              : 'border-amber-500/30 hover:border-amber-400/60'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
            <span className="flex items-center gap-1"><Volume2 className="w-4 h-4" /> Outputs</span>
            <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
              60 FPS
            </span>
          </div>
          <div className="text-[11px] space-y-1 text-gray-300 font-mono pt-1">
            <div className="flex justify-between"><span>Scope:</span> <span className="text-emerald-400">Active</span></div>
            <div className="flex justify-between"><span>DAC:</span> <span className="text-amber-400">WebAudio</span></div>
          </div>
        </div>
      </div>

      {/* Selected Node Details Drawer */}
      <div className="glass-card p-4 border border-white/10 rounded-xl bg-black/40 flex flex-col gap-2 font-mono text-xs text-gray-300">
        <div className="flex items-center justify-between text-white font-semibold border-b border-white/10 pb-2">
          <span className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" /> Node Inspector: {activeNode.toUpperCase()}
          </span>
          <span className="text-[11px] text-emerald-400">Status: Running</span>
        </div>
        {activeNode === 'gen' && (
          <div>Carrier Signal Generator producing {generatorConfig.waveform} wave at {generatorConfig.frequency} Hz, amplitude {generatorConfig.amplitude} V.</div>
        )}
        {activeNode === 'mod' && (
          <div>Modulation Engine applying {generatorConfig.modulation_type || 'NONE'} modulation at {generatorConfig.mod_frequency || 20} Hz (Mod Index: {generatorConfig.mod_index || 0.5}).</div>
        )}
        {activeNode === 'filter' && (
          <div>{filterConfig.enabled ? `Digital ${filterConfig.filter_design} ${filterConfig.filter_type} filter at cutoff ${filterConfig.cutoff} Hz (${filterConfig.order}th order).` : 'Filter in BYPASS mode.'}</div>
        )}
        {activeNode === 'fft' && (
          <div>Fast Fourier Transform running {fftConfig.n_fft} points with {fftConfig.window} windowing.</div>
        )}
        {activeNode === 'out' && (
          <div>Instrumentation Outputs connected to CRT Oscilloscope, FFT Spectrum Analyzer, 2D Waterfall Spectrogram, and WebAudio DAC.</div>
        )}
      </div>
    </div>
  );
}
