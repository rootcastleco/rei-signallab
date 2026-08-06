import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, Play, FileText, Settings } from 'lucide-react';
import { safeFetchJson } from '../config';

export default function AntennaWorkbench() {
  const [freqGhz, setFreqGhz] = useState(2.4);  // 2.4 GHz
  const [loadR, setLoadR] = useState(75);
  const [loadX, setLoadX] = useState(25);
  const [z0, setZ0] = useState(50);
  const [txPowerDbm, setTxPowerDbm] = useState(20);
  const [distanceM, setDistanceM] = useState(100);
  const [er, setEr] = useState(4.4); // FR4
  const [wgA, setWgA] = useState(22.86); // WR-90
  const [wgB, setWgB] = useState(10.16);

  const [activeTab, setActiveTab] = useState('sweep');
  const [telemetry, setTelemetry] = useState(null);
  const [trustMode, setTrustMode] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const sweepCanvasRef = useRef(null);
  const polarCanvasRef = useRef(null);
  const smithCanvasRef = useRef(null);

  const computeLocalAntennaAnalysis = useCallback(() => {
    const freqHz = parseFloat(freqGhz) * 1e9;
    const r = parseFloat(loadR);
    const x = parseFloat(loadX);
    const z0Val = parseFloat(z0);

    // Z_L = R + jX
    // Gamma = (Z_L - Z0) / (Z_L + Z0)
    const numRe = r - z0Val, numIm = x;
    const denRe = r + z0Val, denIm = x;
    const denMagSq = denRe ** 2 + denIm ** 2 || 1;

    const gRe = (numRe * denRe + numIm * denIm) / denMagSq;
    const gIm = (numIm * denRe - numRe * denIm) / denMagSq;
    const gMag = Math.sqrt(gRe ** 2 + gIm ** 2);
    let gPhaseDeg = (Math.atan2(gIm, gRe) * 180) / Math.PI;
    if (gPhaseDeg < 0) gPhaseDeg += 360;

    const gMagClamped = Math.min(gMag, 0.9999);
    const vswr = (1 + gMagClamped) / (1 - gMagClamped);
    const s11 = 20 * Math.log10(Math.max(1e-6, gMag));

    // Wavelength & Dipole
    const c = 299792458.0;
    const wavelength = c / freqHz;
    const dipoleLengthMm = (wavelength / 2.0) * 1000.0 * 0.95;

    // FSPL Path Loss
    const dist = parseFloat(distanceM);
    const fspl_db = 20 * Math.log10(dist) + 20 * Math.log10(freqHz) + 20 * Math.log10(4 * Math.PI / c);
    const rx_power_dbm = parseFloat(txPowerDbm) + 2.15 + 2.15 - fspl_db;
    const rx_power_mw = 10 ** (rx_power_dbm / 10);

    // Waveguide Cutoff (TE10)
    const aM = (parseFloat(wgA) || 22.86) / 1000.0;
    const fc_te10 = (c / 2.0) * (1.0 / aM);

    // Sweep
    const fCenter = parseFloat(freqGhz) * 1000; // MHz
    const sweep_frequencies_mhz = [];
    const sweep_s11_db = [];
    const sweep_vswr = [];

    for (let i = 0; i < 100; i++) {
      const fMhz = fCenter * 0.8 + (i / 99) * (fCenter * 0.4);
      sweep_frequencies_mhz.push(fMhz);
      const detune = (fMhz - fCenter) / fCenter;
      const rF = r + 50 * (detune ** 2);
      const xF = x + 150 * detune;

      const nR = rF - z0Val, nI = xF;
      const dR = rF + z0Val, dI = xF;
      const dMagSq = dR ** 2 + dI ** 2 || 1;
      const gM = Math.sqrt(((nR * dR + nI * dI) / dMagSq) ** 2 + ((nI * dR - nR * dI) / dMagSq) ** 2);
      const gMC = Math.min(gM, 0.9999);

      sweep_s11_db.push(20 * Math.log10(Math.max(1e-6, gM)));
      sweep_vswr.push((1 + gMC) / (1 - gMC));
    }

    return {
      frequency_hz: freqHz,
      vswr: parseFloat(vswr.toFixed(2)),
      return_loss_s11_db: parseFloat(s11.toFixed(2)),
      reflection_coefficient_gamma: parseFloat(gMag.toFixed(4)),
      gamma_phase_deg: parseFloat(gPhaseDeg.toFixed(1)),
      input_impedance_z_in: { R: r, X: x },
      smith_chart_point: {
        normalized_r: parseFloat((r / z0Val).toFixed(3)),
        normalized_x: parseFloat((x / z0Val).toFixed(3)),
        gamma_real: parseFloat(gRe.toFixed(3)),
        gamma_imag: parseFloat(gIm.toFixed(3)),
        swr: parseFloat(vswr.toFixed(2))
      },
      link_budget: {
        frequency_hz: freqHz,
        wavelength_m: parseFloat(wavelength.toFixed(4)),
        fspl_db: parseFloat(fspl_db.toFixed(2)),
        rx_power_dbm: parseFloat(rx_power_dbm.toFixed(2)),
        rx_power_milliwatts: parseFloat(rx_power_mw.toFixed(6)),
        link_margin_db: parseFloat((rx_power_dbm - (-90)).toFixed(2))
      },
      antenna_resonance: {
        antenna_type: "half_wave_dipole",
        resonant_freq_hz: freqHz,
        wavelength_m: parseFloat(wavelength.toFixed(4)),
        physical_length_mm: parseFloat(dipoleLengthMm.toFixed(2)),
        effective_permittivity: 1.0,
        directivity_dbi: 2.15
      },
      sweep_frequencies_mhz,
      sweep_s11_db,
      sweep_vswr,
      waveguide_cutoff_hz: {
        fc_TE10_hz: fc_te10,
        fc_TE20_hz: fc_te10 * 2
      },
      trust_mode: "LOCAL_DSP"
    };
  }, [freqGhz, loadR, loadX, z0, txPowerDbm, distanceM, er, wgA, wgB]);

  const runAnalysis = useCallback(async () => {
    setIsExecuting(true);
    try {
      const data = await safeFetchJson('/api/antenna/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frequency_hz: parseFloat(freqGhz) * 1e9,
          characteristic_impedance_z0: parseFloat(z0),
          load_impedance_r: parseFloat(loadR),
          load_impedance_x: parseFloat(loadX),
          tx_power_dbm: parseFloat(txPowerDbm),
          distance_m: parseFloat(distanceM),
          relative_permittivity_er: parseFloat(er),
          waveguide_width_a_mm: parseFloat(wgA),
          waveguide_height_b_mm: parseFloat(wgB)
        })
      });
      setTelemetry(data);
      setTrustMode(data.trust_mode || 'API_VERIFIED');
    } catch {
      const localData = computeLocalAntennaAnalysis();
      setTelemetry(localData);
      setTrustMode('LOCAL_DSP');
    } finally {
      setIsExecuting(false);
    }
  }, [freqGhz, loadR, loadX, z0, txPowerDbm, distanceM, er, wgA, wgB, computeLocalAntennaAnalysis]);

  useEffect(() => { runAnalysis(); }, [runAnalysis]);

  // Sweep Canvas Render
  useEffect(() => {
    if (activeTab !== 'sweep' || !telemetry?.sweep_frequencies_mhz) return;
    const canvas = sweepCanvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.parentElement.clientWidth; canvas.height = 230;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#003300'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    const s11Vals = telemetry.sweep_s11_db || [];
    const minS11 = Math.min(...s11Vals, -30);

    ctx.strokeStyle = '#00FF00'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < W; i++) {
      const idx = Math.floor((i * s11Vals.length) / W);
      const val = s11Vals[idx];
      const y = (val / minS11) * (H - 30) + 15;
      if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#00FF00'; ctx.font = 'bold 10px monospace';
    ctx.fillText('S11 Return Loss (dB) vs Frequency Sweep', 10, 16);
  }, [activeTab, telemetry]);

  // Polar Pattern Render
  useEffect(() => {
    if (activeTab !== 'pattern' || !telemetry) return;
    const canvas = polarCanvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.parentElement.clientWidth; canvas.height = 230;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2, R = Math.min(cx, cy) - 25;

    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#004400'; ctx.lineWidth = 1;
    [0.33, 0.66, 1.0].forEach(r => { ctx.beginPath(); ctx.arc(cx, cy, R * r, 0, 2 * Math.PI); ctx.stroke(); });

    // Dipole donut radiation pattern: E(theta) = cos(pi/2 * cos(theta)) / sin(theta)
    ctx.strokeStyle = '#00FFFF'; ctx.lineWidth = 2; ctx.beginPath();
    for (let a = 0; a <= 360; a++) {
      const rad = (a * Math.PI) / 180;
      const rFactor = Math.abs(Math.sin(rad)); // Dipole broadside pattern
      const rPix = R * rFactor;
      const x = cx + rPix * Math.cos(rad);
      const y = cy - rPix * Math.sin(rad);
      if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#00FFFF'; ctx.font = 'bold 10px monospace';
    ctx.fillText('Half-Wave Dipole Elevation Radiation Pattern (2.15 dBi)', 10, 16);
  }, [activeTab, telemetry]);

  // Smith Chart Render
  useEffect(() => {
    if (activeTab !== 'smith' || !telemetry?.smith_chart_point) return;
    const canvas = smithCanvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.parentElement.clientWidth; canvas.height = 230;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2, R = Math.min(cx, cy) - 20;

    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#005500'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();

    // Constant resistance circles r = 0.5, 1.0, 2.0
    [0.5, 1.0, 2.0].forEach(rVal => {
      const cRadius = R / (1 + rVal);
      const cCenterX = cx + R * (rVal / (1 + rVal));
      ctx.beginPath(); ctx.arc(cCenterX, cy, cRadius, 0, 2 * Math.PI); ctx.stroke();
    });

    const pt = telemetry.smith_chart_point;
    const px = cx + pt.gamma_real * R;
    const py = cy - pt.gamma_imag * R;

    ctx.fillStyle = '#FF0000'; ctx.beginPath(); ctx.arc(px, py, 5, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = '#FFFF00'; ctx.font = 'bold 10px monospace';
    ctx.fillText(`ZL = ${loadR} + j${loadX} Ω  (VSWR: ${pt.swr})`, px + 8, py - 4);
  }, [activeTab, telemetry, loadR, loadX]);

  const generateReport = () => {
    const reportObj = {
      title: "REI Antenna & RF Waveguide Diagnostic Report",
      timestamp: new Date().toISOString(),
      frequency_ghz: freqGhz,
      impedance: { load_r: loadR, load_x: loadX, z0 },
      vswr: telemetry?.vswr,
      return_loss_s11_db: telemetry?.return_loss_s11_db,
      link_budget: telemetry?.link_budget,
      antenna_resonance: telemetry?.antenna_resonance,
      engine_version: "2.1.0"
    };
    const blob = new Blob([JSON.stringify(reportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `antenna_report_${Date.now()}.json`; a.click();
  };

  return (
    <div className="win98-outset p-3 flex flex-col gap-3">
      <div className="win98-titlebar">
        <div className="flex items-center gap-2">
          <Radio size={14} className="text-[#FFFF00]" />
          <span>REI_Antenna_RF_Waveguide_Workbench_v2.1.exe - [Smith Chart & Link Budget Suite]</span>
          {trustMode === 'API_VERIFIED' && <span className="ml-2 text-[10px] bg-[#00AA00] text-white px-2 py-0.5 font-bold">✓ API VERIFIED</span>}
          {trustMode === 'LOCAL_DSP' && <span className="ml-2 text-[10px] bg-[#00AAAA] text-white px-2 py-0.5 font-bold">⚡ LOCAL DSP</span>}
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 py-1 border-b border-[#808080]">
        <div className="flex items-center gap-2">
          <button onClick={runAnalysis} disabled={isExecuting} className="win98-btn text-xs bg-[#00AA00] text-[#FFFFFF]">
            <Play size={12} /> {isExecuting ? 'ANALYZING...' : '📡 RUN ANTENNA & RF ANALYSIS'}
          </button>
        </div>
        <button onClick={generateReport} className="win98-btn text-xs">
          <FileText size={12} className="text-[#0000FF]" /> EXPORT REPORT (.JSON)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Left Setup */}
        <div className="win98-outset p-2.5 flex flex-col gap-2 bg-[#C0C0C0] text-xs">
          <div className="font-bold border-b border-[#808080] pb-1 text-[#000080] flex items-center gap-1">
            <Settings size={13} /> RF & Impedance Setup
          </div>
          <div><label className="font-bold">Center Frequency (GHz):</label><input type="number" step="0.1" value={freqGhz} onChange={e => setFreqGhz(parseFloat(e.target.value))} className="w-full font-mono text-xs" /></div>
          <div><label className="font-bold">Z0 Char Impedance (Ω):</label><input type="number" value={z0} onChange={e => setZ0(parseFloat(e.target.value))} className="w-full font-mono text-xs" /></div>

          <div className="border-t border-[#808080] pt-1 font-bold text-[#000080]">Load Impedance ZL = R + jX:</div>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <div><label>R (Resistance Ω):</label><input type="number" value={loadR} onChange={e => setLoadR(parseFloat(e.target.value))} className="w-full font-mono" /></div>
            <div><label>X (Reactance Ω):</label><input type="number" value={loadX} onChange={e => setLoadX(parseFloat(e.target.value))} className="w-full font-mono" /></div>
          </div>

          <div className="border-t border-[#808080] pt-1 font-bold text-[#000080]">Friis Link Parameters:</div>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <div><label>Tx Power (dBm):</label><input type="number" value={txPowerDbm} onChange={e => setTxPowerDbm(parseFloat(e.target.value))} className="w-full font-mono" /></div>
            <div><label>Distance (m):</label><input type="number" value={distanceM} onChange={e => setDistanceM(parseFloat(e.target.value))} className="w-full font-mono" /></div>
          </div>

          <div className="border-t border-[#808080] pt-1 font-bold text-[#000080]">Waveguide (WR-90 mm):</div>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <div><label>Width a (mm):</label><input type="number" step="0.1" value={wgA} onChange={e => setWgA(parseFloat(e.target.value))} className="w-full font-mono" /></div>
            <div><label>Height b (mm):</label><input type="number" step="0.1" value={wgB} onChange={e => setWgB(parseFloat(e.target.value))} className="w-full font-mono" /></div>
          </div>
        </div>

        {/* Middle Canvas Displays */}
        <div className="lg:col-span-2 flex flex-col gap-2">
          <div className="win98-tabs">
            <button onClick={() => setActiveTab('sweep')} className={`win98-tab text-xs ${activeTab === 'sweep' ? 'active font-bold' : ''}`}>S11 Return Loss Sweep</button>
            <button onClick={() => setActiveTab('pattern')} className={`win98-tab text-xs ${activeTab === 'pattern' ? 'active font-bold' : ''}`}>Polar Radiation Pattern</button>
            <button onClick={() => setActiveTab('smith')} className={`win98-tab text-xs ${activeTab === 'smith' ? 'active font-bold text-[#000080]' : ''}`}>Smith Chart Impedance</button>
          </div>

          {activeTab === 'sweep' && <canvas ref={sweepCanvasRef} className="border border-[#808080] w-full" />}
          {activeTab === 'pattern' && <canvas ref={polarCanvasRef} className="border border-[#808080] w-full" />}
          {activeTab === 'smith' && <canvas ref={smithCanvasRef} className="border border-[#808080] w-full" />}

          {/* Resonant Dimensions Table */}
          {telemetry?.antenna_resonance && (
            <div className="grid grid-cols-3 gap-1 text-center font-mono text-xs">
              <div className="bg-[#000000] text-[#00FF00] p-1 border border-[#808080]"><div className="text-[9px] text-[#808080]">WAVELENGTH (λ)</div><div className="font-bold">{telemetry.antenna_resonance.wavelength_m} m</div></div>
              <div className="bg-[#000000] text-[#00FFFF] p-1 border border-[#808080]"><div className="text-[9px] text-[#808080]">DIPOLE LENGTH (L)</div><div className="font-bold">{telemetry.antenna_resonance.physical_length_mm} mm</div></div>
              <div className="bg-[#000000] text-[#FFFF00] p-1 border border-[#808080]"><div className="text-[9px] text-[#808080]">DIRECTIVITY</div><div className="font-bold">{telemetry.antenna_resonance.directivity_dbi} dBi</div></div>
            </div>
          )}
        </div>

        {/* Right Metrics Panel */}
        <div className="win98-outset p-2.5 flex flex-col gap-2 bg-[#C0C0C0] text-xs font-mono">
          <div className="font-bold border-b border-[#808080] pb-1 text-[#000080]">RF Metrics & Link Budget</div>

          {telemetry && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between bg-[#000000] text-[#00FF00] p-1 border border-[#808080]"><span>VSWR:</span><span className="font-bold text-sm">{telemetry.vswr} : 1</span></div>
              <div className="flex justify-between bg-[#000000] text-[#00FFFF] p-1 border border-[#808080]"><span>RETURN LOSS (S11):</span><span className="font-bold">{telemetry.return_loss_s11_db} dB</span></div>
              <div className="flex justify-between bg-[#000000] text-[#FFFF00] p-1 border border-[#808080]"><span>REFLECTION (Γ):</span><span className="font-bold">{telemetry.reflection_coefficient_gamma} @ {telemetry.gamma_phase_deg}°</span></div>
            </div>
          )}

          <div className="font-bold border-t border-[#808080] pt-1 text-[#000080]">Friis Link Budget ({distanceM}m):</div>
          {telemetry?.link_budget && (
            <div className="flex flex-col gap-1 text-[10px]">
              <div className="flex justify-between bg-[#000000] text-[#00FF00] p-1 border border-[#808080]"><span>PATH LOSS (FSPL):</span><span className="font-bold">{telemetry.link_budget.fspl_db} dB</span></div>
              <div className="flex justify-between bg-[#000000] text-[#00FFFF] p-1 border border-[#808080]"><span>RX POWER:</span><span className="font-bold">{telemetry.link_budget.rx_power_dbm} dBm</span></div>
              <div className="flex justify-between bg-[#000000] text-[#FFFF00] p-1 border border-[#808080]"><span>LINK MARGIN:</span><span className="font-bold">{telemetry.link_budget.link_margin_db} dB</span></div>
            </div>
          )}

          <div className="font-bold border-t border-[#808080] pt-1 text-[#000080]">Waveguide Cutoff (WR-90):</div>
          {telemetry?.waveguide_cutoff_hz && (
            <div className="bg-[#000000] text-[#00FF00] p-1.5 text-[10px] border border-[#808080]">
              <div>TE10 Cutoff: {(telemetry.waveguide_cutoff_hz.fc_TE10_hz / 1e9).toFixed(3)} GHz</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
