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

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Graticule
    const rows = 6, cols = 8;
    const cw = W / cols, ch = H / rows;

    ctx.strokeStyle = '#151920';
    ctx.lineWidth = 1;
    for (let r = 1; r < rows; r++) {
      ctx.beginPath(); ctx.moveTo(0, r*ch); ctx.lineTo(W, r*ch); ctx.stroke();
      const db = maxDb - (r / rows) * dbRange;
      ctx.fillStyle = '#4b5260';
      ctx.font = '500 9px "JetBrains Mono"';
      ctx.fillText(`${db.toFixed(0)}`, 5, r*ch - 3);
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

    // Peak hold
    if (peakHoldRef.current.length !== magnitudeData.length) {
      peakHoldRef.current = [...magnitudeData];
    } else {
      for (let i = 0; i < magnitudeData.length; i++) {
        peakHoldRef.current[i] = Math.max(peakHoldRef.current[i] - 0.3, magnitudeData[i]);
      }
    }

    if (showPeakHold) {
      ctx.strokeStyle = '#f59e0b';
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

    // FFT fill gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(139,92,246,0.35)');
    grad.addColorStop(1, 'rgba(139,92,246,0)');

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

    // FFT line
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < frequencyData.length; i++) {
      const x = getX(frequencyData[i]);
      const y = Math.max(0, Math.min(H, ((maxDb - magnitudeData[i]) / dbRange) * H));
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Peak & harmonics
    if (metrics && metrics.fundamental_freq > 0) {
      const f0 = metrics.fundamental_freq;
      const px = getX(f0);
      const pMag = metrics.peak_magnitude_db || 0;
      const py = Math.max(10, ((maxDb - pMag) / dbRange) * H);

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, py - 10); ctx.lineTo(px, py + 10); ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.font = '600 10px "JetBrains Mono"';
      ctx.fillText(`${f0.toFixed(0)} Hz`, Math.min(W - 60, px + 6), py - 6);

      if (showHarmonics) {
        [2, 3, 4, 5].forEach(h => {
          const hf = f0 * h;
          if (hf < maxFreq) {
            const hx = getX(hf);
            ctx.strokeStyle = '#232830';
            ctx.setLineDash([2, 2]);
            ctx.beginPath(); ctx.moveTo(hx, 0); ctx.lineTo(hx, H); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#4b5260';
            ctx.font = '500 9px "JetBrains Mono"';
            ctx.fillText(`${h}H`, hx - 4, 12);
          }
        });
      }
    }

  }, [frequencyData, magnitudeData, metrics, logScale, showPeakHold, showHarmonics]);

  return (
    <div className="panel p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="ctrl-label" style={{ fontSize: '11px', letterSpacing: '0.08em' }}>Spectrum Analyzer</span>
        <div className="flex items-center gap-2">
          <div className="tab-bar" style={{ padding: '2px' }}>
            <button onClick={() => setLogScale(false)} className={`tab-btn ${!logScale ? 'active' : ''}`} style={{ padding: '3px 10px', fontSize: '10.5px' }}>Lin</button>
            <button onClick={() => setLogScale(true)} className={`tab-btn ${logScale ? 'active' : ''}`} style={{ padding: '3px 10px', fontSize: '10.5px' }}>Log</button>
          </div>
          <button onClick={() => setShowPeakHold(!showPeakHold)} className="btn" style={{ padding: '3px 8px', fontSize: '10px', color: showPeakHold ? '#f59e0b' : undefined }}>Peak</button>
          <button onClick={() => setShowHarmonics(!showHarmonics)} className="btn" style={{ padding: '3px 8px', fontSize: '10px', color: showHarmonics ? '#8b5cf6' : undefined }}>nH</button>
        </div>
      </div>

      <div className="scope-display">
        <canvas ref={canvasRef} width={800} height={380} style={{ height: 380 }} />
        {metrics && (
          <div className="scope-overlay">
            <span style={{ color: '#10b981' }}>THD {metrics.thd_percent}%</span>
            <span style={{ color: '#3b82f6' }}>SNR {metrics.snr_db}dB</span>
            <span style={{ color: '#f59e0b' }}>SINAD {metrics.sinad_db || 0}dB</span>
          </div>
        )}
      </div>
    </div>
  );
}
