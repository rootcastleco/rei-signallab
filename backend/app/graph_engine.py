import numpy as np
from typing import Dict, List, Any, Optional, Set
import uuid
from collections import defaultdict, deque

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
        self.in_port_types: Dict[str, str] = {}
        self.out_port_types: Dict[str, str] = {}

    def process(self):
        pass

class SignalGeneratorNode(GraphNode):
    def __init__(self, node_id: str, name: str = "Signal Generator", params: Optional[Dict[str, Any]] = None):
        super().__init__(node_id, "SignalGenerator", name, params)
        self.out_port_types["signal_out"] = PortType.SIGNAL_FLOAT32

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
        self.in_port_types["signal_in"] = PortType.SIGNAL_FLOAT32
        self.out_port_types["signal_out"] = PortType.SIGNAL_FLOAT32

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
        self.in_port_types["signal_in"] = PortType.SIGNAL_FLOAT32
        self.out_port_types["spectrum_out"] = PortType.SPECTRUM_FRAME

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
    Instrument-Grade Typed Signal Flow Graph Engine for .rei-signal Projects.
    Validates port compatibility, detects cycles, and executes via Kahn's Topological Sort.
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
        fn = self.nodes.get(from_node_id)
        tn = self.nodes.get(to_node_id)
        if not fn or not tn:
            raise ValueError(f"Connection error: Node '{from_node_id}' or '{to_node_id}' not found.")

        # Port Compatibility Check
        out_type = fn.out_port_types.get(from_port, PortType.SIGNAL_FLOAT32)
        in_type = tn.in_port_types.get(to_port, PortType.SIGNAL_FLOAT32)

        if out_type != in_type and in_type != "*":
            raise ValueError(f"Port Type Mismatch: Cannot connect output port '{from_port}' ({out_type}) to input port '{to_port}' ({in_type}).")

        self.connections.append({
            "from_node": from_node_id,
            "from_port": from_port,
            "to_node": to_node_id,
            "to_port": to_port
        })

    def topological_sort(self) -> List[str]:
        """
        Kahn's Algorithm for Topological Sorting & Cycle Detection.
        """
        in_degree = {nid: 0 for nid in self.nodes}
        adj = defaultdict(list)

        for conn in self.connections:
            u = conn["from_node"]
            v = conn["to_node"]
            adj[u].append(v)
            in_degree[v] += 1

        queue = deque([nid for nid, deg in in_degree.items() if deg == 0])
        order = []

        while queue:
            curr = queue.popleft()
            order.append(curr)
            for neighbor in adj[curr]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(order) != len(self.nodes):
            raise ValueError("Cycle detected in signal flow graph topology. Execution aborted.")

        return order

    def run_graph(self) -> Dict[str, Any]:
        # 1. Topological Sorting & Cycle Check
        execution_order = self.topological_sort()

        # 2. Execute nodes in topological order
        for nid in execution_order:
            node = self.nodes[nid]

            # Collect incoming data
            for conn in self.connections:
                if conn["to_node"] == nid:
                    fn = self.nodes[conn["from_node"]]
                    out_val = fn.outputs.get(conn["from_port"])
                    if out_val:
                        node.inputs[conn["to_port"]] = out_val

            node.process()

        results = {}
        for nid in execution_order:
            n = self.nodes[nid]
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
