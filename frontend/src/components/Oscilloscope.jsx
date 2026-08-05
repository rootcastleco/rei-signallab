import React, { useRef, useEffect, useState } from 'react';
import { Activity, Crosshair, RefreshCw, Zap, Compass } from 'lucide-react';

export default function Oscilloscope({ timeData, rawSignal, filteredSignal, envelopeSignal, sampleRate }) {
  const canvasRef = useRef(null);
  const [displayMode, setDisplayMode] = useState('time'); // 'time' (Time Domain) or 'xy' (Lissajous XY Plot)
  const [timeDiv, setTimeDiv] = useState(2);
  const [voltsDiv, setVoltsDiv] = useState(1);
  const [showRaw, setShowRaw] = useState(true);
  const [showFiltered, setShowFiltered] = useState(true);
  const [showEnvelope, setShowEnvelope] = useState(true);
  const [triggerLevel, setTriggerLevel] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorActive, setCursorActive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear with slight CRT trail persistence
    ctx.fillStyle = '#04060A';
    ctx.fillRect(0, 0, width, height);

    // CRT Graticule Grid
    const gridCols = 10;
    const gridRows = 8;
    const cellW = width / gridCols;
    const cellH = height / gridRows;

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
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

    // Center Crosshair
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);

    if (displayMode === 'xy') {
      // ----------------------------------------------------
      // LISSAJOUS XY PHASE PLOT MODE (CH1 vs CH2)
      // ----------------------------------------------------
      if (!rawSignal || !filteredSignal || rawSignal.length === 0) return;

      ctx.shadowColor = '#00F0FF';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 2;
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
      ctx.shadowBlur = 0;

      // Label Overlay
      ctx.fillStyle = '#38BDF8';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText('XY Phase Space Trajectory (CH1 vs CH2)', 12, 20);
      return;
    }

    // ----------------------------------------------------
    // TIME DOMAIN WAVEFORM MODE
    // ----------------------------------------------------

    // Trigger Level Line
    const triggerY = height / 2 - (triggerLevel / voltsDiv) * cellH;
    ctx.strokeStyle = 'rgba(255, 159, 10, 0.6)';
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(0, triggerY);
    ctx.lineTo(width, triggerY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!timeData || timeData.length === 0) return;

    const totalTimeMs = gridCols * timeDiv;
    const dtSeconds = totalTimeMs / 1000.0;
    const maxSamplesToShow = Math.min(timeData.length, Math.floor(dtSeconds * (sampleRate || 44100)));

    const plotWaveform = (signal, color, glowColor, lineWidth = 2) => {
      if (!signal || signal.length === 0) return;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10;
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
      ctx.shadowBlur = 0;
    };

    // Plot CH1 Raw (Cyan)
    if (showRaw && rawSignal) {
      plotWaveform(rawSignal, '#00F0FF', 'rgba(0, 240, 255, 0.5)', 2);
    }

    // Plot CH2 Filtered (Emerald)
    if (showFiltered && filteredSignal) {
      plotWaveform(filteredSignal, '#30D158', 'rgba(48, 209, 88, 0.6)', 2.5);
    }

    // Plot Hilbert Envelope (Amber Dotted)
    if (showEnvelope && envelopeSignal) {
      plotWaveform(envelopeSignal, '#FF9F0A', 'rgba(255, 159, 10, 0.6)', 1.5);
    }

    // Interactive Cursor Overlay
    if (cursorActive) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
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

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText(`T: ${cursorTimeMs.toFixed(2)} ms | V: ${cursorV.toFixed(2)} V`, cursorPos.x + 8, cursorPos.y - 8);
    }

  }, [timeData, rawSignal, filteredSignal, envelopeSignal, displayMode, timeDiv, voltsDiv, showRaw, showFiltered, showEnvelope, triggerLevel, cursorActive, cursorPos, sampleRate]);

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
    <div className="glass-panel p-4 flex flex-col gap-3">
      {/* Control Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-sky-400" />
          <span className="font-semibold text-sm tracking-wide text-white">CRT OSCILLOSCOPE & XY PHASE INSTRUMENT</span>
        </div>

        {/* Display Mode Segmented Toggle */}
        <div className="apple-segmented">
          <button
            onClick={() => setDisplayMode('time')}
            className={`apple-segmented-item ${displayMode === 'time' ? 'active' : ''}`}
          >
            Time Domain
          </button>
          <button
            onClick={() => setDisplayMode('xy')}
            className={`apple-segmented-item flex items-center gap-1 ${displayMode === 'xy' ? 'active' : ''}`}
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" /> XY Lissajous Plot
          </button>
        </div>

        {/* Channel Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 border ${
              showRaw ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-white/5 text-gray-400 border-white/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span> CH1 Raw
          </button>

          <button
            onClick={() => setShowFiltered(!showFiltered)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 border ${
              showFiltered ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-white/5 text-gray-400 border-white/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> CH2 Filtered
          </button>

          {envelopeSignal && (
            <button
              onClick={() => setShowEnvelope(!showEnvelope)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 border ${
                showEnvelope ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-white/5 text-gray-400 border-white/10'
              }`}
            >
              Envelope
            </button>
          )}

          <button
            onClick={() => setCursorActive(!cursorActive)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 border ${
              cursorActive ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-white/5 text-gray-400 border-white/10'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" /> Cursor
          </button>
        </div>

        {/* Time / Volts Selectors */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-gray-400 font-mono">TB:</span>
            <select
              value={timeDiv}
              onChange={(e) => setTimeDiv(parseFloat(e.target.value))}
              className="bg-black/60 border border-white/15 text-sky-300 rounded px-2 py-1 font-mono focus:outline-none"
            >
              <option value="0.2">0.2 ms</option>
              <option value="0.5">0.5 ms</option>
              <option value="1">1.0 ms</option>
              <option value="2">2.0 ms</option>
              <option value="5">5.0 ms</option>
              <option value="10">10.0 ms</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-gray-400 font-mono">V/Div:</span>
            <select
              value={voltsDiv}
              onChange={(e) => setVoltsDiv(parseFloat(e.target.value))}
              className="bg-black/60 border border-white/15 text-emerald-300 rounded px-2 py-1 font-mono focus:outline-none"
            >
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

      {/* Oscilloscope Canvas Display */}
      <div className="relative w-full overflow-hidden rounded-lg border border-white/10 bg-black">
        <canvas
          ref={canvasRef}
          width={800}
          height={380}
          onMouseMove={handleMouseMove}
          className="oscilloscope-canvas w-full h-[380px] cursor-crosshair block"
        />

        {/* Legend */}
        <div className="absolute top-2 right-3 flex items-center gap-3 bg-black/80 backdrop-blur border border-white/10 rounded px-2.5 py-1 text-[11px] font-mono text-gray-300">
          <span className="text-cyan-400">CH1: {voltsDiv}V/div</span>
          <span className="text-emerald-400">CH2: {voltsDiv}V/div</span>
          <span className="text-amber-400">TB: {timeDiv}ms/div</span>
        </div>
      </div>
    </div>
  );
}
