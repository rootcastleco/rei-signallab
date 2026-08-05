import React, { useRef, useEffect, useState } from 'react';
import { Activity, Compass, Crosshair } from 'lucide-react';

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

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    const cols = 10, rows = 8;
    const cw = W / cols, ch = H / rows;

    ctx.strokeStyle = '#181C24';
    ctx.lineWidth = 1;
    for (let i = 1; i < cols; i++) { ctx.beginPath(); ctx.moveTo(i*cw, 0); ctx.lineTo(i*cw, H); ctx.stroke(); }
    for (let j = 1; j < rows; j++) { ctx.beginPath(); ctx.moveTo(0, j*ch); ctx.lineTo(W, j*ch); ctx.stroke(); }

    ctx.strokeStyle = '#2D3748';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(0, H/2); ctx.lineTo(W, H/2);
    ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    if (displayMode === 'xy') {
      if (!rawSignal || !filteredSignal || rawSignal.length === 0) return;
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 1.6;
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

    if (showCh1 && rawSignal) drawTrace(rawSignal, '#3B82F6', 1.8);
    if (showCh2 && filteredSignal) drawTrace(filteredSignal, '#10B981', 2.0);
    if (envelopeSignal) drawTrace(envelopeSignal, '#F59E0B', 1.2);

    if (cursorPos) {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(cursorPos.x, 0); ctx.lineTo(cursorPos.x, H);
      ctx.moveTo(0, cursorPos.y); ctx.lineTo(W, cursorPos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const vVal = ((H/2 - cursorPos.y) / ch) * voltsDiv;
      const tVal = (cursorPos.x / W) * totalMs;

      ctx.fillStyle = 'rgba(12, 14, 18, 0.9)';
      ctx.fillRect(cursorPos.x + 8, cursorPos.y - 24, 130, 20);
      ctx.fillStyle = '#EAF0F6';
      ctx.font = '500 10px "JetBrains Mono"';
      ctx.fillText(`T:${tVal.toFixed(2)}ms  V:${vVal.toFixed(2)}V`, cursorPos.x + 12, cursorPos.y - 10);
    }

  }, [timeData, rawSignal, filteredSignal, envelopeSignal, displayMode, timeDiv, voltsDiv, showCh1, showCh2, cursorPos, sampleRate]);

  return (
    <div className="studio-panel p-3 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#232830] pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-xs text-[#EAF0F6]">OSCILLOSCOPE & XY PHASE INSTRUMENT</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="studio-tabs">
            <button
              onClick={() => setDisplayMode('time')}
              className={`studio-tab ${displayMode === 'time' ? 'active' : ''}`}
            >
              Time Domain
            </button>
            <button
              onClick={() => setDisplayMode('xy')}
              className={`studio-tab ${displayMode === 'xy' ? 'active' : ''}`}
            >
              <Compass className="w-3 h-3 text-sky-400" /> XY Plot
            </button>
          </div>

          <button
            onClick={() => setShowCh1(!showCh1)}
            className={`btn text-xs ${showCh1 ? 'text-sky-400 border-sky-500/40 bg-sky-500/10' : ''}`}
          >
            CH1 Raw
          </button>

          <button
            onClick={() => setShowCh2(!showCh2)}
            className={`btn text-xs ${showCh2 ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' : ''}`}
          >
            CH2 Filtered
          </button>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-[#7C8594]">Time/Div:</span>
            <select value={timeDiv} onChange={(e) => setTimeDiv(parseFloat(e.target.value))}>
              <option value="0.2">0.2 ms</option>
              <option value="0.5">0.5 ms</option>
              <option value="1">1.0 ms</option>
              <option value="2">2.0 ms</option>
              <option value="5">5.0 ms</option>
              <option value="10">10.0 ms</option>
            </select>

            <span className="text-[#7C8594] ml-1">Volts/Div:</span>
            <select value={voltsDiv} onChange={(e) => setVoltsDiv(parseFloat(e.target.value))}>
              <option value="0.1">0.1 V</option>
              <option value="0.2">0.2 V</option>
              <option value="0.5">0.5 V</option>
              <option value="1">1.0 V</option>
              <option value="2">2.0 V</option>
              <option value="5">5.0 V</option>
            </select>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded bg-black">
        <canvas
          ref={canvasRef}
          width={800}
          height={360}
          onMouseMove={(e) => {
            const rect = canvasRef.current.getBoundingClientRect();
            setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }}
          onMouseLeave={() => setCursorPos(null)}
          className="oscilloscope-canvas w-full h-[360px] cursor-crosshair block"
        />

        <div className="absolute top-2 right-2 flex items-center gap-3 bg-[#0C0E12]/90 border border-[#232830] rounded px-2.5 py-1 text-[11px] font-mono text-[#7C8594]">
          <span className="text-sky-400">CH1: {voltsDiv}V/div</span>
          <span className="text-emerald-400">CH2: {voltsDiv}V/div</span>
          <span className="text-amber-400">TB: {timeDiv}ms/div</span>
        </div>
      </div>
    </div>
  );
}
