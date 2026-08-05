import React, { useRef, useEffect, useState } from 'react';
import { BarChart2, Activity } from 'lucide-react';

export default function SpectrumAnalyzer({ frequencyData, magnitudeData, metrics }) {
  const canvasRef = useRef(null);
  const [logScale, setLogScale] = useState(false);
  const [showPeakHold, setShowPeakHold] = useState(true);
  const [showHarmonics, setShowHarmonics] = useState(true);
  const [harmonicMode, setHarmonicMode] = useState('spectrum'); // 'spectrum' | 'harmonic_bars'
  const peakHoldRef = useRef([]);

  const f0 = metrics?.fundamental_freq || 440;

  // Calculate 1X..5X harmonic magnitude values
  const getHarmonicMagnitude = (harmMult) => {
    if (!frequencyData || !magnitudeData || frequencyData.length === 0) return -60;
    const targetF = f0 * harmMult;
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < frequencyData.length; i++) {
      const diff = Math.abs(frequencyData[i] - targetF);
      if (diff < minDiff) { minDiff = diff; closestIdx = i; }
    }
    return magnitudeData[closestIdx] || -60;
  };

  const harmonicsList = [1, 2, 3, 4, 5, 6].map(h => ({
    order: `${h}X`,
    freq: f0 * h,
    magDb: getHarmonicMagnitude(h)
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const minDb = -100, maxDb = 20, dbRange = maxDb - minDb;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    if (harmonicMode === 'harmonic_bars') {
      // 3D Harmonic Order Bar Chart View
      const barW = (W - 100) / harmonicsList.length;
      ctx.strokeStyle = '#003300';
      ctx.lineWidth = 0.5;
      for (let y = 40; y < H - 40; y += 40) {
        ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(W - 20, y); ctx.stroke();
        const db = maxDb - ((y - 40) / (H - 80)) * dbRange;
        ctx.fillStyle = '#00AA00';
        ctx.font = '10px monospace';
        ctx.fillText(`${db.toFixed(0)}dB`, 10, y + 3);
      }

      harmonicsList.forEach((h, idx) => {
        const bx = 60 + idx * barW;
        const norm = Math.max(0, Math.min(1, (h.magDb - minDb) / dbRange));
        const bh = norm * (H - 80);
        const by = H - 40 - bh;

        const grad = ctx.createLinearGradient(0, by, 0, H - 40);
        grad.addColorStop(0, idx === 0 ? '#00FF00' : '#00FFFF');
        grad.addColorStop(1, '#003300');

        ctx.fillStyle = grad;
        ctx.fillRect(bx + 10, by, barW - 20, bh);
        ctx.strokeStyle = '#FFFFFF';
        ctx.strokeRect(bx + 10, by, barW - 20, bh);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(h.order, bx + barW / 2 - 8, H - 20);
        ctx.fillStyle = '#00FFFF';
        ctx.font = '10px monospace';
        ctx.fillText(`${h.freq.toFixed(0)}Hz`, bx + barW / 2 - 18, H - 5);
        ctx.fillStyle = '#FFFF00';
        ctx.fillText(`${h.magDb.toFixed(1)}dB`, bx + barW / 2 - 18, by - 6);
      });

      ctx.fillStyle = '#00FF00';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('FFT Order Harmonic Analysis Spectrum Bar View (1X - 6X Order)', 60, 25);
      return;
    }

    // Standard FFT Spectrum Analyzer View
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

    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < frequencyData.length; i++) {
      const x = getX(frequencyData[i]);
      const y = Math.max(0, Math.min(H, ((maxDb - magnitudeData[i]) / dbRange) * H));
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (metrics && metrics.fundamental_freq > 0) {
      const px = getX(f0);
      const pMag = metrics.peak_magnitude_db || 0;
      const py = Math.max(10, ((maxDb - pMag) / dbRange) * H);

      ctx.strokeStyle = '#FF0000';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, py - 12); ctx.lineTo(px, py + 12); ctx.stroke();

      ctx.fillStyle = '#FF0000';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.fillText(`1X: ${f0.toFixed(0)}Hz`, Math.min(W - 70, px + 6), py - 6);

      if (showHarmonics) {
        [2, 3, 4, 5].forEach(h => {
          const hf = f0 * h;
          if (hf < maxFreq) {
            const hx = getX(hf);
            ctx.strokeStyle = '#FFFF00';
            ctx.setLineDash([2, 2]);
            ctx.beginPath(); ctx.moveTo(hx, 0); ctx.lineTo(hx, H); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#00FF00';
            ctx.font = '10px "Courier New", monospace';
            ctx.fillText(`${h}X`, hx - 4, 14);
          }
        });
      }
    }

  }, [frequencyData, magnitudeData, metrics, logScale, showPeakHold, showHarmonics, harmonicMode, f0]);

  return (
    <div className="win98-outset p-2 flex flex-col gap-2">
      {/* Title Bar */}
      <div className="win98-titlebar">
        <span>Spectrum_Analyzer_FFT.exe - [Harmonic Order Telemetry]</span>
        <div className="flex gap-1">
          <div className="win98-btn-box">_</div>
          <div className="win98-btn-box">□</div>
          <div className="win98-btn-box">✕</div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 py-1 border-b border-[#808080]">
        <div className="flex gap-1">
          <button onClick={() => setHarmonicMode('spectrum')} className={`win98-btn text-xs ${harmonicMode === 'spectrum' ? 'bg-[#FFFFFF]' : ''}`}>
            SPECTRUM_VIEW
          </button>
          <button onClick={() => setHarmonicMode('harmonic_bars')} className={`win98-btn text-xs ${harmonicMode === 'harmonic_bars' ? 'bg-[#FFFFFF] text-[#0000FF]' : ''}`}>
            HARMONIC_BARS (1X-6X)
          </button>
        </div>

        <div className="flex gap-1">
          <button onClick={() => setLogScale(!logScale)} className={`win98-btn text-xs ${logScale ? 'bg-[#FFFFFF]' : ''}`}>
            {logScale ? 'LOG_SCALE' : 'LINEAR'}
          </button>
          <button onClick={() => setShowPeakHold(!showPeakHold)} className={`win98-btn text-xs ${showPeakHold ? 'text-[#AA5500]' : ''}`}>
            PEAK_HOLD
          </button>
          <button onClick={() => setShowHarmonics(!showHarmonics)} className={`win98-btn text-xs ${showHarmonics ? 'text-[#0000FF]' : ''}`}>
            HARMONICS
          </button>
        </div>
      </div>

      {/* CRT Screen */}
      <div className="win98-crt-screen p-1 relative">
        <canvas ref={canvasRef} width={800} height={340} className="w-full h-[340px] block cursor-crosshair" />
      </div>

      {/* Harmonic Telemetry HUD Bar */}
      <div className="win98-outset p-1 flex items-center justify-between flex-wrap gap-2 bg-[#C0C0C0] text-xs font-mono">
        <span className="font-bold text-[#000080]">Harmonics:</span>
        {harmonicsList.slice(0, 5).map(h => (
          <div key={h.order} className="flex items-center gap-1">
            <span className="font-bold text-[#000000]">{h.order}:</span>
            <span className="bg-[#000000] text-[#00FF00] px-1">{h.freq.toFixed(0)}Hz ({h.magDb.toFixed(1)}dB)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
