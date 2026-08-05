import React, { useRef, useEffect, useState } from 'react';
import { BarChart2, Hash, Sparkles } from 'lucide-react';

export default function SpectrumAnalyzer({ frequencyData, magnitudeData, metrics }) {
  const canvasRef = useRef(null);
  const [logScale, setLogScale] = useState(false);
  const [showHarmonics, setShowHarmonics] = useState(true);
  const [minDb, setMinDb] = useState(-100);
  const [maxDb, setMaxDb] = useState(20);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#05070A';
    ctx.fillRect(0, 0, width, height);

    // Draw Spectrum Grid
    const dbRange = maxDb - minDb;
    const gridRows = 6;
    const gridCols = 8;
    const cellW = width / gridCols;
    const cellH = height / gridRows;

    // dB grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let r = 1; r < gridRows; r++) {
      const y = r * cellH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      const dbVal = maxDb - (r / gridRows) * dbRange;
      ctx.fillStyle = '#6E7681';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`${dbVal.toFixed(0)} dB`, 6, y - 3);
    }

    // Freq grid lines
    for (let c = 1; c < gridCols; c++) {
      const x = c * cellW;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    if (!frequencyData || !magnitudeData || frequencyData.length === 0) return;

    const maxFreq = frequencyData[frequencyData.length - 1] || 22050;

    // Function to calculate X position based on linear/log scale
    const getX = (freq) => {
      if (logScale) {
        const minF = Math.max(10, frequencyData[0] || 10);
        const norm = (Math.log10(Math.max(minF, freq)) - Math.log10(minF)) / (Math.log10(maxFreq) - Math.log10(minF));
        return Math.max(0, Math.min(width, norm * width));
      }
      return (freq / maxFreq) * width;
    };

    // Draw Spectrum Curve with Gradient Fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(191, 90, 242, 0.8)');
    gradient.addColorStop(0.5, 'rgba(10, 132, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(10, 132, 255, 0.0)');

    ctx.beginPath();
    ctx.moveTo(0, height);

    for (let i = 0; i < frequencyData.length; i++) {
      const freq = frequencyData[i];
      const magDb = magnitudeData[i];
      const x = getX(freq);

      // Clamp magnitude Y between 0 and height
      const normY = (maxDb - magDb) / dbRange;
      const y = Math.max(0, Math.min(height, normY * height));

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    // Line stroke
    ctx.strokeStyle = '#BF5AF2';
    ctx.shadowColor = '#BF5AF2';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fill area under curve
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 0;
    ctx.fill();

    // Annotate Peak Fundamental Frequency
    if (metrics && metrics.fundamental_freq > 0) {
      const fundFreq = metrics.fundamental_freq;
      const peakX = getX(fundFreq);
      const peakMag = metrics.peak_magnitude_db || 0;
      const peakY = Math.max(10, ((maxDb - peakMag) / dbRange) * height);

      // Draw Peak Indicator Pin
      ctx.strokeStyle = '#FF3B30';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(peakX, peakY - 15);
      ctx.lineTo(peakX, peakY + 15);
      ctx.stroke();

      ctx.fillStyle = '#FF453A';
      ctx.beginPath();
      ctx.arc(peakX, peakY, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Peak Label Box
      ctx.fillStyle = 'rgba(255, 59, 48, 0.9)';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText(`Peak: ${fundFreq.toFixed(1)} Hz (${peakMag.toFixed(1)} dB)`, Math.min(width - 150, peakX + 8), peakY - 8);

      // Draw Harmonic Markers if enabled
      if (showHarmonics) {
        [2, 3, 4, 5].forEach((h) => {
          const hFreq = fundFreq * h;
          if (hFreq <= maxFreq) {
            const hX = getX(hFreq);
            ctx.strokeStyle = 'rgba(255, 159, 10, 0.7)';
            ctx.setLineDash([2, 3]);
            ctx.beginPath();
            ctx.moveTo(hX, 0);
            ctx.lineTo(hX, height);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#FF9F0A';
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.fillText(`${h}H`, hX - 6, 14);
          }
        });
      }
    }

  }, [frequencyData, magnitudeData, metrics, logScale, showHarmonics, minDb, maxDb]);

  return (
    <div className="glass-panel p-4 flex flex-col gap-3">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-purple-400" />
          <span className="font-semibold text-sm tracking-wide text-white">SPECTRUM ANALYZER (FREQUENCY DOMAIN - FFT)</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Axis Scale Toggle */}
          <div className="apple-segmented">
            <button
              onClick={() => setLogScale(false)}
              className={`apple-segmented-item ${!logScale ? 'active' : ''}`}
            >
              Linear
            </button>
            <button
              onClick={() => setLogScale(true)}
              className={`apple-segmented-item ${logScale ? 'active' : ''}`}
            >
              Logarithmic
            </button>
          </div>

          <button
            onClick={() => setShowHarmonics(!showHarmonics)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 border ${
              showHarmonics ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-white/5 text-gray-400 border-white/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Harmonics (2H-5H)
          </button>
        </div>
      </div>

      {/* Spectrum Display Canvas */}
      <div className="relative w-full overflow-hidden rounded-lg border border-white/10 bg-black">
        <canvas
          ref={canvasRef}
          width={800}
          height={380}
          className="w-full h-[380px] block cursor-crosshair"
        />

        {/* Legend Overlay */}
        <div className="absolute top-2 right-3 flex items-center gap-4 bg-black/70 backdrop-blur border border-white/10 rounded px-3 py-1 text-[11px] font-mono text-gray-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> FFT Mag (dBV)
          </span>
          {metrics && (
            <>
              <span className="text-emerald-400">THD: {metrics.thd_percent}%</span>
              <span className="text-cyan-400">SNR: {metrics.snr_db} dB</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
