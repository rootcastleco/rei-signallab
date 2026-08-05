import React, { useState } from 'react';
import { Terminal, Play, Code2, Sparkles, CheckCircle2, Cpu } from 'lucide-react';

const LISP_TEMPLATES = {
  BIQUAD: `;; Machine-Level Common Lisp Direct Form II Transposed Biquad Filter
(biquad-filter-simd signal 0.15 0.30 0.15 -0.40 0.20)`,
  QUANTIZE: `;; Machine-Level Common Lisp N-Bit Vector Quantizer
(lisp-quantize-buffer signal 8)`,
  KAISER: `;; Common Lisp Kaiser Window Taper (beta = 14.0)
(apply-kaiser-window signal 14.0)`
};

export default function LispPluginEditor({ generatorConfig, fftConfig, onLispProcessed }) {
  const [lispCode, setLispCode] = useState(LISP_TEMPLATES.BIQUAD);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  const runLispPlugin = async () => {
    setLoading(true);
    setLogs(['Compiling S-Expression AST...', 'Optimizing for machine-level execution (speed 3) (safety 0)...']);

    try {
      const res = await fetch('/api/lisp/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lisp_code: lispCode,
          generator: generatorConfig,
          fft: fftConfig
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(prev => [...prev, 'Lisp Machine Vector DSP compiled and executed successfully!', `Processed ${data.time.length} vector samples.`]);
        if (onLispProcessed) {
          onLispProcessed(data);
        }
      } else {
        const err = await res.json();
        setLogs(prev => [...prev, `Lisp Compilation Error: ${err.detail || 'Failed'}`]);
      }
    } catch (e) {
      setLogs(prev => [...prev, `Network/Bridge Error: ${e.message}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-amber-400" />
          <span className="font-semibold text-sm tracking-wide text-white">COMMON LISP MACHINE-LEVEL DSP PLUGIN EDITOR</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">Macro Presets:</span>
          <button
            onClick={() => setLispCode(LISP_TEMPLATES.BIQUAD)}
            className="px-2.5 py-1 text-xs rounded bg-white/5 border border-white/10 text-cyan-300 hover:bg-white/10 font-mono"
          >
            Biquad IIR
          </button>

          <button
            onClick={() => setLispCode(LISP_TEMPLATES.QUANTIZE)}
            className="px-2.5 py-1 text-xs rounded bg-white/5 border border-white/10 text-amber-300 hover:bg-white/10 font-mono"
          >
            N-Bit Quantizer
          </button>

          <button
            onClick={() => setLispCode(LISP_TEMPLATES.KAISER)}
            className="px-2.5 py-1 text-xs rounded bg-white/5 border border-white/10 text-purple-300 hover:bg-white/10 font-mono"
          >
            Kaiser Window
          </button>
        </div>
      </div>

      {/* Code Editor Area */}
      <div className="relative">
        <textarea
          value={lispCode}
          onChange={(e) => setLispCode(e.target.value)}
          rows={5}
          className="w-full bg-black/80 border border-white/15 rounded-lg p-3 font-mono text-xs text-emerald-300 focus:outline-none focus:border-amber-400 leading-relaxed shadow-inner"
          placeholder="Enter Common Lisp S-Expression DSP Code..."
        />
        <button
          onClick={runLispPlugin}
          disabled={loading}
          className="absolute bottom-3 right-3 px-3 py-1.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition text-xs font-mono flex items-center gap-1.5 shadow-sm shadow-amber-500/20 disabled:opacity-50"
        >
          {loading ? <Cpu className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-amber-400" />}
          <span>EXECUTE LISP KERNEL</span>
        </button>
      </div>

      {/* Compiler Execution Console Logs */}
      {logs.length > 0 && (
        <div className="bg-black/60 border border-white/10 rounded-md p-2.5 font-mono text-[11px] text-gray-300 space-y-1">
          <div className="text-gray-400 flex items-center gap-1 border-b border-white/10 pb-1">
            <Terminal className="w-3 h-3 text-cyan-400" /> SBCL / Machine Lisp Compiler Log
          </div>
          {logs.map((log, idx) => (
            <div key={idx} className={log.includes('Error') ? 'text-rose-400' : 'text-emerald-400'}>
              &gt; {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
