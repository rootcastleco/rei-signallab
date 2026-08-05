import React, { useRef, useEffect, useState } from 'react';
import { Activity, Eye, Zap, Crosshair } from 'lucide-react';

export default function Oscilloscope({ timeData, rawSignal, filteredSignal, sampleRate }) {
  const canvasRef = useRef(null);
  const [timeDiv, setTimeDiv] = useState(2); // ms per division
  const [voltsDiv, setVoltsDiv] = useState(1); // V per division
  const [showRaw, setShowRaw] = useState(true);
  const [showFiltered, setShowFiltered] = useState(true);
  const [triggerLevel, setTriggerLevel] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [cursorActive, setCursorActive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#05070A';
    ctx.fillRect(0, 0, width, height);

    // Draw CRT Graticule Grid (10 horizontal, 8 vertical divs)
    const gridCols = 10;
    const gridRows = 8;
    const cellW = width / gridCols;
    const cellH = height / gridRows;

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

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

    // Draw Center Axes (Dotted)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    // Center X
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Center Y
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Trigger Level Line
    const triggerY = height / 2 - (triggerLevel / voltsDiv) * cellH;
    ctx.strokeStyle = 'rgba(255, 159, 10, 0.6)';
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(0, triggerY);
    ctx.lineTo(width, triggerY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!timeData || timeData.length === 0) return;

    // Scale calculation
    // Total displayed time in ms = 10 divs * timeDiv
    const totalTimeMs = gridCols * timeDiv;
    const dtSeconds = totalTimeMs / 1000.0;
    const maxSamplesToShow = Math.min(timeData.length, Math.floor(dtSeconds * (sampleRate || 44100)));

    const plotWaveform = (signal, color, glowColor, lineWidth = 2) => {
      if (!signal || signal.length === 0) return;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();

      const step = maxSamplesToShow / width;
      for (let x = 0; x < width; x++) {
        const idx = Math.floor(x * step);
        if (idx >= signal.length) break;

        const val = signal[idx];
        // 0V is at center height
        const y = height / 2 - (val / voltsDiv) * cellH;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    // Plot Raw Signal (Cyan)
    if (showRaw && rawSignal) {
      plotWaveform(rawSignal, '#00F0FF', 'rgba(0, 240, 255, 0.5)', 2);
    }

    // Plot Filtered Signal (Neon Emerald Green)
    if (showFiltered && filteredSignal) {
      plotWaveform(filteredSignal, '#32D74B', 'rgba(50, 215, 75, 0.6)', 2.5);
    }

    // Draw Cursor Overlay if active
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

      // Compute voltage readout at cursor
      const cursorV = ((height / 2 - cursorPos.y) / cellH) * voltsDiv;
      const cursorTimeMs = (cursorPos.x / width) * totalTimeMs;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText(`T: ${cursorTimeMs.toFixed(2)} ms | V: ${cursorV.toFixed(2)} V`, cursorPos.x + 8, cursorPos.y - 8);
    }

  }, [timeData, rawSignal, filteredSignal, timeDiv, voltsDiv, showRaw, showFiltered, triggerLevel, cursorActive, cursorPos, sampleRate]);

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
          <span className="font-semibold text-sm tracking-wide text-white">OSCILLOSCOPE (TIME DOMAIN)</span>
        </div>

        {/* Channel Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 border ${
              showRaw
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                : 'bg-white/5 text-gray-400 border-white/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span> CH1 Raw Signal
          </button>

          <button
            onClick={() => setShowFiltered(!showFiltered)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 border ${
              showFiltered
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                : 'bg-white/5 text-gray-400 border-white/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> CH2 Filtered Signal
          </button>

          <button
            onClick={() => setCursorActive(!cursorActive)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 border ${
              cursorActive ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-white/5 text-gray-400 border-white/10'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" /> Cursor
          </button>
        </div>

        {/* Time & Volts per Division Selectors */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 font-mono">Time/Div:</span>
            <select
              value={timeDiv}
              onChange={(e) => setTimeDiv(parseFloat(e.target.value))}
              className="bg-black/50 border border-white/15 text-sky-300 rounded px-2 py-1 font-mono focus:outline-none"
            >
              <option value="0.2">0.2 ms</option>
              <option value="0.5">0.5 ms</option>
              <option value="1">1.0 ms</option>
              <option value="2">2.0 ms</option>
              <option value="5">5.0 ms</option>
              <option value="10">10.0 ms</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 font-mono">Volts/Div:</span>
            <select
              value={voltsDiv}
              onChange={(e) => setVoltsDiv(parseFloat(e.target.value))}
              className="bg-black/50 border border-white/15 text-emerald-300 rounded px-2 py-1 font-mono focus:outline-none"
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

      {/* Oscilloscope CRT Canvas Display */}
      <div className="relative w-full overflow-hidden rounded-lg border border-white/10 bg-black">
        <canvas
          ref={canvasRef}
          width={800}
          height={380}
          onMouseMove={handleMouseMove}
          className="oscilloscope-canvas w-full h-[380px] cursor-crosshair block"
        />

        {/* Top Right Live Scale Info Overlay */}
        <div className="absolute top-2 right-3 flex items-center gap-3 bg-black/70 backdrop-blur border border-white/10 rounded px-2.5 py-1 text-[11px] font-mono text-gray-300">
          <span className="text-cyan-400">CH1: {voltsDiv}V/div</span>
          <span className="text-emerald-400">CH2: {voltsDiv}V/div</span>
          <span className="text-amber-400">TB: {timeDiv}ms/div</span>
        </div>
      </div>
    </div>
  );
}
