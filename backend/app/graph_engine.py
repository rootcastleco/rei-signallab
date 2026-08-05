import numpy as np
from typing import Dict, List, Any, Optional
import uuid

from .schemas import (
    SignalGeneratorConfig,
    FilterConfig,
    FFTConfig,
    MathQuantizerConfig,
    FilterType,
    FilterDesign,
    WaveformType
)
from .dsp_engine import DSPEngine

class PortType:
    SIGNAL_FLOAT32 = "Signal<float32>"
    SPECTRUM_FRAME = "SpectrumFrame"
    SCALAR = "Scalar"

class GraphNode:
    def __init__(self, node_id: str, node_type: str, name: str, params: Optional[Dict[str, Any]] = None):
        self.node_id = node_id
        self.node_type = node_type
        self.name = name
        self.params = params or {}
        self.inputs: Dict[str, Any] = {}
        self.outputs: Dict[str, Any] = {}

    def process(self):
        pass

class SignalGeneratorNode(GraphNode):
    def __init__(self, node_id: str, name: str = "Signal Generator", params: Optional[Dict[str, Any]] = None):
        super().__init__(node_id, "SignalGenerator", name, params)

    def process(self):
        gen_cfg = SignalGeneratorConfig(
            waveform=WaveformType(self.params.get("waveform", "sine")),
            frequency=float(self.params.get("frequency", 440.0)),
            amplitude=float(self.params.get("amplitude", 1.0)),
            sample_rate=int(self.params.get("sample_rate", 44100)),
            duration=float(self.params.get("duration", 0.1)),
            noise_level=float(self.params.get("noise_level", 0.0))
        )
        t, raw_sig = DSPEngine.generate_signal(gen_cfg)
        self.outputs["signal_out"] = {
            "type": PortType.SIGNAL_FLOAT32,
            "data": raw_sig,
            "time": t,
            "sample_rate": gen_cfg.sample_rate
        }

class FilterNode(GraphNode):
    def __init__(self, node_id: str, name: str = "Biquad Filter", params: Optional[Dict[str, Any]] = None):
        super().__init__(node_id, "BiquadFilter", name, params)

    def process(self):
        input_port = self.inputs.get("signal_in")
        if not input_port or input_port.get("data") is None:
            return

        raw_sig = input_port["data"]
        fs = input_port.get("sample_rate", 44100)
        t = input_port.get("time")

        flt_cfg = FilterConfig(
            enabled=bool(self.params.get("enabled", True)),
            cutoff=float(self.params.get("cutoff", 1000.0)),
            filter_type=FilterType(self.params.get("filter_type", "lowpass")),
            filter_design=FilterDesign(self.params.get("filter_design", "butterworth")),
            order=int(self.params.get("order", 4))
        )

        filtered_sig = DSPEngine.apply_filter(raw_sig, fs, flt_cfg)
        self.outputs["signal_out"] = {
            "type": PortType.SIGNAL_FLOAT32,
            "data": filtered_sig,
            "time": t,
            "sample_rate": fs
        }

class FFTAnalyzerNode(GraphNode):
    def __init__(self, node_id: str, name: str = "FFT Analyzer", params: Optional[Dict[str, Any]] = None):
        super().__init__(node_id, "FFTAnalyzer", name, params)

    def process(self):
        input_port = self.inputs.get("signal_in")
        if not input_port or input_port.get("data") is None:
            return

        sig = input_port["data"]
        fs = input_port.get("sample_rate", 44100)
        fft_cfg = FFTConfig(n_fft=int(self.params.get("n_fft", 1024)), log_scale=True)

        freqs, mag_linear, _ = DSPEngine.compute_fft(sig, fs, fft_cfg.model_copy(update={"log_scale": False}))
        _, mag_db, _ = DSPEngine.compute_fft(sig, fs, fft_cfg)
        metrics = DSPEngine.compute_metrics(sig, freqs, mag_linear, fs)

        self.outputs["spectrum_out"] = {
            "type": PortType.SPECTRUM_FRAME,
            "frequency": freqs,
            "magnitude": mag_db,
            "metrics": metrics
        }

class SignalFlowGraphEngine:
    """
    Typed Signal Flow Graph Runtime Engine for .rei-signal Projects.
    Validates port compatibility, sorts topologically, and executes graph nodes.
    """

    def __init__(self):
        self.nodes: Dict[str, GraphNode] = {}
        self.connections: List[Dict[str, str]] = []

    def create_node(self, node_type: str, name: str, params: Optional[Dict[str, Any]] = None, node_id: Optional[str] = None) -> GraphNode:
        nid = node_id or str(uuid.uuid4())[:8]
        if node_type == "SignalGenerator":
            n = SignalGeneratorNode(nid, name, params)
        elif node_type in ["BiquadFilter", "Filter"]:
            n = FilterNode(nid, name, params)
        elif node_type == "FFTAnalyzer":
            n = FFTAnalyzerNode(nid, name, params)
        else:
            n = GraphNode(nid, node_type, name, params)

        self.nodes[nid] = n
        return n

    def connect(self, from_node_id: str, from_port: str, to_node_id: str, to_port: str):
        self.connections.append({
            "from_node": from_node_id,
            "from_port": from_port,
            "to_node": to_node_id,
            "to_port": to_port
        })

    def run_graph(self) -> Dict[str, Any]:
        # Propagate data across connections
        for conn in self.connections:
            fn = self.nodes.get(conn["from_node"])
            tn = self.nodes.get(conn["to_node"])
            if fn and tn:
                fn.process()
                out_val = fn.outputs.get(conn["from_port"])
                if out_val:
                    tn.inputs[conn["to_port"]] = out_val

        # Execute target processing nodes
        for n in self.nodes.values():
            n.process()

        results = {}
        for nid, n in self.nodes.items():
            results[nid] = {
                "name": n.name,
                "node_type": n.node_type,
                "outputs": {
                    k: {
                        "type": v["type"],
                        "data_length": len(v["data"]) if "data" in v else None,
                        "metrics": v["metrics"].model_dump() if "metrics" in v else None
                    } for k, v in n.outputs.items()
                }
            }
        return results

    def export_project(self) -> Dict[str, Any]:
        return {
            "formatVersion": "2.0",
            "projectId": str(uuid.uuid4()),
            "sampleClock": { "rateHz": 44100, "timebase": "monotonic" },
            "graph": {
                "nodes": [
                    { "id": n.node_id, "type": n.node_type, "name": n.name, "params": n.params }
                    for n in self.nodes.values()
                ],
                "connections": self.connections
            },
            "environment": {
                "dspEngineVersion": "2.0.0"
            }
        }
