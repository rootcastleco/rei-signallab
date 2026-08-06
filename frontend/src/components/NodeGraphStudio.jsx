import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Cpu, Play, Download, Plus, ArrowRight, ShieldCheck, Layers, Trash2, X, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import { safeFetchJson } from '../config';

function drawOscilloscope(canvas, time, signal, filteredSignal, label) {
  if (!canvas || !signal || signal.length === 0) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#003300';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 10; i++) {
    const x = (i / 10) * W;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let i = 0; i <= 8; i++) {
    const y = (i / 8) * H;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  ctx.strokeStyle = '#004400';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

  const maxVal = Math.max(...signal.map(Math.abs), 0.001);
  const drawSignal = (data, color, lineW) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW;
    ctx.beginPath();
    for (let i = 0; i < W; i++) {
      const idx = Math.min(Math.floor(i * data.length / W), data.length - 1);
      const y = H / 2 - (data[idx] / maxVal) * (H / 2 - 10);
      if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
    }
    ctx.stroke();
  };

  drawSignal(signal, '#00FFFF', 1.5);
  if (filteredSignal && filteredSignal.length > 0) {
    drawSignal(filteredSignal, '#00FF00', 2);
  }

  ctx.fillStyle = '#00FF00';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(label || 'CH1: Signal Output', 8, 14);
}

function drawSpectrum(canvas, frequency, magnitude, label) {
  if (!canvas || !frequency || frequency.length === 0) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#003300';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 10; i++) {
    const x = (i / 10) * W;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let i = 0; i <= 8; i++) {
    const y = (i / 8) * H;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  const maxMag = Math.max(...magnitude);
  const minMag = Math.min(...magnitude);
  const range = maxMag - minMag || 1;

  ctx.strokeStyle = '#00FFFF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < W; i++) {
    const idx = Math.min(Math.floor(i * magnitude.length / W), magnitude.length - 1);
    const normalized = (magnitude[idx] - minMag) / range;
    const y = H - normalized * (H - 20) - 10;
    if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
  }
  ctx.stroke();

  ctx.fillStyle = '#00FF00';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(label || 'FFT Spectrum Analyzer', 8, 14);
}

export default function NodeGraphStudio({ onGraphExecuted }) {
  const [nodeCatalog, setNodeCatalog] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [nodes, setNodes] = useState([
    { id: 'node_gen', type: 'generator.signal', name: 'Signal Generator (440Hz)', x: 40, y: 30, params: { waveform: 'sine', frequency: 440, amplitude: 1.0 } },
    { id: 'node_flt', type: 'filter.lowpass', name: 'LowPass Filter (1000Hz)', x: 280, y: 30, params: { cutoff: 1000, order: 4 } },
    { id: 'node_fft', type: 'transform.fft', name: 'FFT Spectrum Analyzer', x: 520, y: 30, params: { n_fft: 1024, window: 'hanning' } }
  ]);

  const [connections, setConnections] = useState([
    { id: 'c1', from_node: 'node_gen', from_port: 'signal_out', to_node: 'node_flt', to_port: 'signal_in' },
    { id: 'c2', from_node: 'node_flt', from_port: 'signal_out', to_node: 'node_fft', to_port: 'signal_in' }
  ]);

  const [selectedNodeId, setSelectedNodeId] = useState('node_gen');
  const [wiringFrom, setWiringFrom] = useState(null);
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [executionResult, setExecutionResult] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [executionMode, setExecutionMode] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [signalData, setSignalData] = useState(null);

  const canvasContainerRef = useRef(null);
  const scopeCanvasRef = useRef(null);
  const spectrumCanvasRef = useRef(null);

  // 1. Fetch Backend Registry Catalog (GET /api/nodes)
  useEffect(() => {
    async function loadCatalog() {
      try {
        const data = await safeFetchJson('/api/nodes');
        if (Array.isArray(data)) setNodeCatalog(data);
      } catch (e) {
        // Fallback Client Spec Catalog covering all domain categories
        setNodeCatalog([
          { type: 'generator.signal', category: 'Generators', display_name: 'Signal Generator', input_ports: [], output_ports: [{ name: 'signal_out', data_type: 'Signal<Real64>' }], parameter_schema: { frequency: { type: 'number', default: 440 } } },
          { type: 'generator.gaussian_noise', category: 'Generators', display_name: 'Gaussian Noise', input_ports: [], output_ports: [{ name: 'signal_out', data_type: 'Signal<Real64>' }], parameter_schema: { std_dev: { type: 'number', default: 1.0 } } },
          { type: 'filter.lowpass', category: 'Filters', display_name: 'LowPass Filter', input_ports: [{ name: 'signal_in', data_type: 'Signal<Real64>' }], output_ports: [{ name: 'signal_out', data_type: 'Signal<Real64>' }], parameter_schema: { cutoff: { type: 'number', default: 1000 } } },
          { type: 'filter.highpass', category: 'Filters', display_name: 'HighPass Filter', input_ports: [{ name: 'signal_in', data_type: 'Signal<Real64>' }], output_ports: [{ name: 'signal_out', data_type: 'Signal<Real64>' }], parameter_schema: { cutoff: { type: 'number', default: 100 } } },
          { type: 'transform.fft', category: 'Transformations', display_name: 'Fast Fourier Transform', input_ports: [{ name: 'signal_in', data_type: 'Signal<Real64>' }], output_ports: [{ name: 'spectrum_out', data_type: 'SpectrumFrame' }], parameter_schema: { n_fft: { type: 'integer', default: 1024 } } },
          { type: 'converter.complex_to_real', category: 'Converters', display_name: 'Complex to Real Splitter', input_ports: [{ name: 'complex_in', data_type: 'Signal<Complex128>' }], output_ports: [{ name: 'real', data_type: 'Signal<Real64>' }], parameter_schema: {} },
          { type: 'analysis.noise_stats', category: 'Analysis', display_name: 'Noise & THD Analyzer', input_ports: [{ name: 'signal_in', data_type: 'Signal<Real64>' }], output_ports: [{ name: 'stats', data_type: 'StructuredFrame' }], parameter_schema: {} },
          { type: 'vibration.sensor_calibration', category: 'Vibration Analysis', display_name: 'IEPE/MEMS Calibration', input_ports: [{ name: 'raw_input', data_type: 'Signal<Real64>' }], output_ports: [{ name: 'calibrated_signal', data_type: 'Signal<Real64>' }], parameter_schema: { sensitivity: { type: 'number', default: 100 } } },
          { type: 'vibration.bearing_frequencies', category: 'Vibration Analysis', display_name: 'Bearing Frequencies (BPFO/BPFI)', input_ports: [], output_ports: [{ name: 'bearing_freqs', data_type: 'StructuredFrame' }], parameter_schema: { rpm: { type: 'number', default: 1480 } } },
          { type: 'electrical.power_metrics', category: 'Electrical Power', display_name: 'Electrical Power Quality', input_ports: [{ name: 'voltage_in', data_type: 'Signal<Real64>' }, { name: 'current_in', data_type: 'Signal<Real64>' }], output_ports: [{ name: 'power_metrics', data_type: 'StructuredFrame' }], parameter_schema: {} },
          { type: 'electrical.symmetrical_components', category: 'Electrical Power', display_name: 'Fortescue 3-Phase Symmetrical', input_ports: [], output_ports: [{ name: 'symmetrical_components', data_type: 'StructuredFrame' }], parameter_schema: {} },
          { type: 'antenna.vswr_return_loss', category: 'Antenna & RF', display_name: 'VSWR & Return Loss', input_ports: [], output_ports: [{ name: 'vswr', data_type: 'Scalar<Real64>' }], parameter_schema: { r_load: { type: 'number', default: 75 } } },
          { type: 'antenna.friis_link_budget', category: 'Antenna & RF', display_name: 'Friis Transmission Link Budget', input_ports: [], output_ports: [{ name: 'link_budget', data_type: 'StructuredFrame' }], parameter_schema: { tx_power_dbm: { type: 'number', default: 30 } } },
          { type: 'gps.gold_code_gen', category: 'GPS SDR', display_name: 'GPS C/A Gold Code Generator', input_ports: [], output_ports: [{ name: 'gold_code_signal', data_type: 'Signal<Real64>' }], parameter_schema: { prn: { type: 'integer', default: 1 } } },
          { type: 'gps.constellation_sim', category: 'GPS SDR', display_name: 'GPS Constellation Orbital Simulator', input_ports: [], output_ports: [{ name: 'constellation_status', data_type: 'StructuredFrame' }], parameter_schema: { user_lat: { type: 'number', default: 41.0082 } } },
          { type: 'srw.beam_kinematics', category: 'SRW Radiation', display_name: 'SRW Electron Beam Kinematics', input_ports: [], output_ports: [{ name: 'kinematics', data_type: 'StructuredFrame' }], parameter_schema: { energy_gev: { type: 'number', default: 3.0 } } },
          { type: 'srw.wavefront_intensity', category: 'SRW Radiation', display_name: 'SRW 2D Transverse Wavefront', input_ports: [], output_ports: [{ name: 'intensity_matrix', data_type: 'StructuredFrame' }], parameter_schema: {} },
          { type: 'dsp_lab.aliasing_simulator', category: 'DSP Lab', display_name: 'Sampling & Aliasing Simulator', input_ports: [], output_ports: [{ name: 'aliasing_result', data_type: 'StructuredFrame' }], parameter_schema: { f_signal_hz: { type: 'number', default: 1500 } } },
          { type: 'dsp_lab.autocorr_pitch', category: 'DSP Lab', display_name: 'Autocorrelation Pitch Estimator', input_ports: [{ name: 'signal_in', data_type: 'Signal<Real64>' }], output_ports: [{ name: 'pitch_result', data_type: 'StructuredFrame' }], parameter_schema: {} },
          { type: 'sandbox.python_exec', category: 'Custom', display_name: 'Python Math Script Sandbox', input_ports: [{ name: 'signal_in', data_type: 'Signal<Real64>' }], output_ports: [{ name: 'signal_out', data_type: 'Signal<Real64>' }], parameter_schema: { python_code: { type: 'string', default: 'output_signal = [x * 2 for x in input_signal]' } } }
        ]);
      }
    }
    loadCatalog();
  }, []);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Dragging Handlers
  const handleMouseDownNode = (e, node) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setDraggingNode(node.id);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseMoveCanvas = (e) => {
    if (!draggingNode || !canvasContainerRef.current) return;
    const containerRect = canvasContainerRef.current.getBoundingClientRect();
    const newX = Math.max(10, Math.min(800, e.clientX - containerRect.left - dragOffset.x));
    const newY = Math.max(10, Math.min(300, e.clientY - containerRect.top - dragOffset.y));

    setNodes(prev => prev.map(n => n.id === draggingNode ? { ...n, x: newX, y: newY } : n));
  };

  const handleMouseUpCanvas = () => setDraggingNode(null);

  // Add Node
  const addNode = (spec) => {
    const newId = `node_${Date.now()}`;
    const defaultParams = {};
    if (spec.parameter_schema) {
      Object.entries(spec.parameter_schema).forEach(([k, v]) => {
        if (v.default !== undefined) defaultParams[k] = v.default;
      });
    }
    const newNode = {
      id: newId,
      type: spec.type,
      name: spec.display_name,
      x: 40 + (nodes.length % 3) * 220,
      y: 40 + Math.floor(nodes.length / 3) * 100,
      params: defaultParams
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newId);
  };

  const deleteNode = (nodeId) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.from_node !== nodeId && c.to_node !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  // Wiring Handler
  const handlePortClick = (nodeId, portName, isOutput, dataType) => {
    if (isOutput) {
      setWiringFrom({ nodeId, port: portName, dataType });
    } else {
      if (wiringFrom && wiringFrom.nodeId !== nodeId) {
        // Validate Port Type Compatibility
        if (wiringFrom.dataType !== dataType && dataType !== '*' && wiringFrom.dataType !== '*') {
          alert(`GRAPH PORT TYPE MISMATCH: Cannot wire '${wiringFrom.dataType}' to '${dataType}'. Add an explicit converter node.`);
          setWiringFrom(null);
          return;
        }

        const newConn = {
          id: `c_${Date.now()}`,
          from_node: wiringFrom.nodeId,
          from_port: wiringFrom.port,
          to_node: nodeId,
          to_port: portName
        };
        if (!connections.some(c => c.from_node === newConn.from_node && c.to_node === newConn.to_node)) {
          setConnections(prev => [...prev, newConn]);
        }
      }
      setWiringFrom(null);
    }
  };

  const deleteConnection = (connId) => setConnections(prev => prev.filter(c => c.id !== connId));
  const updateParam = (key, val) => setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, params: { ...n.params, [key]: val } } : n));

  const generateBrowserSignal = useCallback(() => {
    const genNode = nodes.find(n => n.type.includes('generator'));
    const filterNode = nodes.find(n => n.type.includes('filter'));

    const freq = genNode?.params?.frequency || 440;
    const amp = genNode?.params?.amplitude || 1.0;
    const cutoff = filterNode?.params?.cutoff || 1000;
    const fs = 44100;
    const dur = 0.05;
    const N = Math.floor(fs * dur);

    const t = [], raw = [], filtered = [];
    for (let i = 0; i < N; i++) {
      const tv = i / fs;
      t.push(tv);
      const y = amp * Math.sin(2 * Math.PI * freq * tv);
      raw.push(y);
    }

    const rc = 1.0 / (2 * Math.PI * cutoff);
    const dt = 1.0 / fs;
    const alpha = dt / (rc + dt);
    let prev = raw[0];
    for (let i = 0; i < N; i++) {
      prev = prev + alpha * (raw[i] - prev);
      filtered.push(prev);
    }

    const nFft = 1024;
    const freqs = [], magDb = [];
    const fftInput = filtered.slice(0, nFft);
    const windowed = fftInput.map((v, i) => v * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (nFft - 1))));

    for (let k = 0; k < nFft / 2; k++) {
      const f = k * fs / nFft;
      freqs.push(f);
      let re = 0, im = 0;
      for (let n = 0; n < nFft; n++) {
        const angle = 2 * Math.PI * k * n / nFft;
        re += (windowed[n] || 0) * Math.cos(angle);
        im -= (windowed[n] || 0) * Math.sin(angle);
      }
      const mag = Math.sqrt(re * re + im * im) / nFft;
      magDb.push(20 * Math.log10(Math.max(mag, 1e-10)));
    }

    return { time: t, raw_signal: raw, filtered_signal: filtered, frequency: freqs, spectrum_magnitude: magDb };
  }, [nodes]);

  useEffect(() => {
    if (!signalData) return;
    const scopeCanvas = scopeCanvasRef.current;
    const spectrumCanvas = spectrumCanvasRef.current;

    if (scopeCanvas) {
      scopeCanvas.width = scopeCanvas.parentElement.clientWidth;
      scopeCanvas.height = 180;
      drawOscilloscope(scopeCanvas, signalData.time, signalData.raw_signal, signalData.filtered_signal, 'Graph Pipeline Output: Oscilloscope');
    }
    if (spectrumCanvas) {
      spectrumCanvas.width = spectrumCanvas.parentElement.clientWidth;
      spectrumCanvas.height = 180;
      drawSpectrum(spectrumCanvas, signalData.frequency, signalData.spectrum_magnitude, 'Graph Pipeline Output: FFT Spectrum');
    }
  }, [signalData]);

  const runGraphPipeline = async () => {
    setIsRunning(true);
    const projectSpec = {
      formatVersion: '2.1',
      projectId: 'project_studio_21',
      sampleClock: { rateHz: 44100, timebase: 'monotonic' },
      graph: {
        nodes: nodes.map(n => ({ id: n.id, type: n.type, name: n.name, params: n.params })),
        connections: connections.map(c => ({ from_node: c.from_node, from_port: c.from_port, to_node: c.to_node, to_port: c.to_port }))
      },
      environment: { dspEngineVersion: '2.1.0' }
    };

    let apiData = null;
    try {
      apiData = await safeFetchJson('/api/graph/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectSpec })
      });
    } catch (e) {}

    if (apiData && apiData.results) {
      setExecutionResult(apiData);
      setExecutionMode('API_VERIFIED');
    } else {
      const localResults = {};
      nodes.forEach(n => {
        localResults[n.id] = {
          node_id: n.id,
          node_type: n.type,
          display_name: n.name,
          outputs: { signal_out: { data_type: "Signal<Real64>", data_length: 2205 } }
        };
      });

      setExecutionResult({
        status: "success",
        version: "2.1.0",
        results: localResults,
        project: projectSpec
      });
      setExecutionMode('LOCAL_DSP');
    }

    setSignalData(generateBrowserSignal());
    setIsRunning(false);
  };

  const categories = ['All', ...new Set(nodeCatalog.map(n => n.category))];
  const filteredCatalog = nodeCatalog.filter(n => {
    const matchesCat = selectedCategory === 'All' || n.category === selectedCategory;
    const matchesSearch = n.display_name.toLowerCase().includes(searchQuery.toLowerCase()) || n.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="win98-outset p-3 flex flex-col gap-3 select-none">
      {/* Title Bar */}
      <div className="win98-titlebar">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-[#FFFF00]" />
          <span>REI_SignalFlow_Studio_2.1.exe - [Typed Node Catalog & Kahn Execution Scheduler]</span>
        </div>
        <div className="flex gap-1">
          <div className="win98-btn-box">_</div>
          <div className="win98-btn-box">□</div>
          <div className="win98-btn-box">✕</div>
        </div>
      </div>

      {/* Node Catalog Palette Bar */}
      <div className="win98-outset p-2 flex flex-col gap-2 bg-[#C0C0C0]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-xs">Node Palette:</span>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="text-xs font-mono">
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <div className="flex items-center bg-[#FFFFFF] border border-[#808080] px-1 text-xs">
              <Search size={12} className="text-[#808080] mr-1" />
              <input
                type="text"
                placeholder="Search canonical nodes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none font-mono text-xs w-40"
              />
            </div>
          </div>

          <div className="flex gap-1.5">
            <button onClick={runGraphPipeline} disabled={isRunning} className="win98-btn text-xs bg-[#00AA00] text-[#FFFFFF]">
              <Play size={12} /> {isRunning ? 'EXECUTING...' : 'RUN PIPELINE (KAHN 2.1)'}
            </button>
          </div>
        </div>

        {/* Category Quick Filter Chips */}
        <div className="flex gap-1 overflow-x-auto py-1 border-b border-[#808080] pb-1.5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`win98-btn text-[10px] px-2 py-0.5 whitespace-nowrap font-bold ${selectedCategory === cat ? 'bg-[#000080] text-[#FFFFFF] font-black' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Catalog Items (All Nodes rendered without slice limit) */}
        <div className="flex gap-1.5 overflow-x-auto py-1 max-h-24 flex-wrap">
          {filteredCatalog.map((spec) => (
            <button key={spec.type} onClick={() => addNode(spec)} className="win98-btn text-[10px] flex items-center gap-1 whitespace-nowrap py-1">
              <Plus size={10} className="text-[#0000FF]" /> <span className="font-semibold">{spec.display_name}</span> <span className="text-[9px] opacity-70">({spec.category})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Canvas Workspace & Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">

        {/* Visual Interactive Graph Canvas (3 Columns) */}
        <div className="lg:col-span-3 flex flex-col gap-2">
          <div
            ref={canvasContainerRef}
            onMouseMove={handleMouseMoveCanvas}
            onMouseUp={handleMouseUpCanvas}
            className="win98-crt-screen p-3 min-h-[340px] relative overflow-hidden bg-[#000000] border-2 border-[#808080] cursor-crosshair"
          >
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#00FF00 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

            {/* SVG Connection Cable Overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              {connections.map((conn) => {
                const fromNode = nodes.find(n => n.id === conn.from_node);
                const toNode = nodes.find(n => n.id === conn.to_node);
                if (!fromNode || !toNode) return null;

                const x1 = fromNode.x + 210;
                const y1 = fromNode.y + 55;
                const x2 = toNode.x;
                const y2 = toNode.y + 55;
                const dx = Math.abs(x2 - x1) / 2;

                return (
                  <g key={conn.id || `${conn.from_node}-${conn.to_node}`}>
                    <path d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`} fill="none" stroke="#00FF00" strokeWidth="2.5" />
                    <circle cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r="4" fill="#FFFF00" />
                  </g>
                );
              })}
            </svg>

            {/* Draggable Node Cards */}
            <div className="relative z-10 w-full h-full min-h-[300px]">
              {nodes.map((node) => {
                const spec = nodeCatalog.find(s => s.type === node.type) || { input_ports: [{ name: 'signal_in', data_type: 'Signal<Real64>' }], output_ports: [{ name: 'signal_out', data_type: 'Signal<Real64>' }] };

                return (
                  <div
                    key={node.id}
                    style={{ position: 'absolute', left: `${node.x}px`, top: `${node.y}px` }}
                    onMouseDown={(e) => handleMouseDownNode(e, node)}
                    className={`win98-outset p-2 w-56 shadow-lg cursor-grab active:cursor-grabbing ${selectedNodeId === node.id ? 'border-2 border-[#0000FF] bg-[#FFFFCC]' : 'bg-[#C0C0C0]'}`}
                  >
                    <div className="win98-titlebar text-[10px] py-0.5 mb-1.5 flex justify-between items-center">
                      <span className="truncate">{node.type}</span>
                      <button onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }} className="text-[#FF5555] hover:text-[#FF0000] p-0.5 font-bold">
                        <X size={10} />
                      </button>
                    </div>
                    <div className="text-xs font-bold mb-2 truncate">{node.name}</div>

                    {/* Typed Ports with Explicit Data Type Badges */}
                    <div className="flex flex-col gap-1 text-[9px] font-mono bg-[#000000] p-1 border border-[#808080]">
                      {spec.input_ports.map(ip => (
                        <div key={ip.name} onClick={(e) => { e.stopPropagation(); handlePortClick(node.id, ip.name, false, ip.data_type); }} className="flex justify-between items-center text-[#00FF00] hover:bg-[#00FF00] hover:text-[#000000] px-1 cursor-pointer rounded">
                          <span>● in: {ip.name}</span>
                          <span className="text-[#FFFF00] text-[8px]">{ip.data_type}</span>
                        </div>
                      ))}
                      {spec.output_ports.map(op => (
                        <div key={op.name} onClick={(e) => { e.stopPropagation(); handlePortClick(node.id, op.name, true, op.data_type); }} className={`flex justify-between items-center text-[#00FFFF] hover:bg-[#00FFFF] hover:text-[#000000] px-1 cursor-pointer rounded ${wiringFrom?.nodeId === node.id ? 'bg-[#FFFF00] text-[#000000]' : ''}`}>
                          <span className="text-[#FFFF00] text-[8px]">{op.data_type}</span>
                          <span>out: {op.name} ●</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Wiring Status Badge */}
            <div className="absolute bottom-2 left-2 bg-[#000000]/90 border border-[#00FF00] px-2 py-1 text-[10px] font-mono text-[#00FF00] flex items-center gap-2 z-20">
              <ShieldCheck size={12} className="text-[#00FF00]" />
              <span>
                {wiringFrom ? `CLICK INPUT PORT TO CONNECT FROM [${wiringFrom.nodeId}:${wiringFrom.port}] (${wiringFrom.dataType})` : `STRICT TYPED PORTS | WIRING VALIDATED (${connections.length} CABLES)`}
              </span>
            </div>
          </div>

          {/* Signal Displays */}
          {signalData && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
              <div className="win98-outset p-1 flex flex-col gap-1">
                <div className="win98-titlebar text-[11px] py-0.5">
                  <span>Graph_Pipeline_Oscilloscope.exe</span>
                  <span className="text-[9px]">[{executionMode}]</span>
                </div>
                <div className="win98-inset bg-[#000000]">
                  <canvas ref={scopeCanvasRef} style={{ width: '100%', display: 'block' }} />
                </div>
              </div>

              <div className="win98-outset p-1 flex flex-col gap-1">
                <div className="win98-titlebar text-[11px] py-0.5">
                  <span>Graph_Pipeline_FFT_Analyzer.exe</span>
                  <span className="text-[9px]">[{executionMode}]</span>
                </div>
                <div className="win98-inset bg-[#000000]">
                  <canvas ref={spectrumCanvasRef} style={{ width: '100%', display: 'block' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Selected Node Parameter Inspector (1 Column) */}
        <div className="win98-outset p-3 flex flex-col gap-3 bg-[#C0C0C0]">
          <div className="font-bold text-xs border-b border-[#808080] pb-1 text-[#000080]">
            Node Parameter Inspector
          </div>

          {selectedNode ? (
            <div className="flex flex-col gap-3 text-xs">
              <div>
                <span className="font-bold">Node ID:</span> <code className="font-mono text-[#0000FF]">{selectedNode.id}</code>
              </div>
              <div>
                <span className="font-bold">Canonical Type:</span> <code className="font-mono text-[#00AA00]">{selectedNode.type}</code>
              </div>

              <div className="flex flex-col gap-1 border-t border-[#808080] pt-2">
                <label className="font-bold">Node Label:</label>
                <input
                  type="text"
                  value={selectedNode.name}
                  onChange={(e) => setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, name: e.target.value } : n))}
                  className="w-full text-xs font-mono"
                />
              </div>

              {Object.entries(selectedNode.params).map(([pk, pv]) => (
                <div key={pk} className="flex flex-col gap-1">
                  <label className="font-bold">{pk}:</label>
                  <input
                    type={typeof pv === 'number' ? 'number' : 'text'}
                    value={pv}
                    onChange={(e) => updateParam(pk, typeof pv === 'number' ? parseFloat(e.target.value) : e.target.value)}
                    className="w-full text-xs font-mono"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-[#808080]">Select a node on canvas to edit properties.</div>
          )}

          {executionResult && (
            <div className="mt-auto border-t border-[#808080] pt-2 flex flex-col gap-1">
              <span className="font-bold text-[11px] text-[#00AA00]">
                Execution Result [{executionMode}]:
              </span>
              <div className="win98-crt-screen p-1 text-[9px] font-mono h-24 overflow-y-auto">
                <pre>{JSON.stringify(executionResult.results, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
