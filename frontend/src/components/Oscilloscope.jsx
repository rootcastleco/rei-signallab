import React, { useRef, useEffect, useState } from 'react';
import { Activity, Crosshair, Compass } from 'lucide-react';

export default function Oscilloscope({ timeData, rawSignal, filteredSignal, envelopeSignal, sampleRate }) {
  const canvasRef = useRef(null);
  const [displayMode, setDisplayMode] = useState('time');
  const [timeDiv, setTimeDiv] = useState(2);
  const [voltsDiv, setVoltsDiv] = useState(1);
  const [showRaw, setShowRaw] = useState(true);
  const [showFiltered, setShowFiltered] = useState(true);
  const [showEnvelope, setShowEnvelope] = useState(true);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorActive, setCursorActive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Solid Black Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Clean Technical Graticule (10 Cols, 8 Rows)
    const gridCols = 10;
    const gridRows = 8;
    const cellW = width / gridCols;
    const cellH = height / gridRows;

    ctx.strokeStyle = '#1C2128';
    ctx.lineWidth = 1;

    for (let i = 1; i < gridCols; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellW, 0);
      ctx.lineTo(i * cellW, height);
      ctx.stroke();
    }
    for (let j = 1; j < gridRows; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * cellH);
      ctx.lineTo(width, j * cellH);
      ctx.stroke();
    }

    // Main Axes
    ctx.strokeStyle = '#30363D';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);

    if (displayMode === 'xy') {
      // XY Lissajous Plot Mode
      if (!rawSignal || !filteredSignal || rawSignal.length === 0) return;

      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const numPts = Math.min(rawSignal.length, filteredSignal.length);
      for (let i = 0; i < numPts; i++) {
        const xVal = rawSignal[i];
        const yVal = filteredSignal[i];

        const x = width / 2 + (xVal / voltsDiv) * cellW;
        const y = height / 2 - (yVal / voltsDiv) * cellH;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#8B949E';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText('XY Phase Trajectory (CH1 vs CH2)', 10, 18);
      return;
    }

    // Time Domain Plot Mode
    if (!timeData || timeData.length === 0) return;

    const totalTimeMs = gridCols * timeDiv;
    const dtSeconds = totalTimeMs / 1000.0;
    const maxSamplesToShow = Math.min(timeData.length, Math.floor(dtSeconds * (sampleRate || 44100)));

    const plotWaveform = (signal, color, lineWidth = 1.5) => {
      if (!signal || signal.length === 0) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();

      const step = maxSamplesToShow / width;
      for (let x = 0; x < width; x++) {
        const idx = Math.floor(x * step);
        if (idx >= signal.length) break;

        const val = signal[idx];
        const y = height / 2 - (val / voltsDiv) * cellH;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    // Raw Signal (Sky Blue)
    if (showRaw && rawSignal) {
      plotWaveform(rawSignal, '#38BDF8', 1.5);
    }

    // Filtered Signal (Mint Green)
    if (showFiltered && filteredSignal) {
      plotWaveform(filteredSignal, '#34D399', 1.8);
    }

    // Envelope Signal (Amber)
    if (showEnvelope && envelopeSignal) {
      plotWaveform(envelopeSignal, '#FBBF24', 1.2);
    }

    // Technical Cursor Overlay
    if (cursorActive) {
      ctx.strokeStyle = '#8B949E';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(cursorPos.x, 0);
      ctx.lineTo(cursorPos.x, height);
      ctx.moveTo(0, cursorPos.y);
      ctx.lineTo(width, cursorPos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const cursorV = ((height / 2 - cursorPos.y) / cellH) * voltsDiv;
      const cursorTimeMs = (cursorPos.x / width) * totalTimeMs;

      ctx.fillStyle = '#F0F6FC';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText(`T: ${cursorTimeMs.toFixed(2)} ms | V: ${cursorV.toFixed(2)} V`, cursorPos.x + 6, cursorPos.y - 6);
    }

  }, [timeData, rawSignal, filteredSignal, envelopeSignal, displayMode, timeDiv, voltsDiv, showRaw, showFiltered, showEnvelope, cursorActive, cursorPos, sampleRate]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div className="studio-panel p-3 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363D] pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-xs text-[#F0F6FC]">OSCILLOSCOPE & XY PHASE INSTRUMENT</span>
        </div>

        <div className="studio-tabs">
          <button
            onClick={() => setDisplayMode('time')}
            className={`studio-tab-item ${displayMode === 'time' ? 'active' : ''}`}
          >
            Time Domain
          </button>
          <button
            onClick={() => setDisplayMode('xy')}
            className={`studio-tab-item flex items-center gap-1 ${displayMode === 'xy' ? 'active' : ''}`}
          >
            <Compass className="w-3 h-3 text-sky-400" /> XY Plot
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className={`btn-secondary text-xs flex items-center gap-1 ${showRaw ? 'bg-[#1F2937] text-sky-400' : ''}`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-400"></span> CH1 Raw
          </button>

          <button
            onClick={() => setShowFiltered(!showFiltered)}
            className={`btn-secondary text-xs flex items-center gap-1 ${showFiltered ? 'bg-[#1F2937] text-emerald-400' : ''}`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> CH2 Filtered
          </button>

          <button
            onClick={() => setCursorActive(!cursorActive)}
            className={`btn-secondary text-xs flex items-center gap-1 ${cursorActive ? 'bg-[#1F2937] text-amber-400' : ''}`}
          >
            <Crosshair className="w-3 h-3" /> Cursor
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#8B949E] font-mono">Time/Div:</span>
          <select value={timeDiv} onChange={(e) => setTimeDiv(parseFloat(e.target.value))}>
            <option value="0.2">0.2 ms</option>
            <option value="0.5">0.5 ms</option>
            <option value="1">1.0 ms</option>
            <option value="2">2.0 ms</option>
            <option value="5">5.0 ms</option>
            <option value="10">10.0 ms</option>
          </select>

          <span className="text-[#8B949E] font-mono ml-1">Volts/Div:</span>
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

      <div className="relative w-full overflow-hidden rounded bg-black">
        <canvas
          ref={canvasRef}
          width={800}
          height={360}
          onMouseMove={handleMouseMove}
          className="oscilloscope-canvas w-full h-[360px] cursor-crosshair block"
        />

        <div className="absolute top-2 right-2 flex items-center gap-3 bg-[#0D1117]/90 border border-[#30363D] rounded px-2 py-0.5 text-[11px] font-mono text-[#8B949E]">
          <span className="text-sky-400">CH1: {voltsDiv}V/div</span>
          <span className="text-emerald-400">CH2: {voltsDiv}V/div</span>
          <span className="text-amber-400">TB: {timeDiv}ms/div</span>
        </div>
      </div>
    </div>
  );
}
