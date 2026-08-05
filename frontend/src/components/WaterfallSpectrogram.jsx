import React, { useRef, useEffect, useState } from 'react';
import { Waves, Palette, RotateCcw } from 'lucide-react';

export default function WaterfallSpectrogram({ spectrogramMatrix, frequencies, times }) {
  const canvasRef = useRef(null);
  const [colormap, setColormap] = useState('plasma'); // plasma, viridis, thermal, jet

  // Custom Colormap Generators
  const getColormapRGB = (normVal, mapName) => {
    const v = Math.max(0, Math.min(1, normVal));
    if (mapName === 'viridis') {
      return [
        Math.floor(255 * (0.2 + 0.8 * v * v)),
        Math.floor(255 * (0.1 + 0.9 * Math.sin(v * Math.PI))),
        Math.floor(255 * (0.5 + 0.5 * (1 - v)))
      ];
    } else if (mapName === 'thermal') {
      return [
        Math.floor(255 * Math.sin((v * Math.PI) / 2)),
        Math.floor(255 * (v > 0.5 ? (v - 0.5) * 2 : 0)),
        Math.floor(255 * (1 - v))
      ];
    } else if (mapName === 'jet') {
      return [
        Math.floor(255 * Math.max(0, Math.min(1, 1.5 - Math.abs(v * 4 - 3)))),
        Math.floor(255 * Math.max(0, Math.min(1, 1.5 - Math.abs(v * 4 - 2)))),
        Math.floor(255 * Math.max(0, Math.min(1, 1.5 - Math.abs(v * 4 - 1))))
      ];
    } else {
      // Plasma default
      return [
        Math.floor(255 * Math.sin(v * Math.PI)),
        Math.floor(255 * Math.pow(v, 2.5)),
        Math.floor(255 * (1 - Math.cos(v * Math.PI)))
      ];
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#05070A';
    ctx.fillRect(0, 0, width, height);

    if (!spectrogramMatrix || spectrogramMatrix.length === 0) return;

    const numFreqBins = spectrogramMatrix.length;
    const numTimeSteps = spectrogramMatrix[0].length;

    const cellWidth = width / numTimeSteps;
    const cellHeight = height / numFreqBins;

    // Find min and max dB for normalization
    let minDb = 0;
    let maxDb = -100;
    for (let r = 0; r < numFreqBins; r++) {
      for (let c = 0; c < numTimeSteps; c++) {
        const val = spectrogramMatrix[r][c];
        if (val < minDb) minDb = val;
        if (val > maxDb) maxDb = val;
      }
    }
    const dbRange = maxDb - minDb || 1.0;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    // Render matrix pixels
    for (let py = 0; py < height; py++) {
      const freqIdx = Math.floor(((height - py) / height) * numFreqBins);
      const row = Math.min(numFreqBins - 1, Math.max(0, freqIdx));

      for (let px = 0; px < width; px++) {
        const timeIdx = Math.floor((px / width) * numTimeSteps);
        const col = Math.min(numTimeSteps - 1, Math.max(0, timeIdx));

        const dbVal = spectrogramMatrix[row][col];
        const norm = (dbVal - minDb) / dbRange;

        const [r, g, b] = getColormapRGB(norm, colormap);
        const pixelIdx = (py * width + px) * 4;

        data[pixelIdx] = r;
        data[pixelIdx + 1] = g;
        data[pixelIdx + 2] = b;
        data[pixelIdx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Overlay grid & frequency labels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#FFFFFF';

    for (let i = 1; i < 5; i++) {
      const y = (i / 5) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      const freqLabel = ((1 - i / 5) * (frequencies ? frequencies[frequencies.length - 1] : 22050)).toFixed(0);
      ctx.fillText(`${freqLabel} Hz`, 8, y - 4);
    }

  }, [spectrogramMatrix, frequencies, times, colormap]);

  return (
    <div className="glass-panel p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Waves className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-sm tracking-wide text-white">WATERFALL SPECTROGRAM (TIME vs FREQUENCY POWER)</span>
        </div>

        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400 font-mono">Palette:</span>
          <select
            value={colormap}
            onChange={(e) => setColormap(e.target.value)}
            className="bg-black/50 border border-white/15 text-emerald-300 rounded px-2 py-1 text-xs font-mono focus:outline-none"
          >
            <option value="plasma">Plasma (Default)</option>
            <option value="viridis">Viridis</option>
            <option value="thermal">Thermal Heat</option>
            <option value="jet">Jet Rainbow</option>
          </select>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-lg border border-white/10 bg-black">
        <canvas
          ref={canvasRef}
          width={800}
          height={380}
          className="w-full h-[380px] block"
        />

        <div className="absolute bottom-2 right-3 flex items-center gap-2 bg-black/70 backdrop-blur border border-white/10 rounded px-2.5 py-1 text-[11px] font-mono text-gray-300">
          <span className="text-gray-400">X: Time →</span>
          <span className="text-gray-400">Y: Freq ↑</span>
          <span className="text-amber-400">Color: dB Power</span>
        </div>
      </div>
    </div>
  );
}
