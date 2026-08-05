import React, { useRef, useEffect, useState } from 'react';

export default function Oscilloscope({ timeData, rawSignal, filteredSignal, envelopeSignal, sampleRate }) {
  const canvasRef = useRef(null);
  const [displayMode, setDisplayMode] = useState('time');
  const [timeDiv, setTimeDiv] = useState(2);
  const [voltsDiv, setVoltsDiv] = useState(1);
  const [showCh1, setShowCh1] = useState(true);
  const [showCh2, setShowCh2] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    const cols = 10, rows = 8;
    const cw = W / cols, ch = H / rows;

    ctx.strokeStyle = '#003300';
    ctx.lineWidth = 1;
    for (let i = 1; i < cols; i++) { ctx.beginPath(); ctx.moveTo(i*cw, 0); ctx.lineTo(i*cw, H); ctx.stroke(); }
    for (let j = 1; j < rows; j++) { ctx.beginPath(); ctx.moveTo(0, j*ch); ctx.lineTo(W, j*ch); ctx.stroke(); }

    ctx.strokeStyle = '#006600';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(0, H/2); ctx.lineTo(W, H/2);
    ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    if (displayMode === 'xy') {
      if (!rawSignal || !filteredSignal || rawSignal.length === 0) return;
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      const n = Math.min(rawSignal.length, filteredSignal.length);
      for (let i = 0; i < n; i++) {
        const x = W/2 + (rawSignal[i] / voltsDiv) * cw;
        const y = H/2 - (filteredSignal[i] / voltsDiv) * ch;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      return;
    }

    if (!timeData || timeData.length === 0) return;

    const totalMs = cols * timeDiv;
    const dtSec = totalMs / 1000;
    const maxSamples = Math.min(timeData.length, Math.floor(dtSec * (sampleRate || 44100)));

    const drawTrace = (sig, color, lw) => {
      if (!sig || sig.length === 0) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.beginPath();
      const step = maxSamples / W;
      for (let x = 0; x < W; x++) {
        const idx = Math.floor(x * step);
        if (idx >= sig.length) break;
        const y = H/2 - (sig[idx] / voltsDiv) * ch;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    if (showCh1 && rawSignal) drawTrace(rawSignal, '#00FFFF', 1.8);
    if (showCh2 && filteredSignal) drawTrace(filteredSignal, '#00FF00', 2.0);
    if (envelopeSignal) drawTrace(envelopeSignal, '#FFFF00', 1.2);

  }, [timeData, rawSignal, filteredSignal, envelopeSignal, displayMode, timeDiv, voltsDiv, showCh1, showCh2, sampleRate]);

  return (
    <div className="win98-outset p-2 flex flex-col gap-2">
      {/* Title Bar */}
      <div className="win98-titlebar">
        <span>Oscilloscope_CRT_98.exe</span>
        <div className="flex gap-1">
          <div className="win98-btn-box">_</div>
          <div className="win98-btn-box">□</div>
          <div className="win98-btn-box">✕</div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 py-1 border-b border-[#808080]">
        <div className="flex gap-1">
          <button onClick={() => setDisplayMode('time')} className={`win98-btn text-xs ${displayMode === 'time' ? 'bg-[#FFFFFF]' : ''}`}>
            TIME_DOMAIN
          </button>
          <button onClick={() => setDisplayMode('xy')} className={`win98-btn text-xs ${displayMode === 'xy' ? 'bg-[#FFFFFF]' : ''}`}>
            XY_LISSAJOUS
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowCh1(!showCh1)} className={`win98-btn text-xs ${showCh1 ? 'text-[#0000FF]' : ''}`}>
            CH1 (CYAN)
          </button>
          <button onClick={() => setShowCh2(!showCh2)} className={`win98-btn text-xs ${showCh2 ? 'text-[#00AA00]' : ''}`}>
            CH2 (GREEN)
          </button>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span>TB:</span>
          <select value={timeDiv} onChange={(e) => setTimeDiv(parseFloat(e.target.value))}>
            <option value="0.2">0.2ms</option>
            <option value="0.5">0.5ms</option>
            <option value="1">1.0ms</option>
            <option value="2">2.0ms</option>
            <option value="5">5.0ms</option>
            <option value="10">10.0ms</option>
          </select>

          <span>V/DIV:</span>
          <select value={voltsDiv} onChange={(e) => setVoltsDiv(parseFloat(e.target.value))}>
            <option value="0.1">0.1V</option>
            <option value="0.2">0.2V</option>
            <option value="0.5">0.5V</option>
            <option value="1">1.0V</option>
            <option value="2">2.0V</option>
            <option value="5">5.0V</option>
          </select>
        </div>
      </div>

      {/* Sunken CRT Display */}
      <div className="win98-crt-screen p-1 relative">
        <canvas ref={canvasRef} width={800} height={360} className="w-full h-[360px] block cursor-crosshair" />
        <div className="absolute top-2 right-2 bg-[#000000]/80 border border-[#00FF00] px-2 py-0.5 text-[10px] font-mono text-[#00FF00]">
          CH1: {voltsDiv}V | CH2: {voltsDiv}V | {timeDiv}ms/DIV
        </div>
      </div>
    </div>
  );
}
