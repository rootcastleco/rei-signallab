import pytest
from app.graph.registry import NodeRegistry
from app.nodes.factory import NodeFactory
from app.graph.engine import GraphExecutionEngine

def test_all_registered_nodes_can_be_instantiated():
    nodes = NodeRegistry.list_all()
    assert len(nodes) >= 40

    for spec in nodes:
        runtime = NodeFactory.create(spec.type, f"test_{spec.type}", spec.display_name, {})
        assert runtime is not None
        assert runtime.spec.type == spec.type

def test_canonical_node_graph_execution():
    # Build a project containing multiple domain nodes
    project = {
        "metadata": {"title": "Canonical Node Test Project", "version": "2.1.0"},
        "graph": {
            "nodes": [
                {"id": "node_gen", "type": "generator.signal", "params": {"waveform": "sine", "frequency": 440.0}},
                {"id": "node_lp", "type": "filter.lowpass", "params": {"cutoff": 1000.0}},
                {"id": "node_rms", "type": "meter.rms", "params": {}},
                {"id": "node_fft", "type": "transform.fft", "params": {"n_fft": 512}},
                {"id": "node_elec", "type": "electrical.power_metrics", "params": {}},
                {"id": "node_ant", "type": "antenna.vswr_return_loss", "params": {"r_load": 75.0}},
                {"id": "node_gps", "type": "gps.gold_code_gen", "params": {"prn": 1}},
                {"id": "node_srw", "type": "srw.beam_kinematics", "params": {"energy_gev": 3.0}},
                {"id": "node_lab", "type": "dsp_lab.aliasing_simulator", "params": {"f_signal_hz": 1500.0, "f_sample_hz": 2000.0}}
            ],
            "connections": [
                {"from_node": "node_gen", "from_port": "signal_out", "to_node": "node_lp", "to_port": "signal_in"},
                {"from_node": "node_lp", "from_port": "signal_out", "to_node": "node_rms", "to_port": "signal_in"},
                {"from_node": "node_lp", "from_port": "signal_out", "to_node": "node_fft", "to_port": "signal_in"}
            ]
        }
    }

    engine = GraphExecutionEngine()
    exec_res = engine.execute_project(project)

    assert exec_res.get("status") == "success"
    assert "results" in exec_res
    results = exec_res["results"]
    assert "node_gen" in results
    assert "node_lp" in results
    assert "node_rms" in results
    assert "node_fft" in results
    assert "node_elec" in results
    assert "node_ant" in results
    assert "node_gps" in results
    assert "node_srw" in results
    assert "node_lab" in results
