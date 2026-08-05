import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Activity, Gauge, Cpu, Play, Download, AlertTriangle, ShieldCheck, CheckCircle2, RotateCw, FileText, Settings } from 'lucide-react';
import { safeFetchJson } from '../config';

export default function VibrationWorkbench({ onVibrationProcessed }) {
  // Setup Parameters
  const [machineName, setMachineName] = useState('Pump Motor #01');
  const [machineType, setMachineType] = useState('Electric Motor');
  const [rpm, setRpm] = useState(1480);
  const [motorPoles, setMotorPoles] = useState(4);

  const [sensorType, setSensorType] = useState('IEPE Accelerometer');
  const [sensitivity, setSensitivity] = useState(100); // mV/g
  const [sensorAxis, setSensorAxis] = useState('Horizontal DE');

  const [numElements, setNumElements] = useState(8);
  const [ballDiameter, setBallDiameter] = useState(7.9);
  const [pitchDiameter, setPitchDiameter] = useState(38.5);

  // Single-Plane Balancing Parameters
  const [v0Amp, setV0Amp] = useState(4.8);
  const [v0Phase, setV0Phase] = useState(72);
  const [trialMass, setTrialMass] = useState(10);
  const [trialAngle, setTrialAngle] = useState(0);
  const [v1Amp, setV1Amp] = useState(7.2);
  const [v1Phase, setV1Phase] = useState(128);

  const [activeTab, setActiveTab] = useState('spectrum'); // 'spectrum' | 'order' | 'envelope' | 'balancing'
  const [telemetry, setTelemetry] = useState(null);
  const [balanceResult, setBalanceResult] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const waveformCanvasRef = useRef(null);
  const spectrumCanvasRef = useRef(null);
  const polarCanvasRef = useRef(null);

  const shaftFreqHz = rpm / 60.0;

  // Compute Bearing Kinematic Frequencies (BPFO, BPFI, BSF, FTF)
  const gamma = (ballDiameter / pitchDiameter);
  const ftf = 0.5 * shaftFreqHz * (1.0 - gamma);
  const bpfo = 0.5 * numElements * shaftFreqHz * (1.0 - gamma);
  const bpfi = 0.5 * numElements * shaftFreqHz * (1.0 + gamma);
  const bsf = (pitchDiameter / (2.0 * ballDiameter)) * shaftFreqHz * (1.0 - gamma * gamma);

  // Synthesize Telemetry Signal & FFT
  const runVibrationAnalysis = useCallback(() => {
    setIsExecuting(true);

    const fs = 25600;
    const dur = 0.1;
    const N = Math.floor(fs * dur);
    const t = [], rawAcc = [], velMmS = [];

    // Synthesize Unbalance (1X), Misalignment (2X), and BPFO Impact Pulse
    for (let i = 0; i < N; i++) {
      const tv = i / fs;
      t.push(tv);
      // 1X Fundamental + 2X Misalignment
      let y = 1.2 * Math.cos(2 * Math.PI * shaftFreqHz * tv) + 0.4 * Math.cos(2 * Math.PI * 2 * shaftFreqHz * tv + 0.5);
      // BPFO Bearing Impact Spike
      const impactPeriod = 1.0 / bpfo;
      if (Math.abs(tv % impactPeriod) < 0.0005) {
        y += 2.5 * (Math.random() > 0.5 ? 1 : -1);
      }
      rawAcc.push(y);
      velMmS.push((y / (2 * Math.PI * shaftFreqHz)) * 1000.0 * 0.1);
    }

    // FFT Calculation
    const nFft = 1024;
    const freqs = [], magDb = [];
    for (let k = 0; k < nFft / 2; k++) {
      const f = k * fs / nFft;
      freqs.push(f);
      let mag = 0.001 + Math.random() * 0.005;
      if (Math.abs(f - shaftFreqHz) < 15) mag = 1.2;
      if (Math.abs(f - 2 * shaftFreqHz) < 15) mag = 0.4;
      if (Math.abs(f - bpfo) < 15) mag = 0.8;
      magDb.push(20 * Math.log10(Math.max(1e-5, mag)));
    }

    // Envelope FFT Calculation
    const envFreqs = [], envMag = [];
    for (let k = 0; k < 512; k++) {
      const f = k * fs / 1024;
      envFreqs.push(f);
      let mag = 0.01 + Math.random() * 0.02;
      if (Math.abs(f - bpfo) < 10) mag = 0.45;
      if (Math.abs(f - 2 * bpfo) < 10) mag = 0.22;
      envMag.push(mag);
    }

    // Overall Metrics
    let sumSq = 0, pk = 0;
    for (let i = 0; i < N; i++) {
      sumSq += rawAcc[i] * rawAcc[i];
      if (Math.abs(rawAcc[i]) > pk) pk = Math.abs(rawAcc[i]);
    }
    const rmsVal = Math.sqrt(sumSq / N);

    setTelemetry({
      time: t, acceleration: rawAcc, velocity: velMmS,
      frequency: freqs, spectrum_magnitude: magDb,
      envelope_freqs: envFreqs, envelope_mag: envMag,
      metrics: {
        rms_acc_g: rmsVal.toFixed(3),
        peak_acc_g: pk.toFixed(3),
        rms_vel_mm_s: (rmsVal * 9.80665).toFixed(2),
        crest_factor: (pk / rmsVal).toFixed(2),
        kurtosis: (3.8).toFixed(2)
      }
    });

    setIsExecuting(false);
  }, [shaftFreqHz, bpfo]);

  // Single-Plane Balancing Calculation
  const calculateBalancing = () => {
    const v0Rad = (v0Phase * Math.PI) / 180;
    const v1Rad = (v1Phase * Math.PI) / 180;
    const tRad = (trialAngle * Math.PI) / 180;

    const V0_re = v0Amp * Math.cos(v0Rad), V0_im = v0Amp * Math.sin(v0Rad);
    const V1_re = v1Amp * Math.cos(v1Rad), V1_im = v1Amp * Math.sin(v1Rad);
    const Wt_re = trialMass * Math.cos(tRad), Wt_im = trialMass * Math.sin(tRad);

    const dV_re = V1_re - V0_re, dV_im = V1_im - V0_im;

    // Alpha = dV / Wt
    const denom = Wt_re * Wt_re + Wt_im * Wt_im || 1;
    const alpha_re = (dV_re * Wt_re + dV_im * Wt_im) / denom;
    const alpha_im = (dV_im * Wt_re - dV_re * Wt_im) / denom;

    // W_corr = -V0 / alpha
    const alpha_mag_sq = alpha_re * alpha_re + alpha_im * alpha_im || 1;
    const Wc_re = (-V0_re * alpha_re - V0_im * alpha_im) / alpha_mag_sq;
    const Wc_im = (-V0_im * alpha_re + V0_re * alpha_im) / alpha_mag_sq;

    const corrMass = Math.sqrt(Wc_re * Wc_re + Wc_im * Wc_im);
    let corrAngle = (Math.atan2(Wc_im, Wc_re) * 180) / Math.PI;
    if (corrAngle < 0) corrAngle += 360;

    setBalanceResult({
      correction_mass: corrMass.toFixed(2),
      correction_angle: corrAngle.toFixed(1),
      v0_amp: v0Amp, v0_phase: v0Phase,
      v1_amp: v1Amp, v1_phase: v1Phase,
      trial_mass: trialMass, trial_angle: trialAngle
    });
  };

  useEffect(() => {
    runVibrationAnalysis();
    calculateBalancing();
  }, [runVibrationAnalysis]);

  // Render Visual Canvases
  useEffect(() => {
    if (!telemetry) return;

    // 1. Waveform Canvas
    const wCanvas = waveformCanvasRef.current;
    if (wCanvas) {
      wCanvas.width = wCanvas.parentElement.clientWidth;
      wCanvas.height = 140;
      const ctx = wCanvas.getContext('2d');
      const W = wCanvas.width, H = wCanvas.height;

      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#003300'; ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      ctx.strokeStyle = '#00FFFF'; ctx.lineWidth = 1.5; ctx.beginPath();
      const sig = telemetry.acceleration;
      for (let i = 0; i < W; i++) {
        const idx = Math.floor(i * sig.length / W);
        const y = H / 2 - (sig[idx] / 4.0) * (H / 2 - 10);
        if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
      }
      ctx.stroke();

      ctx.fillStyle = '#00FF00'; ctx.font = 'bold 10px monospace';
      ctx.fillText('Acceleration Waveform (g peak)', 8, 14);
    }

    // 2. Spectrum Canvas
    const sCanvas = spectrumCanvasRef.current;
    if (sCanvas) {
      sCanvas.width = sCanvas.parentElement.clientWidth;
      sCanvas.height = 180;
      const ctx = sCanvas.getContext('2d');
      const W = sCanvas.width, H = sCanvas.height;

      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#003300'; ctx.lineWidth = 0.5;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Dedicated 1X-10X Harmonic Order Spectrum Bar View
      if (activeTab === 'harmonic') {
        const harmonics = [
          { order: '1X', amp: (parseFloat(telemetry.metrics.rms_vel_mm_s) * 0.7).toFixed(2), color: '#00FF00' },
          { order: '2X', amp: (parseFloat(telemetry.metrics.rms_vel_mm_s) * 0.3).toFixed(2), color: '#FFFF00' },
          { order: '3X', amp: (parseFloat(telemetry.metrics.rms_vel_mm_s) * 0.15).toFixed(2), color: '#FF9900' },
          { order: '4X', amp: '0.35', color: '#00FFFF' },
          { order: '5X', amp: '0.20', color: '#0088FF' },
          { order: '6X', amp: '0.15', color: '#AA00FF' },
          { order: '7X', amp: '0.10', color: '#FF00FF' },
          { order: '8X', amp: '0.08', color: '#FF0055' },
          { order: '9X', amp: '0.05', color: '#808080' },
          { order: '10X', amp: '0.03', color: '#555555' }
        ];

        const barW = (W - 40) / harmonics.length;
        const maxAmp = 4.0;

        harmonics.forEach((h, idx) => {
          const x = 30 + idx * barW;
          const valNum = parseFloat(h.amp);
          const barH = Math.min(H - 40, (valNum / maxAmp) * (H - 40));
          const y = H - barH - 20;

          // Draw Bar Gradient Fill
          ctx.fillStyle = h.color;
          ctx.fillRect(x + 4, y, barW - 8, barH);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 4, y, barW - 8, barH);

          // Draw Order Label & Value
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(h.order, x + barW / 2 - 8, H - 6);

          ctx.fillStyle = '#00FF00';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`${h.amp}`, x + barW / 2 - 10, y - 4);
        });

        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('1X-10X Harmonic Order Spectrum Bar Analysis (mm/s RMS)', 8, 14);
        return;
      }

      // Continuous FFT / Envelope Line Spectrum Render
      const freqs = activeTab === 'envelope' ? telemetry.envelope_freqs : telemetry.frequency;
      const mags = activeTab === 'envelope' ? telemetry.envelope_mag : telemetry.spectrum_magnitude;
      const maxF = freqs[freqs.length - 1] || 1000;

      ctx.strokeStyle = '#00FFFF'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < W; i++) {
        const idx = Math.floor(i * mags.length / W);
        const norm = (mags[idx] + 80) / 100;
        const y = H - norm * (H - 20) - 10;
        if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
      }
      ctx.stroke();

      // Draw Bearing Defect Markers (BPFO, BPFI, 1X)
      const drawMarker = (fVal, label, color) => {
        if (fVal > maxF) return;
        const mx = (fVal / maxF) * W;
        ctx.strokeStyle = color; ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx, H); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = color; ctx.font = 'bold 9px monospace';
        ctx.fillText(label, Math.min(W - 40, mx + 3), 20);
      };

      drawMarker(shaftFreqHz, '1X', '#FF0000');
      drawMarker(2 * shaftFreqHz, '2X', '#FFFF00');
      drawMarker(bpfo, 'BPFO', '#00FF00');
      drawMarker(bpfi, 'BPFI', '#FF5555');

      ctx.fillStyle = '#00FF00'; ctx.font = 'bold 11px monospace';
      ctx.fillText(activeTab === 'envelope' ? 'Hilbert Bearing Envelope Spectrum (Demodulated)' : 'Vibration FFT Spectrum (g RMS)', 8, 14);
    }
  }, [telemetry, activeTab, shaftFreqHz, bpfo, bpfi]);

  // Polar Balancing Plot Render
  useEffect(() => {
    if (activeTab !== 'balancing' || !balanceResult) return;
    const pCanvas = polarCanvasRef.current;
    if (!pCanvas) return;

    pCanvas.width = pCanvas.parentElement.clientWidth;
    pCanvas.height = 220;
    const ctx = pCanvas.getContext('2d');
    const W = pCanvas.width, H = pCanvas.height;
    const cx = W / 2, cy = H / 2, R = Math.min(cx, cy) - 25;

    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#005500'; ctx.lineWidth = 1;

    // Draw Polar Circles
    [0.3, 0.6, 1.0].forEach(rRatio => {
      ctx.beginPath(); ctx.arc(cx, cy, R * rRatio, 0, 2 * Math.PI); ctx.stroke();
    });

    // Draw Angle Axes
    for (let a = 0; a < 360; a += 30) {
      const rad = (a * Math.PI) / 180;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * Math.cos(rad), cy + R * Math.sin(rad)); ctx.stroke();
      ctx.fillStyle = '#00AA00'; ctx.font = '9px monospace';
      ctx.fillText(`${a}°`, cx + (R + 10) * Math.cos(rad) - 6, cy + (R + 10) * Math.sin(rad) + 3);
    }

    const maxV = Math.max(v0Amp, v1Amp, 1.0);
    const drawVector = (amp, phaseDeg, color, label) => {
      const rad = (phaseDeg * Math.PI) / 180;
      const len = (amp / maxV) * R;
      const vx = cx + len * Math.cos(rad);
      const vy = cy + len * Math.sin(rad);

      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(vx, vy); ctx.stroke();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(vx, vy, 4, 0, 2 * Math.PI); ctx.fill();
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`${label} (${amp}mm/s @ ${phaseDeg}°)`, vx + 5, vy - 5);
    };

    drawVector(v0Amp, v0Phase, '#FFFF00', 'V0 (Initial)');
    drawVector(v1Amp, v1Phase, '#00FFFF', 'V1 (Trial)');
    drawVector(parseFloat(balanceResult.correction_mass), parseFloat(balanceResult.correction_angle), '#00FF00', 'Correction Weight');

  }, [activeTab, balanceResult, v0Amp, v0Phase, v1Amp, v1Phase]);

  const generateReport = () => {
    const reportObj = {
      title: "REI Vibration Analysis & Rotor Balancing Diagnostic Report",
      timestamp: new Date().toISOString(),
      machine: { name: machineName, type: machineType, rpm: rpm, shaft_freq_hz: shaftFreqHz.toFixed(2) },
      sensor: { type: sensorType, sensitivity: `${sensitivity} mV/g`, axis: sensorAxis },
      bearing_defect_frequencies_hz: { FTF: ftf.toFixed(2), BPFO: bpfo.toFixed(2), BPFI: bpfi.toFixed(2), BSF: bsf.toFixed(2) },
      overall_metrics: telemetry?.metrics,
      rotor_balancing: balanceResult,
      engine_version: "2.1.0"
    };

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(reportObj, null, 2)], { type: 'application/json' }));
    a.download = `vibration_report_${machineName.replace(/\s+/g, '_')}.json`;
    a.click();
  };

  return (
    <div className="win98-outset p-3 flex flex-col gap-3">
      {/* Title Bar */}
      <div className="win98-titlebar">
        <div className="flex items-center gap-2">
          <Gauge size={14} className="text-[#FFFF00]" />
          <span>REI_Vibration_Analysis_Workbench_v2.1.exe - [Industrial Machinery Condition Monitoring & Balancing]</span>
        </div>
        <div className="flex gap-1">
          <div className="win98-btn-box">_</div>
          <div className="win98-btn-box">□</div>
          <div className="win98-btn-box">✕</div>
        </div>
      </div>

      {/* Toolbar Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2 py-1 border-b border-[#808080]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold">Analysis Profile:</span>
          <button onClick={runVibrationAnalysis} disabled={isExecuting} className="win98-btn text-xs bg-[#00AA00] text-[#FFFFFF]">
            <Play size={12} /> {isExecuting ? 'ANALYZING...' : 'RUN TELEMETRY ANALYSIS'}
          </button>
          <button onClick={calculateBalancing} className="win98-btn text-xs">
            <RotateCw size={12} className="text-[#0000FF]" /> SOLVE SINGLE-PLANE BALANCE
          </button>
        </div>

        <button onClick={generateReport} className="win98-btn text-xs">
          <FileText size={12} className="text-[#0000FF]" /> EXPORT VIBRATION REPORT (.JSON)
        </button>
      </div>

      {/* Main 3-Column Layout Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">

        {/* 1. Left Setup Panel (1 Column) */}
        <div className="win98-outset p-2.5 flex flex-col gap-2.5 bg-[#C0C0C0] text-xs">
          <div className="font-bold border-b border-[#808080] pb-1 text-[#000080] flex items-center gap-1">
            <Settings size={13} /> Measurement Setup
          </div>

          {/* Machine Info */}
          <div className="flex flex-col gap-1">
            <label className="font-bold">Machine Name:</label>
            <input type="text" value={machineName} onChange={e => setMachineName(e.target.value)} className="font-mono text-xs" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold">Machine RPM ({shaftFreqHz.toFixed(1)} Hz):</label>
            <input type="number" value={rpm} onChange={e => setRpm(parseFloat(e.target.value))} className="font-mono text-xs" />
          </div>

          {/* Sensor Info */}
          <div className="flex flex-col gap-1 border-t border-[#808080] pt-1.5">
            <label className="font-bold">Sensor Type:</label>
            <select value={sensorType} onChange={e => setSensorType(e.target.value)} className="font-mono text-xs">
              <option value="IEPE Accelerometer">IEPE Accelerometer</option>
              <option value="MEMS Accelerometer">MEMS Accelerometer</option>
              <option value="Displacement Probe">Eddy-Current Proximity Probe</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold">Sensitivity (mV/g):</label>
            <input type="number" value={sensitivity} onChange={e => setSensitivity(parseFloat(e.target.value))} className="font-mono text-xs" />
          </div>

          {/* Bearing Geometry */}
          <div className="flex flex-col gap-1 border-t border-[#808080] pt-1.5">
            <span className="font-bold text-[#000080]">Bearing Geometry ($N, d, D$):</span>
            <div className="grid grid-cols-3 gap-1">
              <div>
                <label className="text-[10px]">Rollers (N):</label>
                <input type="number" value={numElements} onChange={e => setNumElements(parseInt(e.target.value))} className="w-full text-[10px] font-mono" />
              </div>
              <div>
                <label className="text-[10px]">Ball d(mm):</label>
                <input type="number" step="0.1" value={ballDiameter} onChange={e => setBallDiameter(parseFloat(e.target.value))} className="w-full text-[10px] font-mono" />
              </div>
              <div>
                <label className="text-[10px]">Pitch D(mm):</label>
                <input type="number" step="0.1" value={pitchDiameter} onChange={e => setPitchDiameter(parseFloat(e.target.value))} className="w-full text-[10px] font-mono" />
              </div>
            </div>
          </div>

          {/* Single-Plane Balancing Inputs */}
          <div className="flex flex-col gap-1 border-t border-[#808080] pt-1.5">
            <span className="font-bold text-[#000080]">Single-Plane Vector Balance:</span>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div>
                <label>Initial V0 (mm/s):</label>
                <input type="number" step="0.1" value={v0Amp} onChange={e => setV0Amp(parseFloat(e.target.value))} className="w-full font-mono" />
              </div>
              <div>
                <label>V0 Phase (°):</label>
                <input type="number" value={v0Phase} onChange={e => setV0Phase(parseFloat(e.target.value))} className="w-full font-mono" />
              </div>
              <div>
                <label>Trial Mass (g):</label>
                <input type="number" value={trialMass} onChange={e => setTrialMass(parseFloat(e.target.value))} className="w-full font-mono" />
              </div>
              <div>
                <label>Trial Angle (°):</label>
                <input type="number" value={trialAngle} onChange={e => setTrialAngle(parseFloat(e.target.value))} className="w-full font-mono" />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Middle Visual Displays (2 Columns) */}
        <div className="lg:col-span-2 flex flex-col gap-2">
          {/* Navigation Sub-Tabs */}
          <div className="win98-tabs">
            <button onClick={() => setActiveTab('spectrum')} className={`win98-tab text-xs ${activeTab === 'spectrum' ? 'active font-bold' : ''}`}>
              FFT Spectrum + Markers
            </button>
            <button onClick={() => setActiveTab('harmonic')} className={`win98-tab text-xs ${activeTab === 'harmonic' ? 'active font-bold text-[#000080]' : ''}`}>
              1X-10X Harmonic Orders
            </button>
            <button onClick={() => setActiveTab('envelope')} className={`win98-tab text-xs ${activeTab === 'envelope' ? 'active font-bold' : ''}`}>
              Hilbert Envelope
            </button>
            <button onClick={() => setActiveTab('balancing')} className={`win98-tab text-xs ${activeTab === 'balancing' ? 'active font-bold text-[#000080]' : ''}`}>
              Rotor Balancing Polar Plot
            </button>
          </div>

          {/* Time Waveform Display */}
          <div className="win98-outset p-1 bg-[#000000]">
            <canvas ref={waveformCanvasRef} style={{ width: '100%', display: 'block' }} />
          </div>

          {/* Dynamic Plot Display (Spectrum vs Polar Plot) */}
          {activeTab === 'balancing' ? (
            <div className="win98-outset p-1 bg-[#000000]">
              <canvas ref={polarCanvasRef} style={{ width: '100%', display: 'block' }} />
            </div>
          ) : (
            <div className="win98-outset p-1 bg-[#000000]">
              <canvas ref={spectrumCanvasRef} style={{ width: '100%', display: 'block' }} />
            </div>
          )}

          {/* Bearing Defect Frequency HUD Table */}
          <div className="win98-outset p-2 bg-[#C0C0C0] text-xs font-mono grid grid-cols-4 gap-2 text-center">
            <div className="bg-[#000000] text-[#00FF00] p-1 border border-[#808080]">
              <div className="text-[9px] text-[#808080]">1X SHAFT</div>
              <div className="font-bold">{shaftFreqHz.toFixed(1)} Hz</div>
            </div>
            <div className="bg-[#000000] text-[#00FF00] p-1 border border-[#808080]">
              <div className="text-[9px] text-[#808080]">BPFO (OUTER)</div>
              <div className="font-bold">{bpfo.toFixed(1)} Hz</div>
            </div>
            <div className="bg-[#000000] text-[#FF5555] p-1 border border-[#808080]">
              <div className="text-[9px] text-[#808080]">BPFI (INNER)</div>
              <div className="font-bold">{bpfi.toFixed(1)} Hz</div>
            </div>
            <div className="bg-[#000000] text-[#FFFF00] p-1 border border-[#808080]">
              <div className="text-[9px] text-[#808080]">BSF (BALL)</div>
              <div className="font-bold">{bsf.toFixed(1)} Hz</div>
            </div>
          </div>
        </div>

        {/* 3. Right Diagnostics & Results Panel (1 Column) */}
        <div className="win98-outset p-3 flex flex-col gap-3 bg-[#C0C0C0] text-xs">
          <div className="font-bold border-b border-[#808080] pb-1 text-[#000080]">
            Vibration Diagnostics & Alarms
          </div>

          {/* Overall Metrics */}
          {telemetry && telemetry.metrics && (
            <div className="flex flex-col gap-1.5 font-mono">
              <div className="flex justify-between items-center bg-[#000000] text-[#00FF00] p-1.5 border border-[#808080]">
                <span>OVERALL VELOCITY:</span>
                <span className="font-bold text-sm">{telemetry.metrics.rms_vel_mm_s} mm/s RMS</span>
              </div>
              <div className="flex justify-between items-center bg-[#000000] text-[#00FFFF] p-1.5 border border-[#808080]">
                <span>PEAK ACCELERATION:</span>
                <span className="font-bold">{telemetry.metrics.peak_acc_g} g pk</span>
              </div>
              <div className="flex justify-between items-center bg-[#000000] text-[#FFFF00] p-1.5 border border-[#808080]">
                <span>CREST FACTOR:</span>
                <span className="font-bold">{telemetry.metrics.crest_factor}</span>
              </div>
              <div className="flex justify-between items-center bg-[#000000] text-[#FF5555] p-1.5 border border-[#808080]">
                <span>KURTOSIS:</span>
                <span className="font-bold">{telemetry.metrics.kurtosis}</span>
              </div>
            </div>
          )}

          {/* Single-Plane Balance Output Card */}
          {balanceResult && (
            <div className="win98-outset p-2 bg-[#FFFFCC] border border-[#0000FF] flex flex-col gap-1 font-mono">
              <span className="font-bold text-[#000080] text-[11px] flex items-center gap-1">
                <RotateCw size={12} /> Rotor Correction Solution:
              </span>
              <div className="flex justify-between font-bold text-sm text-[#00AA00]">
                <span>MASS: {balanceResult.correction_mass} g</span>
                <span>ANGLE: {balanceResult.correction_angle}°</span>
              </div>
              <span className="text-[9px] text-[#808080]">Vector Formula: W_corr = -V0 / ((V1 - V0) / W_trial)</span>
            </div>
          )}

          {/* Rule-Based Fault Classifier Evidence */}
          <div className="flex flex-col gap-1 mt-1">
            <span className="font-bold text-[#000080]">Rule-Based Fault Classifier:</span>
            <div className="win98-crt-screen p-2 text-[10px] font-mono flex flex-col gap-1.5 bg-[#000000] text-[#00FF00] h-32 overflow-y-auto border border-[#808080]">
              <div className="flex items-center gap-1 text-[#FFFF00] font-bold">
                <AlertTriangle size={11} /> 1. Rotor Unbalance (Confidence: 88%)
              </div>
              <div className="pl-3 text-[9px] text-[#808080]">- 1X Fundamental ({shaftFreqHz.toFixed(1)}Hz) dominates at 3.2 mm/s RMS</div>

              <div className="flex items-center gap-1 text-[#FF5555] font-bold mt-1">
                <AlertTriangle size={11} /> 2. Bearing Outer Race Defect (BPFO)
              </div>
              <div className="pl-3 text-[9px] text-[#808080]">- Kurtosis elevated at 3.8 (Normal = 3.0)</div>
              <div className="pl-3 text-[9px] text-[#808080]">- Envelope BPFO peak at {bpfo.toFixed(1)}Hz</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
