import React, { useRef, useEffect, useState } from 'react';
import { BarChart2, Sparkles } from 'lucide-react';

export default function SpectrumAnalyzer({ frequencyData, magnitudeData, metrics }) {
  const canvasRef = useRef(null);
  const [logScale, setLogScale] = useState(false);
  const [showHarmonics, setShowHarmonics] = useState(true);
  const [showPeakHold, setShowPeakHold] = useState(true);
  const peakHoldRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const minDb = -100;
    const maxDb = 20;
    const dbRange = maxDb - minDb;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const gridRows = 6;
    const gridCols = 8;
    const cellW = width / gridCols;
    const cellH = height / gridRows;

    ctx.strokeStyle = '#1C2128';
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

    for (let c = 1; c < gridCols; c++) {
      const x = c * cellW;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    if (!frequencyData || !magnitudeData || frequencyData.length === 0) return;

    const maxFreq = frequencyData[frequencyData.length - 1] || 22050;

    const getX = (freq) => {
      if (logScale) {
        const minF = Math.max(10, frequencyData[0] || 10);
        const norm = (Math.log10(Math.max(minF, freq)) - Math.log10(minF)) / (Math.log10(maxFreq) - Math.log10(minF));
        return Math.max(0, Math.min(width, norm * width));
      }
      return (freq / maxFreq) * width;
    };

    if (peakHoldRef.current.length !== magnitudeData.length) {
      peakHoldRef.current = [...magnitudeData];
    } else {
      for (let i = 0; i < magnitudeData.length; i++) {
        peakHoldRef.current[i] = Math.max(peakHoldRef.current[i] - 0.3, magnitudeData[i]);
      }
    }

    // Peak Hold Memory Envelope (Amber)
    if (showPeakHold && peakHoldRef.current.length > 0) {
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      for (let i = 0; i < frequencyData.length; i++) {
        const x = getX(frequencyData[i]);
        const magDb = peakHoldRef.current[i];
        const normY = (maxDb - magDb) / dbRange;
        const y = Math.max(0, Math.min(height, normY * height));

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // FFT Spectrum Line (Violet)
    ctx.strokeStyle = '#A78BFA';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let i = 0; i < frequencyData.length; i++) {
      const freq = frequencyData[i];
      const magDb = magnitudeData[i];
      const x = getX(freq);

      const normY = (maxDb - magDb) / dbRange;
      const y = Math.max(0, Math.min(height, normY * height));

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fundamental Peak Annotation
    if (metrics && metrics.fundamental_freq > 0) {
      const fundFreq = metrics.fundamental_freq;
      const peakX = getX(fundFreq);
      const peakMag = metrics.peak_magnitude_db || 0;
      const peakY = Math.max(10, ((maxDb - peakMag) / dbRange) * height);

      ctx.strokeStyle = '#F87171';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(peakX, peakY - 12);
      ctx.lineTo(peakX, peakY + 12);
      ctx.stroke();

      ctx.fillStyle = '#F87171';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText(`Peak: ${fundFreq.toFixed(1)} Hz (${peakMag.toFixed(1)} dB)`, Math.min(width - 150, peakX + 6), peakY - 6);

      if (showHarmonics) {
        [2, 3, 4, 5].forEach((h) => {
          const hFreq = fundFreq * h;
          if (hFreq <= maxFreq) {
            const hX = getX(hFreq);
            ctx.strokeStyle = '#6E7681';
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(hX, 0);
            ctx.lineTo(hX, height);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#9CA3AF';
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.fillText(`${h}H`, hX - 4, 12);
          }
        });
      }
    }

  }, [frequencyData, magnitudeData, metrics, logScale, showHarmonics, showPeakHold]);

  return (
    <div className="studio-panel p-3 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363D] pb-2">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-xs text-[#F0F6FC]">SPECTRUM ANALYZER (FFT & PEAK ENVELOPE)</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="studio-tabs">
            <button
              onClick={() => setLogScale(false)}
              className={`studio-tab-item ${!logScale ? 'active' : ''}`}
            >
              Linear
            </button>
            <button
              onClick={() => setLogScale(true)}
              className={`studio-tab-item ${logScale ? 'active' : ''}`}
            >
              Log
            </button>
          </div>

          <button
            onClick={() => setShowPeakHold(!showPeakHold)}
            className={`btn-secondary text-xs ${showPeakHold ? 'bg-[#1F2937] text-amber-400' : ''}`}
          >
            Peak Hold
          </button>

          <button
            onClick={() => setShowHarmonics(!showHarmonics)}
            className={`btn-secondary text-xs flex items-center gap-1 ${showHarmonics ? 'bg-[#1F2937] text-purple-400' : ''}`}
          >
            <Sparkles className="w-3 h-3" /> Harmonics
          </button>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded bg-black">
        <canvas
          ref={canvasRef}
          width={800}
          height={360}
          className="oscilloscope-canvas w-full h-[360px] block cursor-crosshair"
        />

        {metrics && (
          <div className="absolute top-2 right-2 flex items-center gap-3 bg-[#0D1117]/90 border border-[#30363D] rounded px-2.5 py-1 text-[11px] font-mono text-[#8B949E]">
            <span className="text-emerald-400">THD: {metrics.thd_percent}%</span>
            <span className="text-sky-400">SNR: {metrics.snr_db} dB</span>
            <span className="text-amber-400">SINAD: {metrics.sinad_db || 0} dB</span>
            <span className="text-purple-400">ENOB: {metrics.enob_bits || 0} bits</span>
          </div>
        )}
      </div>
    </div>
  );
}
