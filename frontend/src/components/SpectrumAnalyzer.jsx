import React, { useRef, useEffect, useState } from 'react';
import { BarChart2, Sparkles } from 'lucide-react';

export default function SpectrumAnalyzer({ frequencyData, magnitudeData, metrics }) {
  const canvasRef = useRef(null);
  const [logScale, setLogScale] = useState(false);
  const [showHarmonics, setShowHarmonics] = useState(true);
  const [showPeakHold, setShowPeakHold] = useState(true);
  const peakHoldRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const minDb = -100, maxDb = 20, dbRange = maxDb - minDb;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    const rows = 6, cols = 8;
    const cw = W / cols, ch = H / rows;

    ctx.strokeStyle = '#181C24';
    ctx.lineWidth = 1;
    for (let r = 1; r < rows; r++) {
      ctx.beginPath(); ctx.moveTo(0, r*ch); ctx.lineTo(W, r*ch); ctx.stroke();
      const db = maxDb - (r / rows) * dbRange;
      ctx.fillStyle = '#4B5260';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`${db.toFixed(0)} dB`, 6, r*ch - 3);
    }
    for (let c = 1; c < cols; c++) { ctx.beginPath(); ctx.moveTo(c*cw, 0); ctx.lineTo(c*cw, H); ctx.stroke(); }

    if (!frequencyData || !magnitudeData || frequencyData.length === 0) return;

    const maxFreq = frequencyData[frequencyData.length - 1] || 22050;
    const getX = (f) => {
      if (logScale) {
        const minF = Math.max(10, frequencyData[0] || 10);
        return Math.max(0, Math.min(W, ((Math.log10(Math.max(minF, f)) - Math.log10(minF)) / (Math.log10(maxFreq) - Math.log10(minF))) * W));
      }
      return (f / maxFreq) * W;
    };

    if (peakHoldRef.current.length !== magnitudeData.length) {
      peakHoldRef.current = [...magnitudeData];
    } else {
      for (let i = 0; i < magnitudeData.length; i++) {
        peakHoldRef.current[i] = Math.max(peakHoldRef.current[i] - 0.3, magnitudeData[i]);
      }
    }

    if (showPeakHold) {
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      for (let i = 0; i < frequencyData.length; i++) {
        const x = getX(frequencyData[i]);
        const y = Math.max(0, Math.min(H, ((maxDb - peakHoldRef.current[i]) / dbRange) * H));
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(139, 92, 246, 0.35)');
    grad.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let i = 0; i < frequencyData.length; i++) {
      const x = getX(frequencyData[i]);
      const y = Math.max(0, Math.min(H, ((maxDb - magnitudeData[i]) / dbRange) * H));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < frequencyData.length; i++) {
      const x = getX(frequencyData[i]);
      const y = Math.max(0, Math.min(H, ((maxDb - magnitudeData[i]) / dbRange) * H));
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (metrics && metrics.fundamental_freq > 0) {
      const f0 = metrics.fundamental_freq;
      const px = getX(f0);
      const pMag = metrics.peak_magnitude_db || 0;
      const py = Math.max(10, ((maxDb - pMag) / dbRange) * H);

      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, py - 12); ctx.lineTo(px, py + 12); ctx.stroke();

      ctx.fillStyle = '#EF4444';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText(`Peak: ${f0.toFixed(1)} Hz (${pMag.toFixed(1)} dB)`, Math.min(W - 160, px + 6), py - 6);

      if (showHarmonics) {
        [2, 3, 4, 5].forEach(h => {
          const hf = f0 * h;
          if (hf <= maxFreq) {
            const hx = getX(hf);
            ctx.strokeStyle = '#4B5260';
            ctx.setLineDash([2, 2]);
            ctx.beginPath(); ctx.moveTo(hx, 0); ctx.lineTo(hx, H); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#7C8594';
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.fillText(`${h}H`, hx - 4, 12);
          }
        });
      }
    }

  }, [frequencyData, magnitudeData, metrics, logScale, showHarmonics, showPeakHold]);

  return (
    <div className="studio-panel p-3 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#232830] pb-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-xs text-[#EAF0F6]">SPECTRUM ANALYZER (FFT & PEAK ENVELOPE)</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="studio-tabs">
            <button
              onClick={() => setLogScale(false)}
              className={`studio-tab ${!logScale ? 'active' : ''}`}
            >
              Linear
            </button>
            <button
              onClick={() => setLogScale(true)}
              className={`studio-tab ${logScale ? 'active' : ''}`}
            >
              Log
            </button>
          </div>

          <button
            onClick={() => setShowPeakHold(!showPeakHold)}
            className={`btn text-xs ${showPeakHold ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' : ''}`}
          >
            Peak Hold
          </button>

          <button
            onClick={() => setShowHarmonics(!showHarmonics)}
            className={`btn text-xs flex items-center gap-1 ${showHarmonics ? 'text-purple-400 border-purple-500/40 bg-purple-500/10' : ''}`}
          >
            <Sparkles className="w-3 h-3" /> Harmonics
          </button>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded bg-black">
        <canvas
          ref={canvasRef}
          width={800}
          height={360}
          className="oscilloscope-canvas w-full h-[360px] block cursor-crosshair"
        />

        {metrics && (
          <div className="absolute top-2 right-2 flex items-center gap-3 bg-[#0C0E12]/90 border border-[#232830] rounded px-2.5 py-1 text-[11px] font-mono text-[#7C8594]">
            <span className="text-emerald-400">THD: {metrics.thd_percent}%</span>
            <span className="text-sky-400">SNR: {metrics.snr_db} dB</span>
            <span className="text-amber-400">SINAD: {metrics.sinad_db || 0} dB</span>
            <span className="text-purple-400">ENOB: {metrics.enob_bits || 0} bits</span>
          </div>
        )}
      </div>
    </div>
  );
}
