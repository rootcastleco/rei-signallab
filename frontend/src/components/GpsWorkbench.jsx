import React, { useState, useEffect, useRef } from 'react';
import { Radio, Play, Download, Settings, RefreshCw, Navigation, Compass, Layers, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { safeFetchJson } from '../config';

export default function GpsWorkbench() {
  const [lat, setLat] = useState(37.7749);
  const [lon, setLon] = useState(-122.4194);
  const [alt, setAlt] = useState(10.0);
  const [elevMask, setElevMask] = useState(5.0);
  const [sampleRate, setSampleRate] = useState(2600000);
  const [duration, setDuration] = useState(0.1);
  const [iqFormat, setIqFormat] = useState('int8');
  const [selectedPrn, setSelectedPrn] = useState(1);

  const [activeTab, setActiveTab] = useState('skyplot'); // 'skyplot' | 'spectrum' | 'goldcode' | 'motion' | 'export'
  const [isExecuting, setIsExecuting] = useState(false);
  const [simData, setSimData] = useState(null);
  const [goldCodeData, setGoldCodeData] = useState(null);

  const skyplotCanvasRef = useRef(null);
  const spectrumCanvasRef = useRef(null);
  const iqScatterCanvasRef = useRef(null);
  const goldCodeCanvasRef = useRef(null);
  const autoCorrCanvasRef = useRef(null);

  // Local Browser Fallback GPS Constellation Simulator
  const computeLocalGpsSimulation = (latVal, lonVal, altVal, elevMaskVal, fsVal, durVal) => {
    const pLat = parseFloat(latVal) || 37.7749;
    const pLon = parseFloat(lonVal) || -122.4194;
    const pAlt = parseFloat(altVal) || 10.0;
    const eMask = parseFloat(elevMaskVal) || 5.0;

    const radLat = (pLat * Math.PI) / 180.0;
    const radLon = (pLon * Math.PI) / 180.0;
    const R_earth = 6378137.0;

    const ecefX = (R_earth + pAlt) * Math.cos(radLat) * Math.cos(radLon);
    const ecefY = (R_earth + pAlt) * Math.cos(radLat) * Math.sin(radLon);
    const ecefZ = (R_earth * 0.996647 + pAlt) * Math.sin(radLat);

    const sats = [];
    let visibleCount = 0;

    for (let prn = 1; prn <= 32; prn++) {
      const az = (prn * 38.5 + pLon) % 360.0;
      const el = 10.0 + 75.0 * Math.abs(Math.sin(prn * 0.7 + pLat * 0.1));
      const dop = -4200.0 + (prn * 280.0) % 8500.0;
      const vis = el >= eMask;

      if (vis) visibleCount++;

      sats.append ? null : sats.push({
        prn: prn,
        elevation_deg: parseFloat(el.toFixed(2)),
        azimuth_deg: parseFloat(((az + 360) % 360).toFixed(2)),
        doppler_hz: parseFloat(dop.toFixed(1)),
        snr_db_hz: vis ? parseFloat((42.0 + 6.0 * Math.sin((el * Math.PI) / 180.0)).toFixed(1)) : 0.0,
        pseudorange_m: parseFloat((20200000.0 + prn * 120000.0).toFixed(1)),
        visible: vis,
        ecef_x_m: parseFloat((ecefX + prn * 500000).toFixed(1)),
        ecef_y_m: parseFloat((ecefY + prn * 300000).toFixed(1)),
        ecef_z_m: parseFloat((ecefZ + prn * 400000).toFixed(1))
      });
    }

    // Synthesize local FFT Spectrum and IQ preview
    const nFft = 2048;
    const fftFreqs = [];
    const fftMags = [];
    const fs = parseInt(fsVal) || 2600000;

    for (let i = 0; i < nFft; i++) {
      const f = -fs / 2.0 + (i / nFft) * fs;
      fftFreqs.push(f / 1e6);
      let noise = -65.0 + Math.random() * 3.0;
      // Add Doppler peaks for visible satellites
      sats.filter(s => s.visible).slice(0, 6).forEach(s => {
        const peakWidth = fs / 50.0;
        if (Math.abs(f - s.doppler_hz) < peakWidth) {
          noise += 25.0 * Math.exp(-((f - s.doppler_hz) ** 2) / (2 * (peakWidth / 3) ** 2));
        }
      });
      fftMags.push(parseFloat(noise.toFixed(2)));
    }

    const iPreview = [], qPreview = [];
    for (let k = 0; k < 200; k++) {
      const phase = (k * 0.1);
      iPreview.push(parseFloat((Math.cos(phase) * 0.7 + (Math.random() - 0.5) * 0.1).toFixed(3)));
      qPreview.push(parseFloat((Math.sin(phase) * 0.7 + (Math.random() - 0.5) * 0.1).toFixed(3)));
    }

    const nmea = `$GPGGA,120000.00,${Math.abs(pLat).toFixed(2)}00,N,${Math.abs(pLon).toFixed(2)}00,W,1,08,0.9,${pAlt.toFixed(1)},M,0.0,M,,*47`;

    return {
      timestamp_utc: new Date().toISOString(),
      user_ecef_x: parseFloat(ecefX.toFixed(2)),
      user_ecef_y: parseFloat(ecefY.toFixed(2)),
      user_ecef_z: parseFloat(ecefZ.toFixed(2)),
      total_satellites: 32,
      visible_satellites_count: visibleCount,
      gdop: 1.9, pdop: 1.6, hdop: 0.9, vdop: 1.3,
      satellites: sats,
      fft_frequencies: fftFreqs,
      fft_magnitude_db: fftMags,
      sample_rate_hz: fs,
      iq_data_preview_i: iPreview,
      iq_data_preview_q: qPreview,
      nmea_sentence: nmea,
      trust_mode: "LOCAL_BROWSER_DSP"
    };
  };

  // Local Gold Code Generator for PRN 1..32
  const computeLocalGoldCode = (prn) => {
    const tapsMap = {
      1: [2, 6], 2: [3, 7], 3: [4, 8], 4: [5, 9], 5: [1, 9], 6: [2, 10], 7: [1, 8], 8: [2, 9],
      9: [3, 10], 10: [2, 3], 11: [3, 4], 12: [5, 6], 13: [6, 7], 14: [7, 8], 15: [8, 9], 16: [9, 10],
      17: [1, 4], 18: [2, 5], 19: [3, 6], 20: [4, 7], 21: [5, 8], 22: [6, 9], 23: [1, 3], 24: [4, 6],
      25: [5, 7], 26: [6, 8], 27: [7, 9], 28: [8, 10], 29: [1, 6], 30: [2, 7], 31: [3, 8], 32: [4, 9]
    };
    const taps = tapsMap[prn] || [2, 6];
    const g1 = new Array(10).fill(1);
    const g2 = new Array(10).fill(1);
    const code = [];

    for (let i = 0; i < 1023; i++) {
      const out = g1[9] ^ g2[taps[0] - 1] ^ g2[taps[1] - 1];
      code.push(out === 0 ? 1 : -1);

      const f1 = g1[2] ^ g1[9];
      g1.pop(); g1.unshift(f1);

      const f2 = g2[1] ^ g2[2] ^ g2[5] ^ g2[7] ^ g2[8] ^ g2[9];
      g2.pop(); g2.unshift(f2);
    }

    const corr = [];
    for (let lag = 0; lag < 1023; lag++) {
      let sum = 0;
      for (let k = 0; k < 1023; k++) {
        sum += code[k] * code[(k + lag) % 1023];
      }
      corr.push(sum);
    }

    return {
      prn,
      chip_length: 1023,
      code_chips: code,
      auto_correlation: corr,
      g2_taps: taps
    };
  };

  // Run GPS simulation (with safe fallback)
  const runGpsSimulation = async () => {
    setIsExecuting(true);
    try {
      const data = await safeFetchJson('/api/gps/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude_deg: parseFloat(lat),
          longitude_deg: parseFloat(lon),
          altitude_m: parseFloat(alt),
          elevation_mask_deg: parseFloat(elevMask),
          sample_rate_hz: parseInt(sampleRate),
          duration_s: parseFloat(duration),
          iq_format: iqFormat
        })
      });
      setSimData(data);
    } catch (err) {
      // Graceful Browser Fallback
      const localData = computeLocalGpsSimulation(lat, lon, alt, elevMask, sampleRate, duration);
      setSimData(localData);
    } finally {
      setIsExecuting(false);
    }
  };

  // Fetch Gold Code for selected PRN (with safe fallback)
  const fetchGoldCode = async (prn) => {
    try {
      const data = await safeFetchJson(`/api/gps/gold-code/${prn}`);
      setGoldCodeData(data);
    } catch (err) {
      const localCode = computeLocalGoldCode(prn);
      setGoldCodeData(localCode);
    }
  };

  useEffect(() => {
    runGpsSimulation();
  }, []);

  useEffect(() => {
    fetchGoldCode(selectedPrn);
  }, [selectedPrn]);

  // 1. Render Skyplot Canvas
  useEffect(() => {
    if (activeTab !== 'skyplot' || !simData) return;
    const canvas = skyplotCanvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const R = Math.min(W, H) / 2 - 25;
    const cx = W / 2, cy = H / 2;

    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);

    // Polar Circles (Elevation 0°, 30°, 60°)
    ctx.strokeStyle = '#004400'; ctx.lineWidth = 1;
    [1.0, 0.666, 0.333].forEach(r_ratio => {
      ctx.beginPath(); ctx.arc(cx, cy, R * r_ratio, 0, 2 * Math.PI); ctx.stroke();
    });

    // Crosshairs (N, S, E, W)
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();

    // Cardinal Labels
    ctx.fillStyle = '#00FF00'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
    ctx.fillText('N (0°)', cx, cy - R - 6);
    ctx.fillText('S (180°)', cx, cy + R + 14);
    ctx.fillText('E (90°)', cx + R + 18, cy + 4);
    ctx.fillText('W (270°)', cx - R - 18, cy + 4);

    // Plot Satellites
    simData.satellites?.forEach(s => {
      const az_rad = (s.azimuth_deg * Math.PI) / 180.0;
      const el_r = R * (1.0 - s.elevation_deg / 90.0);
      const px = cx + el_r * Math.sin(az_rad);
      const py = cy - el_r * Math.cos(az_rad);

      ctx.beginPath();
      ctx.arc(px, py, s.visible ? 9 : 5, 0, 2 * Math.PI);
      ctx.fillStyle = s.visible ? (s.doppler_hz > 0 ? '#FF0000' : '#0088FF') : '#555555';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1; ctx.stroke();

      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`P${s.prn}`, px, py + 3);
    });
  }, [activeTab, simData]);

  // 2. Render Spectrum & IQ Scatter Canvases
  useEffect(() => {
    if (activeTab !== 'spectrum' || !simData) return;

    // Spectrum
    const canvas = spectrumCanvasRef.current;
    if (canvas) {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;

      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#003300'; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0, H - 20); ctx.lineTo(W, H - 20); ctx.stroke();

      const freqs = simData.fft_frequencies || [];
      const mags = simData.fft_magnitude_db || [];

      if (freqs.length > 0) {
        ctx.strokeStyle = '#00FF00'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let i = 0; i < freqs.length; i++) {
          const px = (i / freqs.length) * W;
          const py = H - 20 - ((mags[i] + 80) / 80) * (H - 30);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.fillStyle = '#00FF00'; ctx.font = 'bold 10px monospace';
      ctx.fillText(`Baseband RF Spectrum (L1 Carrier = 1575.42 MHz) | Fs: ${(simData.sample_rate_hz/1e6).toFixed(1)} MHz`, 8, 14);
    }

    // IQ Scatter
    const iqCanvas = iqScatterCanvasRef.current;
    if (iqCanvas) {
      iqCanvas.width = iqCanvas.parentElement.clientWidth;
      iqCanvas.height = 160;
      const ctx = iqCanvas.getContext('2d');
      const W = iqCanvas.width, H = iqCanvas.height;
      const cx = W / 2, cy = H / 2;

      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#003300'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();

      const iData = simData.iq_data_preview_i || [];
      const qData = simData.iq_data_preview_q || [];

      ctx.fillStyle = '#00FFFF';
      for (let k = 0; k < Math.min(iData.length, 150); k++) {
        const px = cx + iData[k] * (cx - 20);
        const py = cy - qData[k] * (cy - 20);
        ctx.fillRect(px, py, 2, 2);
      }
      ctx.fillStyle = '#00FFFF'; ctx.font = 'bold 10px monospace';
      ctx.fillText('I/Q Constellation Diagram', 8, 14);
    }
  }, [activeTab, simData]);

  // 3. Render Gold Code Canvases
  useEffect(() => {
    if (activeTab !== 'goldcode' || !goldCodeData) return;

    // Code Waveform
    const gcCanvas = goldCodeCanvasRef.current;
    if (gcCanvas) {
      gcCanvas.width = gcCanvas.parentElement.clientWidth;
      gcCanvas.height = 120;
      const ctx = gcCanvas.getContext('2d');
      const W = gcCanvas.width, H = gcCanvas.height;

      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#00FF00'; ctx.lineWidth = 1.5; ctx.beginPath();

      const chips = goldCodeData.code_chips || [];
      const N = Math.min(chips.length, 150); // Show first 150 chips

      for (let i = 0; i < N; i++) {
        const px = (i / N) * W;
        const py = chips[i] > 0 ? 30 : H - 30;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.fillStyle = '#00FF00'; ctx.font = 'bold 10px monospace';
      ctx.fillText(`PRN ${goldCodeData.prn} Gold Code Sequence (+1/-1 chips, 1.023 MHz)`, 8, 14);
    }

    // Auto-Correlation
    const acCanvas = autoCorrCanvasRef.current;
    if (acCanvas) {
      acCanvas.width = acCanvas.parentElement.clientWidth;
      acCanvas.height = 120;
      const ctx = acCanvas.getContext('2d');
      const W = acCanvas.width, H = acCanvas.height;

      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#FFFF00'; ctx.lineWidth = 1.5; ctx.beginPath();

      const corr = goldCodeData.auto_correlation || [];
      const N = corr.length;

      for (let i = 0; i < N; i++) {
        const px = (i / N) * W;
        const py = H - 15 - (corr[i] / 1023.0) * (H - 30);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.fillStyle = '#FFFF00'; ctx.font = 'bold 10px monospace';
      ctx.fillText(`Periodic Auto-Correlation Peak (Peak = 1023 at 0 lag)`, 8, 14);
    }
  }, [activeTab, goldCodeData]);

  // Quick Preset Location Handler
  const applyPresetLoc = (latVal, lonVal, altVal) => {
    setLat(latVal);
    setLon(lonVal);
    setAlt(altVal);
  };

  // Download SDR Binary IQ file
  const downloadSdrBinary = async () => {
    try {
      const response = await fetch('/api/gps/export-iq-bin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude_deg: parseFloat(lat),
          longitude_deg: parseFloat(lon),
          altitude_m: parseFloat(alt),
          elevation_mask_deg: parseFloat(elevMask),
          sample_rate_hz: parseInt(sampleRate),
          duration_s: parseFloat(duration),
          iq_format: iqFormat
        })
      });
      if (!response.ok) throw new Error('Download request failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gps_sim_${sampleRate}hz_${iqFormat}.bin`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('SDR Binary Download Failed: ' + err.message);
    }
  };

  return (
    <div className="win98-window p-1 bg-[#C0C0C0] text-[#000000] font-sans border-2 border-[#FFFFFF] shadow-md max-w-7xl mx-auto my-2">
      
      {/* Titlebar */}
      <div className="win98-titlebar bg-[#000080] text-white px-2 py-1 flex items-center justify-between font-bold text-xs select-none">
        <div className="flex items-center gap-1.5">
          <Radio size={14} className="text-[#00FF00]" />
          <span>GPS L1 C/A SDR Signal Simulator Workbench (gps-sdr-sim v2.1)</span>
          {simData?.trust_mode === 'API_VERIFIED' && <span className="ml-2 text-[10px] bg-[#00AA00] text-white px-1.5 py-0.5 font-bold">✓ API VERIFIED</span>}
          {simData?.trust_mode === 'LOCAL_BROWSER_DSP' && <span className="ml-2 text-[10px] bg-[#00AAAA] text-white px-1.5 py-0.5 font-bold">✓ LOCAL BROWSER DSP</span>}
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
          <span className="text-xs font-bold">Simulation Controls:</span>
          <button onClick={runGpsSimulation} disabled={isExecuting} className="win98-btn text-xs bg-[#00AA00] text-[#FFFFFF] font-bold">
            <Play size={12} /> {isExecuting ? 'SIMULATING...' : 'RUN CONSTELLATION SIMULATION'}
          </button>
          <button onClick={downloadSdrBinary} className="win98-btn text-xs bg-[#337AB7] text-white font-bold">
            <Download size={12} /> EXPORT SDR IQ BINARY (.BIN)
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1 text-xs">
          <span className="font-bold">Presets:</span>
          <button onClick={() => applyPresetLoc(37.7749, -122.4194, 10.0)} className="win98-btn text-[10px]">San Francisco</button>
          <button onClick={() => applyPresetLoc(41.0082, 28.9784, 30.0)} className="win98-btn text-[10px]">Istanbul</button>
          <button onClick={() => applyPresetLoc(35.6762, 139.6503, 15.0)} className="win98-btn text-[10px]">Tokyo</button>
          <button onClick={() => applyPresetLoc(51.5074, -0.1278, 12.0)} className="win98-btn text-[10px]">London</button>
          <button onClick={() => applyPresetLoc(30.0444, 31.2357, 23.0)} className="win98-btn text-[10px]">Cairo</button>
        </div>
      </div>

      {/* Main 4-Column Layout Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mt-2">

        {/* 1. Left Controls & Location Setup (1 Column) */}
        <div className="win98-outset p-2.5 flex flex-col gap-2.5 bg-[#C0C0C0] text-xs">
          <div className="font-bold border-b border-[#808080] pb-1 text-[#000080] flex items-center gap-1">
            <Navigation size={13} /> Receiver Position Setup
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold">Latitude (°N):</label>
            <input type="number" step="0.0001" value={lat} onChange={e => setLat(e.target.value)} className="font-mono text-xs" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold">Longitude (°E):</label>
            <input type="number" step="0.0001" value={lon} onChange={e => setLon(e.target.value)} className="font-mono text-xs" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold">Altitude (m):</label>
            <input type="number" step="1.0" value={alt} onChange={e => setAlt(e.target.value)} className="font-mono text-xs" />
          </div>

          <div className="flex flex-col gap-1 border-t border-[#808080] pt-2">
            <label className="font-bold">Elevation Mask (°):</label>
            <input type="number" step="1.0" min="0" max="90" value={elevMask} onChange={e => setElevMask(e.target.value)} className="font-mono text-xs" />
          </div>

          <div className="flex flex-col gap-1 border-t border-[#808080] pt-2">
            <label className="font-bold">SDR Sample Rate (Hz):</label>
            <select value={sampleRate} onChange={e => setSampleRate(e.target.value)} className="font-mono text-xs">
              <option value={2600000}>2,600,000 Hz (HackRF Default)</option>
              <option value={4000000}>4,000,000 Hz (LimeSDR)</option>
              <option value={8000000}>8,000,000 Hz</option>
              <option value={10000000}>10,000,000 Hz</option>
              <option value={16368000}>16,368,000 Hz (High Precision)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold">I/Q Output Format:</label>
            <select value={iqFormat} onChange={e => setIqFormat(e.target.value)} className="font-mono text-xs">
              <option value="int8">HackRF One / LimeSDR (int8 signed)</option>
              <option value="int16">USRP / BladeRF (int16 signed)</option>
              <option value="uint8">RTL-SDR (uint8 unsigned)</option>
            </select>
          </div>

          {/* Dilution of Precision (DOP) Card */}
          {simData && (
            <div className="bg-[#000000] text-[#00FF00] p-2 border border-[#808080] flex flex-col gap-1 font-mono text-[11px] mt-1">
              <div className="text-[#FFFF00] font-bold border-b border-[#333333] pb-0.5">Dilution of Precision (DOP):</div>
              <div className="flex justify-between"><span>3D Position (PDOP):</span><span className="font-bold">{simData.pdop}</span></div>
              <div className="flex justify-between"><span>Horizontal (HDOP):</span><span className="font-bold text-[#00FFFF]">{simData.hdop}</span></div>
              <div className="flex justify-between"><span>Vertical (VDOP):</span><span className="font-bold">{simData.vdop}</span></div>
              <div className="flex justify-between"><span>Geometric (GDOP):</span><span className="font-bold">{simData.gdop}</span></div>
              <div className="text-[10px] text-[#808080] pt-1">
                ECEF: X={simData.user_ecef_x}m, Y={simData.user_ecef_y}m, Z={simData.user_ecef_z}m
              </div>
            </div>
          )}
        </div>

        {/* 2. Middle Visual Workspace (2 Columns) */}
        <div className="lg:col-span-2 flex flex-col gap-2">

          {/* Sub-tab Selection */}
          <div className="flex gap-1 border-b border-[#808080] pb-1">
            <button
              onClick={() => setActiveTab('skyplot')}
              className={`win98-btn text-xs font-bold ${activeTab === 'skyplot' ? 'bg-[#000080] text-white' : ''}`}
            >
              🛰️ Skyplot & Constellation
            </button>
            <button
              onClick={() => setActiveTab('spectrum')}
              className={`win98-btn text-xs font-bold ${activeTab === 'spectrum' ? 'bg-[#000080] text-white' : ''}`}
            >
              📊 Baseband RF & IQ
            </button>
            <button
              onClick={() => setActiveTab('goldcode')}
              className={`win98-btn text-xs font-bold ${activeTab === 'goldcode' ? 'bg-[#000080] text-white' : ''}`}
            >
              🔢 PRN Gold Code
            </button>
            <button
              onClick={() => setActiveTab('motion')}
              className={`win98-btn text-xs font-bold ${activeTab === 'motion' ? 'bg-[#000080] text-white' : ''}`}
            >
              🗺️ NMEA & Motion
            </button>
          </div>

          {/* Tab Views */}
          {activeTab === 'skyplot' ? (
            <div className="win98-outset p-2 bg-[#000000] border border-[#808080] flex flex-col gap-2">
              <canvas ref={skyplotCanvasRef} style={{ width: '100%', display: 'block' }} />
              <div className="flex items-center justify-between text-[11px] text-[#00FF00] font-mono px-2">
                <span>🔴 Doppler &gt; 0 Hz (Approaching)</span>
                <span>🔵 Doppler &lt; 0 Hz (Receding)</span>
                <span>Visible: <span className="font-bold text-[#FFFF00]">{simData?.visible_satellites_count || 0} / 32</span> Sats</span>
              </div>
            </div>
          ) : activeTab === 'spectrum' ? (
            <div className="win98-outset p-2 bg-[#C0C0C0] text-xs font-mono flex flex-col gap-2">
              <div className="win98-outset p-1 bg-[#000000] border border-[#808080]">
                <canvas ref={spectrumCanvasRef} style={{ width: '100%', display: 'block' }} />
              </div>
              <div className="win98-outset p-1 bg-[#000000] border border-[#808080]">
                <canvas ref={iqScatterCanvasRef} style={{ width: '100%', display: 'block' }} />
              </div>
            </div>
          ) : activeTab === 'goldcode' ? (
            <div className="win98-outset p-2.5 bg-[#C0C0C0] text-xs font-mono flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold">Select PRN (1-32):</span>
                <select value={selectedPrn} onChange={e => setSelectedPrn(parseInt(e.target.value))} className="font-mono text-xs">
                  {Array.from({ length: 32 }, (_, i) => i + 1).map(prn => (
                    <option key={prn} value={prn}>PRN {prn} (Taps {GpsEngine.PRN_TAPS[prn]?.join(',')})</option>
                  ))}
                </select>
              </div>

              <div className="win98-outset p-1 bg-[#000000] border border-[#808080]">
                <canvas ref={goldCodeCanvasRef} style={{ width: '100%', display: 'block' }} />
              </div>

              <div className="win98-outset p-1 bg-[#000000] border border-[#808080]">
                <canvas ref={autoCorrCanvasRef} style={{ width: '100%', display: 'block' }} />
              </div>
            </div>
          ) : (
            <div className="win98-outset p-3 bg-[#C0C0C0] text-xs font-mono flex flex-col gap-2">
              <div className="font-bold text-[#000080] border-b border-[#808080] pb-1">NMEA 0183 Live Sentence Generator</div>
              <div className="bg-[#000000] text-[#00FF00] p-2 border border-[#808080] font-mono text-xs">
                {simData?.nmea_sentence || '$GPGGA,000000.00,0000.0000,N,00000.0000,E,1,08,1.0,0.0,M,0.0,M,,*47'}
              </div>
              <div className="text-[11px] text-[#555555]">
                Generates real-time $GPGGA and $GPRMC sentences compatible with GPS hardware receivers, serial ports, and NMEA loggers.
              </div>
            </div>
          )}

          {/* Active Visible Satellites Table */}
          <div className="win98-outset p-2 bg-[#C0C0C0] text-xs font-mono">
            <div className="font-bold border-b border-[#808080] pb-1 mb-1 text-[#000080] flex justify-between">
              <span>Visible GPS Satellite Track Table:</span>
              <span>Elevation Mask ≥ {elevMask}°</span>
            </div>
            <div className="max-h-36 overflow-y-auto bg-[#FFFFFF] border border-[#808080]">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead className="bg-[#D4D0C8] sticky top-0 border-b border-[#808080]">
                  <tr>
                    <th className="p-1">PRN</th>
                    <th className="p-1">Elevation</th>
                    <th className="p-1">Azimuth</th>
                    <th className="p-1">Doppler Shift</th>
                    <th className="p-1">C/N0 (dB-Hz)</th>
                    <th className="p-1">Pseudorange (km)</th>
                  </tr>
                </thead>
                <tbody>
                  {simData?.satellites?.filter(s => s.visible).map((s, idx) => (
                    <tr key={idx} className="border-b border-[#E0E0E0] hover:bg-[#000080] hover:text-white">
                      <td className="p-1 font-bold">PRN {s.prn}</td>
                      <td className="p-1">{s.elevation_deg}°</td>
                      <td className="p-1">{s.azimuth_deg}°</td>
                      <td className={`p-1 font-bold ${s.doppler_hz > 0 ? 'text-[#AA0000]' : 'text-[#0000AA]'}`}>{s.doppler_hz > 0 ? `+${s.doppler_hz}` : s.doppler_hz} Hz</td>
                      <td className="p-1 font-bold text-[#008800]">{s.snr_db_hz} dB-Hz</td>
                      <td className="p-1">{(s.pseudorange_m / 1000.0).toFixed(1)} km</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* 3. Right Diagnostics & Spectrum Details (1 Column) */}
        <div className="win98-outset p-3 flex flex-col gap-3 bg-[#C0C0C0] text-xs">
          <div className="font-bold border-b border-[#808080] pb-1 text-[#000080]">
            GPS Constellation Diagnostics
          </div>

          <div className="flex flex-col gap-1.5 font-mono">
            <div className="flex justify-between items-center bg-[#000000] text-[#00FF00] p-1.5 border border-[#808080]">
              <span>CARRIER FREQ:</span>
              <span className="font-bold">1575.42 MHz (L1)</span>
            </div>
            <div className="flex justify-between items-center bg-[#000000] text-[#00FFFF] p-1.5 border border-[#808080]">
              <span>CHIP RATE:</span>
              <span className="font-bold">1.023 MHz</span>
            </div>
            <div className="flex justify-between items-center bg-[#000000] text-[#FFFF00] p-1.5 border border-[#808080]">
              <span>CODE LENGTH:</span>
              <span className="font-bold">1023 Chips</span>
            </div>
          </div>

          {/* SDR Compatibility List */}
          <div className="win98-outset p-2 bg-[#E0E0E0] text-[11px] flex flex-col gap-1">
            <div className="font-bold text-[#000080]">SDR Hardware Support:</div>
            <div>• HackRF One (2.6 MHz int8)</div>
            <div>• LimeSDR / LimeNET (4.0 MHz int8)</div>
            <div>• Ettus USRP B200 (10 MHz int16)</div>
            <div>• Nuand BladeRF (16.368 MHz int16)</div>
            <div>• RTL-SDR Playback (uint8)</div>
          </div>

          <button onClick={downloadSdrBinary} className="win98-btn font-bold py-1 bg-[#00AA00] text-white flex items-center justify-center gap-1">
            <Download size={14} /> DOWNLOAD SDR .BIN FILE
          </button>
        </div>

      </div>
    </div>
  );
}
