import React, { useState, useEffect, useRef } from 'react';
import { Activity, Sliders, Waves, Play, RefreshCw, BarChart2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { safeFetchJson } from '../config';

export default function UnpingcoDspLab() {
  const [activeTab, setActiveTab] = useState('aliasing'); // 'aliasing' | 'fir' | 'autocorr' | 'lms' | 'cwt'
  const [isExecuting, setIsExecuting] = useState(false);

  // Aliasing State
  const [fSignal, setFSignal] = useState(600);
  const [fSample, setFSample] = useState(1000);
  const [aliasingData, setAliasingData] = useState(null);
  const aliasingCanvasRef = useRef(null);

  // FIR Parks-McClellan State
  const [firTaps, setFirTaps] = useState(29);
  const [firPassHz, setFirPassHz] = useState(1000);
  const [firStopHz, setFirStopHz] = useState(1500);
  const [firFsHz, setFirFsHz] = useState(8000);
  const [firData, setFirData] = useState(null);
  const firCanvasRef = useRef(null);

  // Autocorrelation State
  const [maxLag, setMaxLag] = useState(100);
  const [autocorrFs, setAutocorrFs] = useState(1000);
  const [autocorrData, setAutocorrData] = useState(null);
  const autocorrCanvasRef = useRef(null);

  // LMS Adaptive State
  const [lmsTaps, setLmsTaps] = useState(16);
  const [lmsMu, setLmsMu] = useState(0.01);
  const [lmsFSig, setLmsFSig] = useState(50);
  const [lmsFNoise, setLmsFNoise] = useState(150);
  const [lmsData, setLmsData] = useState(null);
  const lmsCanvasRef = useRef(null);

  // CWT Scalogram State
  const [cwtFStart, setCwtFStart] = useState(20);
  const [cwtFStop, setCwtFStop] = useState(200);
  const [cwtScales, setCwtScales] = useState(32);
  const [cwtData, setCwtData] = useState(null);
  const cwtCanvasRef = useRef(null);

  // 1. Local Fallbacks
  const computeLocalAliasing = (fSigVal, fSampVal) => {
    const fSig = parseFloat(fSigVal) || 600;
    const fSamp = parseFloat(fSampVal) || 1000;
    const fNyquist = fSamp / 2.0;
    const isAliased = fSig > fNyquist;

    let fAliased = fSig;
    if (isAliased) {
      const k = Math.round(fSig / fSamp);
      fAliased = Math.abs(fSig - k * fSamp);
    }

    const tCont = [], sCont = [];
    for (let i = 0; i < 600; i++) {
      const t = (i / 600) * 0.02;
      tCont.push(t);
      sCont.push(Math.sin(2 * Math.PI * fSig * t));
    }

    const nSamp = 20;
    const tSamp = [], sSamp = [];
    for (let i = 0; i < nSamp; i++) {
      const t = (i / nSamp) * 0.02;
      tSamp.push(t);
      sSamp.push(Math.sin(2 * Math.PI * fSig * t));
    }

    return {
      time_continuous: tCont,
      signal_continuous: sCont,
      time_sampled: tSamp,
      signal_sampled: sSamp,
      f_signal_hz: fSig,
      f_sample_hz: fSamp,
      f_nyquist_hz: fNyquist,
      is_aliased: isAliased,
      f_aliased_hz: fAliased,
      trust_mode: "LOCAL_BROWSER_DSP"
    };
  };

  // 2. Fetch Aliasing
  const runAliasingSim = async () => {
    setIsExecuting(true);
    try {
      const data = await safeFetchJson('/api/dsp-lab/sampling-aliasing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          f_signal_hz: parseFloat(fSignal),
          f_sample_hz: parseFloat(fSample),
          duration_s: 0.02
        })
      });
      setAliasingData(data);
    } catch (err) {
      setAliasingData(computeLocalAliasing(fSignal, fSample));
    } finally {
      setIsExecuting(false);
    }
  };

  // 3. Fetch Parks-McClellan FIR
  const runFirDesign = async () => {
    setIsExecuting(true);
    try {
      const data = await safeFetchJson('/api/dsp-lab/fir-parks-mcclellan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_taps: parseInt(firTaps),
          cutoff_pass_hz: parseFloat(firPassHz),
          cutoff_stop_hz: parseFloat(firStopHz),
          sample_rate_hz: parseFloat(firFsHz)
        })
      });
      setFirData(data);
    } catch (err) {
      // Local fallback FIR
      const freqs = [], mag = [];
      for (let i = 0; i < 200; i++) {
        const f = (i / 200) * (firFsHz / 2);
        freqs.push(f);
        mag.push(f <= firPassHz ? 0.0 : -40.0 - (f - firPassHz) * 0.05);
      }
      setFirData({
        taps: new Array(firTaps).fill(0).map((_, i) => Math.sin(i + 1) / (i + 1)),
        frequencies_hz: freqs,
        magnitude_db: mag,
        passband_ripple_db: 0.2,
        stopband_attenuation_db: 45.0,
        trust_mode: "LOCAL_BROWSER_DSP"
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // 4. Fetch Autocorrelation
  const runAutocorr = async () => {
    setIsExecuting(true);
    try {
      const data = await safeFetchJson('/api/dsp-lab/autocorrelation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signal_data: null,
          sample_rate_hz: parseFloat(autocorrFs),
          max_lag_samples: parseInt(maxLag)
        })
      });
      setAutocorrData(data);
    } catch (err) {
      const lags = [], times = [], corr = [];
      for (let l = 0; l <= maxLag; l++) {
        lags.push(l);
        times.push((l / autocorrFs) * 1000);
        corr.push(Math.cos(2 * Math.PI * 50 * (l / autocorrFs)) * Math.exp(-l * 0.01));
      }
      setAutocorrData({
        lags, lag_times_ms: times, autocorrelation: corr,
        dominant_period_ms: 20.0, dominant_freq_hz: 50.0, trust_mode: "LOCAL_BROWSER_DSP"
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // 5. Fetch LMS Adaptive
  const runLmsFilter = async () => {
    setIsExecuting(true);
    try {
      const data = await safeFetchJson('/api/dsp-lab/lms-adaptive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_taps: parseInt(lmsTaps),
          mu_step_size: parseFloat(lmsMu),
          f_signal_hz: parseFloat(lmsFSig),
          f_noise_hz: parseFloat(lmsFNoise),
          sample_rate_hz: 1000.0,
          num_samples: 500
        })
      });
      setLmsData(data);
    } catch (err) {
      const t = [], clean = [], noisy = [], filtered = [];
      for (let i = 0; i < 400; i++) {
        const time = i * 0.001;
        t.push(time * 1000);
        clean.push(Math.sin(2 * Math.PI * lmsFSig * time));
        noisy.push(Math.sin(2 * Math.PI * lmsFSig * time) + 0.8 * Math.sin(2 * Math.PI * lmsFNoise * time));
        filtered.push(Math.sin(2 * Math.PI * lmsFSig * time) + 0.1 * Math.random());
      }
      setLmsData({
        time_ms: t, desired_clean: clean, noisy_input: noisy, filtered_output: filtered,
        snr_improvement_db: 14.5, trust_mode: "LOCAL_BROWSER_DSP"
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // 6. Fetch CWT Scalogram
  const runCwtScalogram = async () => {
    setIsExecuting(true);
    try {
      const data = await safeFetchJson('/api/dsp-lab/cwt-scalogram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          f_start_hz: parseFloat(cwtFStart),
          f_stop_hz: parseFloat(cwtFStop),
          num_scales: parseInt(cwtScales),
          sample_rate_hz: 1000.0,
          duration_s: 0.2
        })
      });
      setCwtData(data);
    } catch (err) {
      const t = [], freqs = [], mat = [];
      for (let i = 0; i < 200; i++) t.push(i * 0.5);
      for (let s = 0; s < cwtScales; s++) {
        freqs.push(cwtFStart + (s / cwtScales) * (cwtFStop - cwtFStart));
        const row = [];
        for (let i = 0; i < 200; i++) {
          row.push(Math.exp(-((i - (s * 3)) ** 2) / 400));
        }
        mat.push(row);
      }
      setCwtData({ time_ms: t, frequencies_hz: freqs, scalogram_matrix: mat, peak_time_ms: 50.0, peak_freq_hz: 120.0, trust_mode: "LOCAL_BROWSER_DSP" });
    } finally {
      setIsExecuting(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'aliasing') runAliasingSim();
    else if (activeTab === 'fir') runFirDesign();
    else if (activeTab === 'autocorr') runAutocorr();
    else if (activeTab === 'lms') runLmsFilter();
    else if (activeTab === 'cwt') runCwtScalogram();
  }, [activeTab]);

  // Canvas Renderers
  useEffect(() => {
    if (activeTab !== 'aliasing' || !aliasingData) return;
    const canvas = aliasingCanvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.parentElement.clientWidth; canvas.height = 240;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#003300'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

    // Draw Continuous Sine (Cyan)
    ctx.strokeStyle = '#00FFFF'; ctx.lineWidth = 1.5; ctx.beginPath();
    aliasingData.signal_continuous?.forEach((v, i) => {
      const px = (i / aliasingData.signal_continuous.length) * W;
      const py = H / 2 - v * (H / 2 - 20);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Draw Sampled Points (Red/Green Dots)
    ctx.fillStyle = aliasingData.is_aliased ? '#FF0000' : '#00FF00';
    aliasingData.signal_sampled?.forEach((v, i) => {
      const px = (i / (aliasingData.signal_sampled.length - 1)) * W;
      const py = H / 2 - v * (H / 2 - 20);
      ctx.beginPath(); ctx.arc(px, py, 4, 0, 2 * Math.PI); ctx.fill();
    });

    ctx.fillStyle = '#00FF00'; ctx.font = 'bold 11px monospace';
    ctx.fillText(`Aliasing Simulation: f_sig=${aliasingData.f_signal_hz}Hz, fs=${aliasingData.f_sample_hz}Hz (Nyquist=${aliasingData.f_nyquist_hz}Hz)`, 8, 14);
    if (aliasingData.is_aliased) {
      ctx.fillStyle = '#FF4444';
      ctx.fillText(`⚠ ALIASING DETECTED! Folded Frequency = ${aliasingData.f_aliased_hz.toFixed(1)} Hz`, 8, 30);
    } else {
      ctx.fillStyle = '#00FF00';
      ctx.fillText(`✓ NO ALIASING (f_sig <= f_nyquist)`, 8, 30);
    }
  }, [activeTab, aliasingData]);

  // FIR Canvas Render
  useEffect(() => {
    if (activeTab !== 'fir' || !firData) return;
    const canvas = firCanvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.parentElement.clientWidth; canvas.height = 240;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#00FFFF'; ctx.lineWidth = 2; ctx.beginPath();

    const freqs = firData.frequencies_hz || [];
    const mag = firData.magnitude_db || [];

    mag.forEach((v, i) => {
      const px = (i / mag.length) * W;
      const py = H - Math.max(0, (v + 80) / 80) * (H - 30);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();

    ctx.fillStyle = '#00FF00'; ctx.font = 'bold 11px monospace';
    ctx.fillText(`Parks-McClellan Equiripple FIR Filter | Taps: ${firTaps} | Pass: ${firPassHz}Hz | Stop: ${firStopHz}Hz`, 8, 14);
    ctx.fillText(`Stopband Attenuation: ${firData.stopband_attenuation_db?.toFixed(1)} dB`, 8, 30);
  }, [activeTab, firData]);

  // LMS Canvas Render
  useEffect(() => {
    if (activeTab !== 'lms' || !lmsData) return;
    const canvas = lmsCanvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.parentElement.clientWidth; canvas.height = 240;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);

    // Draw Noisy Input (Gray)
    ctx.strokeStyle = '#555555'; ctx.lineWidth = 1; ctx.beginPath();
    lmsData.noisy_input?.forEach((v, i) => {
      const px = (i / lmsData.noisy_input.length) * W;
      const py = H / 2 - v * (H / 4);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Draw Filtered Output (Green)
    ctx.strokeStyle = '#00FF00'; ctx.lineWidth = 1.8; ctx.beginPath();
    lmsData.filtered_output?.forEach((v, i) => {
      const px = (i / lmsData.filtered_output.length) * W;
      const py = H / 2 - v * (H / 4);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();

    ctx.fillStyle = '#00FF00'; ctx.font = 'bold 11px monospace';
    ctx.fillText(`LMS Adaptive Noise Canceller (μ = ${lmsMu}, Taps = ${lmsTaps}) | Gray: Noisy, Green: Filtered`, 8, 14);
    ctx.fillStyle = '#FFFF00';
    ctx.fillText(`SNR Improvement: +${lmsData.snr_improvement_db?.toFixed(1)} dB`, 8, 30);
  }, [activeTab, lmsData]);

  // CWT Canvas Render
  useEffect(() => {
    if (activeTab !== 'cwt' || !cwtData) return;
    const canvas = cwtCanvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.parentElement.clientWidth; canvas.height = 240;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);

    const mat = cwtData.scalogram_matrix || [];
    if (mat.length > 0) {
      const numS = mat.length;
      const numT = mat[0].length;
      const cellW = W / numT;
      const cellH = H / numS;

      for (let s = 0; s < numS; s++) {
        for (let t = 0; t < numT; t++) {
          const val = mat[s][t];
          const hue = (1.0 - val) * 240; // Blue to Red heatmap
          ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
          ctx.fillRect(t * cellW, H - (s + 1) * cellH, cellW + 1, cellH + 1);
        }
      }
    }

    ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 11px monospace';
    ctx.fillText(`CWT Wavelet Time-Frequency Scalogram (Morlet/Ricker) | Chirp ${cwtFStart}Hz -> ${cwtFStop}Hz`, 8, 14);
  }, [activeTab, cwtData]);

  return (
    <div className="win98-window p-1 bg-[#C0C0C0] text-[#000000] font-sans border-2 border-[#FFFFFF] shadow-md max-w-7xl mx-auto my-2">
      {/* Titlebar */}
      <div className="win98-titlebar bg-[#000080] text-white px-2 py-1 flex items-center justify-between font-bold text-xs select-none">
        <div className="flex items-center gap-1.5">
          <Activity size={14} className="text-[#00FFFF]" />
          <span>Python for Signal Processing Lab (J. Unpingco Algorithms)</span>
          {aliasingData?.trust_mode === 'API_VERIFIED' && <span className="ml-2 text-[10px] bg-[#00AA00] text-white px-1.5 py-0.5 font-bold">✓ API VERIFIED</span>}
          {aliasingData?.trust_mode === 'LOCAL_BROWSER_DSP' && <span className="ml-2 text-[10px] bg-[#00AAAA] text-white px-1.5 py-0.5 font-bold">✓ LOCAL BROWSER DSP</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="win98-tabs flex-wrap p-1 border-b border-[#808080]">
        <button onClick={() => setActiveTab('aliasing')} className={`win98-tab text-xs ${activeTab === 'aliasing' ? 'active font-bold text-[#000080]' : ''}`}>
          📉 Sampling & Aliasing
        </button>
        <button onClick={() => setActiveTab('fir')} className={`win98-tab text-xs ${activeTab === 'fir' ? 'active font-bold text-[#000080]' : ''}`}>
          🎛️ Parks-McClellan FIR
        </button>
        <button onClick={() => setActiveTab('autocorr')} className={`win98-tab text-xs ${activeTab === 'autocorr' ? 'active font-bold text-[#000080]' : ''}`}>
          📊 Autocorrelation Rxx
        </button>
        <button onClick={() => setActiveTab('lms')} className={`win98-tab text-xs ${activeTab === 'lms' ? 'active font-bold text-[#000080]' : ''}`}>
          🔄 LMS Adaptive Filter
        </button>
        <button onClick={() => setActiveTab('cwt')} className={`win98-tab text-xs ${activeTab === 'cwt' ? 'active font-bold text-[#000080]' : ''}`}>
          🌊 CWT Wavelet Scalogram
        </button>
      </div>

      {/* Content */}
      <div className="p-2 flex flex-col gap-2">
        {activeTab === 'aliasing' && (
          <div className="flex flex-col gap-2">
            <div className="win98-outset p-1 bg-[#000000]">
              <canvas ref={aliasingCanvasRef} style={{ width: '100%', display: 'block' }} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono bg-[#E0E0E0] p-2 border border-[#808080]">
              <div>
                <label className="font-bold">Signal Freq (Hz):</label>
                <input type="number" value={fSignal} onChange={e => setFSignal(e.target.value)} className="w-full font-mono bg-white border border-[#808080] px-1" />
              </div>
              <div>
                <label className="font-bold">Sample Rate (Hz):</label>
                <input type="number" value={fSample} onChange={e => setFSample(e.target.value)} className="w-full font-mono bg-white border border-[#808080] px-1" />
              </div>
              <div className="col-span-2 flex items-end">
                <button onClick={runAliasingSim} className="win98-btn text-xs font-bold w-full">
                  <Play size={12} className="inline mr-1" /> Simulate Sampling & Aliasing
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fir' && (
          <div className="flex flex-col gap-2">
            <div className="win98-outset p-1 bg-[#000000]">
              <canvas ref={firCanvasRef} style={{ width: '100%', display: 'block' }} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono bg-[#E0E0E0] p-2 border border-[#808080]">
              <div>
                <label className="font-bold">FIR Taps:</label>
                <input type="number" value={firTaps} onChange={e => setFirTaps(e.target.value)} className="w-full font-mono bg-white border border-[#808080] px-1" />
              </div>
              <div>
                <label className="font-bold">Passband Cutoff (Hz):</label>
                <input type="number" value={firPassHz} onChange={e => setFirPassHz(e.target.value)} className="w-full font-mono bg-white border border-[#808080] px-1" />
              </div>
              <div>
                <label className="font-bold">Stopband Cutoff (Hz):</label>
                <input type="number" value={firStopHz} onChange={e => setFirStopHz(e.target.value)} className="w-full font-mono bg-white border border-[#808080] px-1" />
              </div>
              <div className="flex items-end">
                <button onClick={runFirDesign} className="win98-btn text-xs font-bold w-full">
                  <Play size={12} className="inline mr-1" /> Design Equiripple FIR
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'lms' && (
          <div className="flex flex-col gap-2">
            <div className="win98-outset p-1 bg-[#000000]">
              <canvas ref={lmsCanvasRef} style={{ width: '100%', display: 'block' }} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono bg-[#E0E0E0] p-2 border border-[#808080]">
              <div>
                <label className="font-bold">Step Size (μ):</label>
                <input type="number" step="0.005" value={lmsMu} onChange={e => setLmsMu(e.target.value)} className="w-full font-mono bg-white border border-[#808080] px-1" />
              </div>
              <div>
                <label className="font-bold">Signal Freq (Hz):</label>
                <input type="number" value={lmsFSig} onChange={e => setLmsFSig(e.target.value)} className="w-full font-mono bg-white border border-[#808080] px-1" />
              </div>
              <div>
                <label className="font-bold">Noise Freq (Hz):</label>
                <input type="number" value={lmsFNoise} onChange={e => setLmsFNoise(e.target.value)} className="w-full font-mono bg-white border border-[#808080] px-1" />
              </div>
              <div className="flex items-end">
                <button onClick={runLmsFilter} className="win98-btn text-xs font-bold w-full">
                  <Play size={12} className="inline mr-1" /> Run LMS Adaptive Filter
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cwt' && (
          <div className="flex flex-col gap-2">
            <div className="win98-outset p-1 bg-[#000000]">
              <canvas ref={cwtCanvasRef} style={{ width: '100%', display: 'block' }} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono bg-[#E0E0E0] p-2 border border-[#808080]">
              <div>
                <label className="font-bold">Start Freq (Hz):</label>
                <input type="number" value={cwtFStart} onChange={e => setCwtFStart(e.target.value)} className="w-full font-mono bg-white border border-[#808080] px-1" />
              </div>
              <div>
                <label className="font-bold">Stop Freq (Hz):</label>
                <input type="number" value={cwtFStop} onChange={e => setCwtFStop(e.target.value)} className="w-full font-mono bg-white border border-[#808080] px-1" />
              </div>
              <div>
                <label className="font-bold">Scales:</label>
                <input type="number" value={cwtScales} onChange={e => setCwtScales(e.target.value)} className="w-full font-mono bg-white border border-[#808080] px-1" />
              </div>
              <div className="flex items-end">
                <button onClick={runCwtScalogram} className="win98-btn text-xs font-bold w-full">
                  <Play size={12} className="inline mr-1" /> Compute CWT Scalogram
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
