import React, { useRef, useEffect, useState } from 'react';

export default function Oscilloscope({ timeData, rawSignal, filteredSignal, envelopeSignal, sampleRate }) {
  const canvasRef = useRef(null);
  const [displayMode, setDisplayMode] = useState('time');
  const [timeDiv, setTimeDiv] = useState(2);
  const [voltsDiv, setVoltsDiv] = useState(1);
  const [showCh1, setShowCh1] = useState(true);
  const [showCh2, setShowCh2] = useState(true);
  const [cursorPos, setCursorPos] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Graticule
    const cols = 10, rows = 8;
    const cw = W / cols, ch = H / rows;

    ctx.strokeStyle = '#151920';
    ctx.lineWidth = 1;
    for (let i = 1; i < cols; i++) { ctx.beginPath(); ctx.moveTo(i*cw, 0); ctx.lineTo(i*cw, H); ctx.stroke(); }
    for (let j = 1; j < rows; j++) { ctx.beginPath(); ctx.moveTo(0, j*ch); ctx.lineTo(W, j*ch); ctx.stroke(); }

    // Center cross
    ctx.strokeStyle = '#232830';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, H/2); ctx.lineTo(W, H/2);
    ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    if (displayMode === 'xy') {
      if (!rawSignal || !filteredSignal || rawSignal.length === 0) return;
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      const n = Math.min(rawSignal.length, filteredSignal.length);
      for (let i = 0; i < n; i++) {
        const x = W/2 + (rawSignal[i] / voltsDiv) * cw;
        const y = H/2 - (filteredSignal[i] / voltsDiv) * ch;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
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

    if (showCh1 && rawSignal) drawTrace(rawSignal, '#3b82f6', 1.8);
    if (showCh2 && filteredSignal) drawTrace(filteredSignal, '#10b981', 2);
    if (envelopeSignal) drawTrace(envelopeSignal, '#f59e0b', 1.2);

    // Cursor readout
    if (cursorPos) {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(cursorPos.x, 0); ctx.lineTo(cursorPos.x, H);
      ctx.moveTo(0, cursorPos.y); ctx.lineTo(W, cursorPos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const vVal = ((H/2 - cursorPos.y) / ch) * voltsDiv;
      const tVal = (cursorPos.x / W) * totalMs;

      ctx.fillStyle = 'rgba(8,9,12,0.85)';
      ctx.fillRect(cursorPos.x + 8, cursorPos.y - 22, 130, 18);
      ctx.fillStyle = '#eaf0f6';
      ctx.font = '500 10px "JetBrains Mono"';
      ctx.fillText(`T:${tVal.toFixed(2)}ms  V:${vVal.toFixed(2)}V`, cursorPos.x + 12, cursorPos.y - 8);
    }

  }, [timeData, rawSignal, filteredSignal, envelopeSignal, displayMode, timeDiv, voltsDiv, showCh1, showCh2, cursorPos, sampleRate]);

  return (
    <div className="panel p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="ctrl-label" style={{ fontSize: '11px', letterSpacing: '0.08em' }}>Oscilloscope</span>
        <div className="flex items-center gap-2">
          <div className="tab-bar" style={{ padding: '2px' }}>
            <button onClick={() => setDisplayMode('time')} className={`tab-btn ${displayMode === 'time' ? 'active' : ''}`} style={{ padding: '3px 10px', fontSize: '10.5px' }}>Time</button>
            <button onClick={() => setDisplayMode('xy')} className={`tab-btn ${displayMode === 'xy' ? 'active' : ''}`} style={{ padding: '3px 10px', fontSize: '10.5px' }}>XY</button>
          </div>
          <button onClick={() => setShowCh1(!showCh1)} className="btn" style={{ padding: '3px 8px', fontSize: '10px', color: showCh1 ? '#3b82f6' : undefined }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }}></span> CH1
          </button>
          <button onClick={() => setShowCh2(!showCh2)} className="btn" style={{ padding: '3px 8px', fontSize: '10px', color: showCh2 ? '#10b981' : undefined }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span> CH2
          </button>
        </div>
      </div>

      <div className="scope-display">
        <canvas
          ref={canvasRef}
          width={800}
          height={380}
          style={{ height: 380 }}
          onMouseMove={(e) => {
            const r = canvasRef.current.getBoundingClientRect();
            setCursorPos({ x: e.clientX - r.left, y: e.clientY - r.top });
          }}
          onMouseLeave={() => setCursorPos(null)}
        />
        <div className="scope-overlay">
          <span style={{ color: '#3b82f6' }}>CH1</span>
          <span style={{ color: '#10b981' }}>CH2</span>
          <span>{timeDiv}ms/div</span>
          <span>{voltsDiv}V/div</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="ctrl-label">Time/Div</span>
          <select value={timeDiv} onChange={(e) => setTimeDiv(parseFloat(e.target.value))} style={{ width: 72 }}>
            <option value="0.2">0.2 ms</option><option value="0.5">0.5 ms</option><option value="1">1 ms</option>
            <option value="2">2 ms</option><option value="5">5 ms</option><option value="10">10 ms</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="ctrl-label">V/Div</span>
          <select value={voltsDiv} onChange={(e) => setVoltsDiv(parseFloat(e.target.value))} style={{ width: 72 }}>
            <option value="0.1">0.1 V</option><option value="0.2">0.2 V</option><option value="0.5">0.5 V</option>
            <option value="1">1 V</option><option value="2">2 V</option><option value="5">5 V</option>
          </select>
        </div>
      </div>
    </div>
  );
}
