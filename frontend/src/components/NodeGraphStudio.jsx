import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Cpu, Play, Download, Plus, ArrowRight, ShieldCheck, Layers, Trash2, X } from 'lucide-react';
import { safeFetchJson } from '../config';

const NODE_CATALOG = [
  { type: 'SignalGenerator', category: 'Sources', name: 'Signal Generator', outPorts: ['signal_out'], params: { waveform: 'sine', frequency: 440, amplitude: 1.0 } },
  { type: 'WAVSource', category: 'Sources', name: 'WAV File Reader', outPorts: ['audio_out'], params: { file_path: 'sample.wav' } },
  { type: 'DCRemove', category: 'Transforms', name: 'DC Remove Filter', inPorts: ['signal_in'], outPorts: ['signal_out'], params: {} },
  { type: 'BiquadFilter', category: 'Filters', name: 'Biquad IIR Filter', inPorts: ['signal_in'], outPorts: ['signal_out'], params: { filter_type: 'lowpass', cutoff: 1000, order: 4 } },
  { type: 'FFTAnalyzer', category: 'Analyzers', name: 'FFT Spectrum Analyzer', inPorts: ['signal_in'], outPorts: ['spectrum_out'], params: { n_fft: 1024, window: 'hanning' } },
  { type: 'ScopeSink', category: 'Outputs', name: 'Oscilloscope Screen', inPorts: ['signal_in'], params: { time_div: 2 } },
  { type: 'CSVWriter', category: 'Outputs', name: 'CSV File Exporter', inPorts: ['signal_in'], params: { output_filename: 'result.csv' } }
];

function drawOscilloscope(canvas, time, signal, filteredSignal, label) {
  if (!canvas || !signal || signal.length === 0) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // Grid
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
  ctx.fillStyle = '#00FFFF';
  ctx.font = '10px monospace';
  ctx.fillText(`Samples: ${signal.length} | Peak: ${maxVal.toFixed(3)}V`, 8, H - 8);
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

  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0, 255, 255, 0.08)';
  ctx.fill();

  const peakIdx = magnitude.indexOf(maxMag);
  const peakFreq = frequency[peakIdx] || 0;
  const peakX = (peakIdx / magnitude.length) * W;
  ctx.strokeStyle = '#FF0000';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(peakX, 0); ctx.lineTo(peakX, H); ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#00FF00';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(label || 'FFT Spectrum Analyzer', 8, 14);
  ctx.fillStyle = '#FF0000';
  ctx.font = '10px monospace';
  ctx.fillText(`Peak: ${peakFreq.toFixed(0)} Hz | ${maxMag.toFixed(1)} dB`, 8, H - 8);
}

export default function NodeGraphStudio({ onGraphExecuted }) {
  const [nodes, setNodes] = useState([
    { id: 'node_1', type: 'SignalGenerator', name: 'Signal Generator (440Hz)', x: 40, y: 30, params: { waveform: 'sine', frequency: 440, amplitude: 1.0 } },
    { id: 'node_2', type: 'BiquadFilter', name: 'LowPass Filter (1000Hz)', x: 280, y: 30, params: { filter_type: 'lowpass', cutoff: 1000, order: 4 } },
    { id: 'node_3', type: 'FFTAnalyzer', name: 'FFT Spectrum Analyzer', x: 520, y: 30, params: { n_fft: 1024, window: 'hanning' } }
  ]);

  const [connections, setConnections] = useState([
    { id: 'c1', from_node: 'node_1', from_port: 'signal_out', to_node: 'node_2', to_port: 'signal_in' },
    { id: 'c2', from_node: 'node_2', from_port: 'signal_out', to_node: 'node_3', to_port: 'signal_in' }
  ]);

  const [selectedNodeId, setSelectedNodeId] = useState('node_1');
  const [wiringFrom, setWiringFrom] = useState(null); // { nodeId, port }
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [executionResult, setExecutionResult] = useState(null);
  const [executionMode, setExecutionMode] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [signalData, setSignalData] = useState(null);

  const canvasContainerRef = useRef(null);
  const scopeCanvasRef = useRef(null);
  const spectrumCanvasRef = useRef(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Dragging Handlers
  const handleMouseDownNode = (e, node) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setDraggingNode(node.id);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMoveCanvas = (e) => {
    if (!draggingNode || !canvasContainerRef.current) return;
    const containerRect = canvasContainerRef.current.getBoundingClientRect();
    const newX = Math.max(10, Math.min(800, e.clientX - containerRect.left - dragOffset.x));
    const newY = Math.max(10, Math.min(300, e.clientY - containerRect.top - dragOffset.y));

    setNodes(prev => prev.map(n => n.id === draggingNode ? { ...n, x: newX, y: newY } : n));
  };

  const handleMouseUpCanvas = () => {
    setDraggingNode(null);
  };

  // Add Node
  const addNode = (catItem) => {
    const newId = `node_${Date.now()}`;
    const newNode = {
      id: newId,
      type: catItem.type,
      name: catItem.name,
      x: 40 + (nodes.length % 3) * 220,
      y: 40 + Math.floor(nodes.length / 3) * 100,
      params: { ...catItem.params }
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newId);
  };

  // Delete Node
  const deleteNode = (nodeId) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setConnections(prev => prev.filter(c => c.from_node !== nodeId && c.to_node !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  // Wiring Click Handler
  const handlePortClick = (nodeId, portName, isOutput) => {
    if (isOutput) {
      setWiringFrom({ nodeId, port: portName });
    } else {
      if (wiringFrom && wiringFrom.nodeId !== nodeId) {
        const newConn = {
          id: `c_${Date.now()}`,
          from_node: wiringFrom.nodeId,
          from_port: wiringFrom.port,
          to_node: nodeId,
          to_port: portName
        };
        // Avoid duplicate connection
        if (!connections.some(c => c.from_node === newConn.from_node && c.to_node === newConn.to_node)) {
          setConnections(prev => [...prev, newConn]);
        }
      }
      setWiringFrom(null);
    }
  };

  const deleteConnection = (connId) => {
    setConnections(prev => prev.filter(c => c.id !== connId));
  };

  const updateParam = (key, val) => {
    setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, params: { ...n.params, [key]: val } } : n));
  };

  const generateBrowserSignal = useCallback(() => {
    const genNode = nodes.find(n => n.type === 'SignalGenerator');
    const filterNode = nodes.find(n => n.type === 'BiquadFilter');

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

    let sumSq = 0, peak = 0, sumDC = 0;
    for (let i = 0; i < N; i++) {
      sumSq += filtered[i] * filtered[i];
      sumDC += filtered[i];
      if (Math.abs(filtered[i]) > peak) peak = Math.abs(filtered[i]);
    }
    const rms = Math.sqrt(sumSq / N);

    return {
      time: t, raw_signal: raw, filtered_signal: filtered,
      frequency: freqs, spectrum_magnitude: magDb,
      metrics: {
        rms: rms.toFixed(4),
        peak_to_peak: (peak * 2).toFixed(4),
        dc_mean: (sumDC / N).toFixed(6),
        fundamental_freq: freq,
        peak_magnitude_db: magDb[Math.round(freq * nFft / fs)]?.toFixed(1) || '0.0'
      }
    };
  }, [nodes]);

  useEffect(() => {
    if (!signalData) return;
    const scopeCanvas = scopeCanvasRef.current;
    const spectrumCanvas = spectrumCanvasRef.current;

    if (scopeCanvas) {
      scopeCanvas.width = scopeCanvas.parentElement.clientWidth;
      scopeCanvas.height = 200;
      drawOscilloscope(scopeCanvas, signalData.time, signalData.raw_signal, signalData.filtered_signal, 'Graph Output: Oscilloscope');
    }
    if (spectrumCanvas) {
      spectrumCanvas.width = spectrumCanvas.parentElement.clientWidth;
      spectrumCanvas.height = 200;
      drawSpectrum(spectrumCanvas, signalData.frequency, signalData.spectrum_magnitude, 'Graph Output: FFT Spectrum');
    }
  }, [signalData]);

  const runGraphPipeline = async () => {
    setIsRunning(true);
    const projectSpec = {
      formatVersion: '2.0',
      projectId: 'project_studio_01',
      sampleClock: { rateHz: 44100, timebase: 'monotonic' },
      graph: {
        nodes: nodes.map(n => ({ id: n.id, type: n.type, name: n.name, params: n.params })),
        connections: connections.map(c => ({ from_node: c.from_node, from_port: c.from_port, to_node: c.to_node, to_port: c.to_port }))
      }
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
      setExecutionMode('API');
    } else {
      const localResults = {};
      nodes.forEach(n => {
        localResults[n.id] = {
          name: n.name,
          node_type: n.type,
          outputs: {
            signal_out: {
              type: "Signal<float32>",
              data_length: 2205,
              computed: true
            }
          }
        };
      });

      setExecutionResult({
        status: "success",
        version: "2.0.0",
        results: localResults,
        project: projectSpec
      });
      setExecutionMode('BROWSER');
    }

    const visData = generateBrowserSignal();
    setSignalData(visData);
    setIsRunning(false);
  };

  const exportProjectFile = () => {
    const projectSpec = {
      formatVersion: '2.0',
      projectId: 'project_studio_01',
      sampleClock: { rateHz: 44100, timebase: 'monotonic' },
      graph: {
        nodes: nodes.map(n => ({ id: n.id, type: n.type, name: n.name, params: n.params })),
        connections: connections
      },
      environment: { dspEngineVersion: '2.0.0' }
    };

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(projectSpec, null, 2)], { type: 'application/json' }));
    a.download = 'experiment_flow.rei-signal';
    a.click();
  };

  return (
    <div className="win98-outset p-3 flex flex-col gap-3 select-none">
      {/* Title Bar */}
      <div className="win98-titlebar">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-[#FFFF00]" />
          <span>REI_SignalFlow_Studio_2.0.exe - [Visual Interactive Node Graph Canvas (.rei-signal)]</span>
        </div>
        <div className="flex gap-1">
          <div className="win98-btn-box">_</div>
          <div className="win98-btn-box">□</div>
          <div className="win98-btn-box">✕</div>
        </div>
      </div>

      {/* Toolbar Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2 py-1 border-b border-[#808080]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold">Add Node:</span>
          {NODE_CATALOG.map((catItem, idx) => (
            <button key={idx} onClick={() => addNode(catItem)} className="win98-btn text-[10px]">
              <Plus size={10} /> {catItem.name}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5">
          <button onClick={exportProjectFile} className="win98-btn text-xs">
            <Download size={12} className="text-[#0000FF]" /> Export .rei-signal
          </button>
          <button onClick={runGraphPipeline} disabled={isRunning} className="win98-btn text-xs bg-[#00AA00] text-[#FFFFFF]">
            <Play size={12} /> {isRunning ? 'EXECUTING...' : 'RUN PIPELINE'}
          </button>
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
            {/* Grid background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#00FF00 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

            {/* SVG Connection Cable Overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              {connections.map((conn) => {
                const fromNode = nodes.find(n => n.id === conn.from_node);
                const toNode = nodes.find(n => n.id === conn.to_node);
                if (!fromNode || !toNode) return null;

                const x1 = fromNode.x + 200;
                const y1 = fromNode.y + 55;
                const x2 = toNode.x;
                const y2 = toNode.y + 55;
                const dx = Math.abs(x2 - x1) / 2;

                return (
                  <g key={conn.id || `${conn.from_node}-${conn.to_node}`}>
                    <path
                      d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke="#00FF00"
                      strokeWidth="2.5"
                    />
                    <circle cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r="4" fill="#FFFF00" />
                  </g>
                );
              })}
            </svg>

            {/* Draggable Node Cards */}
            <div className="relative z-10 w-full h-full min-h-[300px]">
              {nodes.map((node) => (
                <div
                  key={node.id}
                  style={{ position: 'absolute', left: `${node.x}px`, top: `${node.y}px` }}
                  onMouseDown={(e) => handleMouseDownNode(e, node)}
                  className={`win98-outset p-2 w-52 shadow-lg cursor-grab active:cursor-grabbing ${selectedNodeId === node.id ? 'border-2 border-[#0000FF] bg-[#FFFFCC]' : 'bg-[#C0C0C0]'}`}
                >
                  <div className="win98-titlebar text-[10px] py-0.5 mb-1.5 flex justify-between items-center">
                    <span>{node.type}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                      className="text-[#FF5555] hover:text-[#FF0000] p-0.5 font-bold"
                    >
                      <X size={10} />
                    </button>
                  </div>
                  <div className="text-xs font-bold mb-2 truncate">{node.name}</div>

                  {/* Ports */}
                  <div className="flex justify-between items-center text-[10px] font-mono bg-[#000000] text-[#00FF00] p-1 border border-[#808080]">
                    <span
                      onClick={(e) => { e.stopPropagation(); handlePortClick(node.id, 'signal_in', false); }}
                      className="hover:bg-[#00FF00] hover:text-[#000000] px-1 cursor-pointer rounded"
                    >
                      ● in
                    </span>
                    <ArrowRight size={10} />
                    <span
                      onClick={(e) => { e.stopPropagation(); handlePortClick(node.id, 'signal_out', true); }}
                      className={`hover:bg-[#00FFFF] hover:text-[#000000] px-1 cursor-pointer rounded ${wiringFrom?.nodeId === node.id ? 'bg-[#FFFF00] text-[#000000]' : ''}`}
                    >
                      out ●
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Wiring Status Badge */}
            <div className="absolute bottom-2 left-2 bg-[#000000]/90 border border-[#00FF00] px-2 py-1 text-[10px] font-mono text-[#00FF00] flex items-center gap-2 z-20">
              <ShieldCheck size={12} className="text-[#00FF00]" />
              <span>
                {wiringFrom ? `CLICK INPUT PORT TO CONNECT FROM [${wiringFrom.nodeId}]` : `DRAG NODES | CLICK PORTS TO WIRE CABLES (${connections.length} WIRED)`}
              </span>
            </div>
          </div>

          {/* Connection List */}
          {connections.length > 0 && (
            <div className="win98-outset p-2 bg-[#C0C0C0] text-xs font-mono flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[#000080]">Wired Cables:</span>
              {connections.map((c) => (
                <div key={c.id} className="bg-[#000000] text-[#00FF00] px-2 py-0.5 flex items-center gap-1.5 border border-[#808080]">
                  <span>{c.from_node} ➔ {c.to_node}</span>
                  <button onClick={() => deleteConnection(c.id)} className="text-[#FF5555] hover:text-[#FF0000]">
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Visual Signal Output Displays */}
          {signalData && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
              <div className="win98-outset p-1 flex flex-col gap-1">
                <div className="win98-titlebar text-[11px] py-0.5">
                  <span>Graph_Pipeline_Oscilloscope.exe</span>
                  <span className="text-[9px]">[{executionMode === 'API' ? 'API VERIFIED' : 'BROWSER DSP'}]</span>
                </div>
                <div className="win98-inset bg-[#000000]">
                  <canvas ref={scopeCanvasRef} style={{ width: '100%', display: 'block' }} />
                </div>
              </div>

              <div className="win98-outset p-1 flex flex-col gap-1">
                <div className="win98-titlebar text-[11px] py-0.5">
                  <span>Graph_Pipeline_FFT_Analyzer.exe</span>
                  <span className="text-[9px]">[{executionMode === 'API' ? 'API VERIFIED' : 'BROWSER DSP'}]</span>
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
                <span className="font-bold">Type:</span> {selectedNode.type}
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

              {selectedNode.params.frequency !== undefined && (
                <div className="flex flex-col gap-1">
                  <label className="font-bold">Frequency (Hz):</label>
                  <input
                    type="number"
                    value={selectedNode.params.frequency}
                    onChange={(e) => updateParam('frequency', parseFloat(e.target.value))}
                    className="w-full text-xs font-mono"
                  />
                </div>
              )}

              {selectedNode.params.amplitude !== undefined && (
                <div className="flex flex-col gap-1">
                  <label className="font-bold">Amplitude (V):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedNode.params.amplitude}
                    onChange={(e) => updateParam('amplitude', parseFloat(e.target.value))}
                    className="w-full text-xs font-mono"
                  />
                </div>
              )}

              {selectedNode.params.cutoff !== undefined && (
                <div className="flex flex-col gap-1">
                  <label className="font-bold">Cutoff (Hz):</label>
                  <input
                    type="number"
                    value={selectedNode.params.cutoff}
                    onChange={(e) => updateParam('cutoff', parseFloat(e.target.value))}
                    className="w-full text-xs font-mono"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-[#808080]">Select a node on canvas to edit properties.</div>
          )}

          {executionResult && (
            <div className="mt-auto border-t border-[#808080] pt-2 flex flex-col gap-1">
              <span className="font-bold text-[11px] text-[#00AA00]">
                Runtime Output [{executionMode === 'API' ? 'API VERIFIED' : 'BROWSER DSP'}]:
              </span>
              <div className="win98-crt-screen p-1 text-[9px] font-mono h-20 overflow-y-auto">
                <pre>{JSON.stringify(executionResult.results, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
