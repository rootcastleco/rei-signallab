import React from 'react';
import { Network, Cpu, Filter, Radio, Volume2, CheckCircle2, Sliders } from 'lucide-react';

export default function VisualPipeline({ generatorConfig, filterConfig, fftConfig, metrics }) {
  return (
    <div className="glass-panel p-5 flex flex-col gap-4">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-sky-400" />
          <span className="font-semibold text-sm tracking-wide text-white">VISUAL SIGNAL COMPONENT PIPELINE (SIGNALLAB FLOW)</span>
        </div>
        <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Pipeline Active (0 Latency)
        </span>
      </div>

      {/* Node Graph Diagram */}
      <div className="relative py-6 px-4 bg-black/40 border border-white/10 rounded-xl overflow-x-auto">
        <div className="flex items-center justify-between min-w-[720px] gap-6 relative z-10">

          {/* Node 1: Generator */}
          <div className="flex-1 glass-card p-4 border border-cyan-500/30 shadow-lg shadow-cyan-500/10 rounded-xl flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-cyan-400">
              <span className="flex items-center gap-1.5"><Radio className="w-4 h-4" /> Signal Generator</span>
              <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-2 py-0.5 rounded uppercase font-mono">
                {generatorConfig.waveform}
              </span>
            </div>
            <div className="text-xs space-y-1 text-gray-300 font-mono pt-1">
              <div className="flex justify-between"><span>Freq:</span> <span className="text-white">{generatorConfig.frequency} Hz</span></div>
              <div className="flex justify-between"><span>Amp:</span> <span className="text-white">{generatorConfig.amplitude} V</span></div>
              <div className="flex justify-between"><span>Noise:</span> <span className="text-white">{generatorConfig.noise_level} σ</span></div>
            </div>
          </div>

          {/* Connection Arrow 1 */}
          <div className="flex flex-col items-center justify-center gap-1 text-cyan-400">
            <div className="w-12 h-[2px] bg-gradient-to-r from-cyan-500 to-emerald-500 relative">
              <div className="absolute top-[-3px] right-0 w-2 h-2 border-t-2 border-r-2 border-emerald-400 rotate-45"></div>
            </div>
            <span className="text-[10px] font-mono text-gray-400">Time Buffer</span>
          </div>

          {/* Node 2: Digital Filter */}
          <div className={`flex-1 glass-card p-4 rounded-xl border transition-all flex flex-col gap-2 ${
            filterConfig.enabled 
              ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/10' 
              : 'border-white/10 opacity-60'
          }`}>
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
              <span className="flex items-center gap-1.5"><Filter className="w-4 h-4" /> DSP Filter</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                filterConfig.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-500/20 text-gray-400'
              }`}>
                {filterConfig.enabled ? filterConfig.filter_design : 'BYPASS'}
              </span>
            </div>
            <div className="text-xs space-y-1 text-gray-300 font-mono pt-1">
              <div className="flex justify-between"><span>Type:</span> <span className="text-white">{filterConfig.filter_type}</span></div>
              <div className="flex justify-between"><span>Cutoff:</span> <span className="text-white">{filterConfig.cutoff} Hz</span></div>
              <div className="flex justify-between"><span>Order:</span> <span className="text-white">{filterConfig.order}th</span></div>
            </div>
          </div>

          {/* Connection Arrow 2 */}
          <div className="flex flex-col items-center justify-center gap-1 text-emerald-400">
            <div className="w-12 h-[2px] bg-gradient-to-r from-emerald-500 to-purple-500 relative">
              <div className="absolute top-[-3px] right-0 w-2 h-2 border-t-2 border-r-2 border-purple-400 rotate-45"></div>
            </div>
            <span className="text-[10px] font-mono text-gray-400">Filtered Data</span>
          </div>

          {/* Node 3: FFT Processor */}
          <div className="flex-1 glass-card p-4 border border-purple-500/30 shadow-lg shadow-purple-500/10 rounded-xl flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-purple-400">
              <span className="flex items-center gap-1.5"><Cpu className="w-4 h-4" /> FFT Spectral Engine</span>
              <span className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 rounded font-mono">
                {fftConfig.n_fft} PTS
              </span>
            </div>
            <div className="text-xs space-y-1 text-gray-300 font-mono pt-1">
              <div className="flex justify-between"><span>Window:</span> <span className="text-white uppercase">{fftConfig.window}</span></div>
              <div className="flex justify-between"><span>Peak Freq:</span> <span className="text-purple-300">{metrics.fundamental_freq || 0} Hz</span></div>
              <div className="flex justify-between"><span>SNR:</span> <span className="text-white">{metrics.snr_db || 0} dB</span></div>
            </div>
          </div>

          {/* Connection Arrow 3 */}
          <div className="flex flex-col items-center justify-center gap-1 text-purple-400">
            <div className="w-12 h-[2px] bg-gradient-to-r from-purple-500 to-amber-500 relative">
              <div className="absolute top-[-3px] right-0 w-2 h-2 border-t-2 border-r-2 border-amber-400 rotate-45"></div>
            </div>
            <span className="text-[10px] font-mono text-gray-400">Outputs</span>
          </div>

          {/* Node 4: Instrumentation Outputs */}
          <div className="flex-1 glass-card p-4 border border-amber-500/30 shadow-lg shadow-amber-500/10 rounded-xl flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-400">
              <span className="flex items-center gap-1.5"><Volume2 className="w-4 h-4" /> Scope & Audio</span>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded font-mono">
                60 FPS
              </span>
            </div>
            <div className="text-xs space-y-1 text-gray-300 font-mono pt-1">
              <div className="flex justify-between"><span>Oscilloscope:</span> <span className="text-emerald-400">Active</span></div>
              <div className="flex justify-between"><span>Spectrum:</span> <span className="text-purple-400">Active</span></div>
              <div className="flex justify-between"><span>Audio DAC:</span> <span className="text-amber-400">WebAudio</span></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
