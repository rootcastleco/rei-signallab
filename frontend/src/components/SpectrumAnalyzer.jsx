import React, { useRef, useEffect, useState } from 'react';

export default function SpectrumAnalyzer({ frequencyData, magnitudeData, metrics }) {
  const canvasRef = useRef(null);
  const [logScale, setLogScale] = useState(false);
  const [showPeakHold, setShowPeakHold] = useState(true);
  const [showHarmonics, setShowHarmonics] = useState(true);
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

    ctx.strokeStyle = '#003300';
    ctx.lineWidth = 1;
    for (let r = 1; r < rows; r++) {
      ctx.beginPath(); ctx.moveTo(0, r*ch); ctx.lineTo(W, r*ch); ctx.stroke();
      const db = maxDb - (r / rows) * dbRange;
      ctx.fillStyle = '#00AA00';
      ctx.font = '10px "Courier New", monospace';
      ctx.fillText(`${db.toFixed(0)}dB`, 5, r*ch - 3);
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
      ctx.strokeStyle = '#FFFF00';
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

    // FFT Spectrum Fill Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(0, 255, 255, 0.4)');
    grad.addColorStop(1, 'rgba(0, 255, 255, 0.0)');

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

    // FFT Cyan Trace Line
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < frequencyData.length; i++) {
      const x = getX(frequencyData[i]);
      const y = Math.max(0, Math.min(H, ((maxDb - magnitudeData[i]) / dbRange) * H));
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fundamental Peak Marker
    if (metrics && metrics.fundamental_freq > 0) {
      const f0 = metrics.fundamental_freq;
      const px = getX(f0);
      const pMag = metrics.peak_magnitude_db || 0;
      const py = Math.max(10, ((maxDb - pMag) / dbRange) * H);

      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(px, py - 10); ctx.lineTo(px, py + 10); ctx.stroke();

      ctx.fillStyle = '#FF0000';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.fillText(`${f0.toFixed(0)}Hz`, Math.min(W - 60, px + 6), py - 6);

      if (showHarmonics) {
        [2, 3, 4, 5].forEach(h => {
          const hf = f0 * h;
          if (hf < maxFreq) {
            const hx = getX(hf);
            ctx.strokeStyle = '#808080';
            ctx.setLineDash([2, 2]);
            ctx.beginPath(); ctx.moveTo(hx, 0); ctx.lineTo(hx, H); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#00FF00';
            ctx.font = '10px "Courier New", monospace';
            ctx.fillText(`${h}H`, hx - 4, 12);
          }
        });
      }
    }

  }, [frequencyData, magnitudeData, metrics, logScale, showPeakHold, showHarmonics]);

  return (
    <div className="win95-outset p-2 flex flex-col gap-2">
      {/* Title Bar */}
      <div className="win95-titlebar">
        <span>Spectrum_Analyzer_FFT.exe</span>
        <div className="flex gap-1">
          <div className="win95-btn-box">_</div>
          <div className="win95-btn-box">□</div>
          <div className="win95-btn-box">✕</div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 py-1 border-b border-[#808080]">
        <div className="flex gap-1">
          <button onClick={() => setLogScale(false)} className={`win95-btn text-xs ${!logScale ? 'bg-[#FFFFFF]' : ''}`}>
            LINEAR
          </button>
          <button onClick={() => setLogScale(true)} className={`win95-btn text-xs ${logScale ? 'bg-[#FFFFFF]' : ''}`}>
            LOG_SCALE
          </button>
        </div>

        <div className="flex gap-1">
          <button onClick={() => setShowPeakHold(!showPeakHold)} className={`win95-btn text-xs ${showPeakHold ? 'text-[#AA5500]' : ''}`}>
            PEAK_HOLD
          </button>
          <button onClick={() => setShowHarmonics(!showHarmonics)} className={`win95-btn text-xs ${showHarmonics ? 'text-[#0000FF]' : ''}`}>
            HARMONICS
          </button>
        </div>
      </div>

      {/* CRT Screen */}
      <div className="win95-crt-screen p-1 relative">
        <canvas ref={canvasRef} width={800} height={360} className="w-full h-[360px] block cursor-crosshair" />
        {metrics && (
          <div className="absolute top-2 right-2 bg-[#000000]/90 border border-[#00FF00] px-2 py-0.5 text-[10px] font-mono text-[#00FF00]">
            THD: {metrics.thd_percent}% | SNR: {metrics.snr_db}dB | SINAD: {metrics.sinad_db || 0}dB
          </div>
        )}
      </div>
    </div>
  );
}
