"""
Security golden suite.

Covers the three hardening boundaries introduced in the Phase 1 pass:
sandbox escape rejection, graph resource limits, rate limiting, and request
schema validation on the vibration calculators.
"""

import pathlib
import re

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.python_engine import PythonDSPEngine
from app.ratelimit import FixedWindowRateLimiter, limiter
from app.sandbox.guard import SandboxPolicyError, validate_script

client = TestClient(app)

MAX_CODE_BYTES = 100000


@pytest.fixture(autouse=True)
def _clear_rate_limiter():
    """Each test starts with a clean per-caller budget."""
    limiter.reset()
    yield
    limiter.reset()


# ---------------------------------------------------------------------------
# Sandbox AST guard
# ---------------------------------------------------------------------------

#: Every one of these defeats a substring blacklist of the form
#: ``'import os' in code``. They must all be rejected statically.
ESCAPE_ATTEMPTS = [
    pytest.param("import os", id="plain_import"),
    pytest.param("import  os", id="double_space_import"),
    pytest.param("from os import path", id="from_import"),
    pytest.param("import os.path as p", id="dotted_import_alias"),
    pytest.param("__import__('os')", id="dunder_import_call"),
    pytest.param("__import__('o' + 's').system('id')", id="concatenated_module_name"),
    pytest.param("__import__('importlib').import_module('os')", id="importlib_indirection"),
    pytest.param("import subprocess", id="subprocess"),
    pytest.param("import socket", id="socket"),
    pytest.param("import sys", id="sys"),
    pytest.param("import shutil", id="shutil"),
    pytest.param("import ctypes", id="ctypes"),
    pytest.param("import builtins", id="builtins"),
    pytest.param("().__class__.__base__.__subclasses__()", id="subclasses_traversal"),
    pytest.param("[].__class__.__mro__[1].__subclasses__()", id="mro_traversal"),
    pytest.param("(lambda: 0).__globals__['__builtins__']", id="function_globals"),
    pytest.param("getattr(object, '__sub' + 'classes__')()", id="getattr_reflection"),
    pytest.param("eval('1+1')", id="eval"),
    pytest.param("exec('x = 1')", id="exec"),
    pytest.param("compile('x=1', '<s>', 'exec')", id="compile"),
    pytest.param("open('/etc/passwd').read()", id="open_file"),
    pytest.param("globals()", id="globals"),
    pytest.param("locals()", id="locals"),
    pytest.param("vars(object)", id="vars"),
    pytest.param("__builtins__['eval']('1')", id="builtins_dict_access"),
    pytest.param("__builtins__ = {'eval': None}", id="builtins_rebind"),
    pytest.param("def __reduce__(self): pass", id="dunder_function_def"),
    pytest.param("class Evil:\n    def __reduce__(self):\n        pass", id="dunder_method_def"),
]


@pytest.mark.parametrize("script", ESCAPE_ATTEMPTS)
def test_sandbox_guard_rejects_escape_attempt(script):
    with pytest.raises(SandboxPolicyError):
        validate_script(script, max_bytes=MAX_CODE_BYTES)


@pytest.mark.parametrize(
    "script",
    [
        "import numpy as np\nraw_signal = np.sin(np.arange(16))",
        "from scipy import signal\nb, a = signal.butter(4, 0.2)",
        "import math\nprint(math.pi)",
        "t = [i * 0.01 for i in range(100)]",
        "import matplotlib.pyplot as pyplot",
    ],
)
def test_sandbox_guard_accepts_legitimate_dsp_script(script):
    assert validate_script(script, max_bytes=MAX_CODE_BYTES) is not None


def test_shipped_ui_presets_satisfy_sandbox_policy():
    """
    The example scripts offered in the Python Lab must pass the guard, or the
    feature ships broken out of the box.
    """
    editor = (
        pathlib.Path(__file__).resolve().parents[2]
        / "frontend" / "src" / "components" / "PythonLabEditor.jsx"
    )
    if not editor.exists():
        pytest.skip("frontend sources not present in this checkout")

    source = editor.read_text(encoding="utf-8")
    scripts = [
        block.replace("\\n", "\n").replace("\\'", "'")
        for block in re.findall(r"code: `(.*?)`\s*\n\s*\}", source, re.S)
        + re.findall(r"setCode\('(.*?)'\)", source, re.S)
    ]

    assert scripts, "no preset scripts found in PythonLabEditor.jsx"
    for index, script in enumerate(scripts):
        validate_script(script, max_bytes=MAX_CODE_BYTES)  # raises on violation


def test_sandbox_guard_rejects_oversized_script():
    with pytest.raises(SandboxPolicyError, match="exceeds the sandbox limit"):
        validate_script("x = 1\n" * 1000, max_bytes=64)


def test_sandbox_guard_rejects_syntax_error():
    with pytest.raises(SandboxPolicyError, match="syntax error"):
        validate_script("def broken(:", max_bytes=MAX_CODE_BYTES)


# ---------------------------------------------------------------------------
# Sandbox execution boundary
# ---------------------------------------------------------------------------

def test_sandbox_engine_blocks_escape_without_execution(monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_PYTHON_SANDBOX", True)
    result = PythonDSPEngine.execute_script("__import__('os').system('echo pwned')")

    assert result["status"] == "error"
    assert "Security Violation" in result["logs"][0]


def test_sandbox_engine_refuses_when_disabled(monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_PYTHON_SANDBOX", False)
    result = PythonDSPEngine.execute_script("raw_signal = [0.0]")

    assert result["status"] == "error"
    assert "disabled" in result["logs"][0].lower()


@pytest.mark.slow
def test_sandbox_engine_executes_legitimate_script(monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_PYTHON_SANDBOX", True)
    result = PythonDSPEngine.execute_script(
        "import numpy as np\n"
        "t = np.linspace(0, 1, 128)\n"
        "raw_signal = np.sin(2 * np.pi * 5 * t)\n"
        "print('samples', len(raw_signal))\n"
    )

    assert result["status"] == "success", result["logs"]
    assert len(result["time"]) == 128
    assert len(result["raw_signal"]) == 128
    # Absent an explicit assignment, filtered_signal mirrors raw_signal.
    assert result["filtered_signal"] == result["raw_signal"]
    assert any("samples 128" in line for line in result["logs"])


@pytest.mark.slow
def test_sandbox_engine_terminates_infinite_loop(monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_PYTHON_SANDBOX", True)
    monkeypatch.setattr(settings, "PYTHON_SANDBOX_TIMEOUT_SECONDS", 3.0)

    result = PythonDSPEngine.execute_script("while True:\n    pass\n")

    assert result["status"] == "error"
    assert "Timeout" in result["logs"][0]


def test_python_endpoint_returns_403_when_sandbox_disabled(monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_PYTHON_SANDBOX", False)
    res = client.post("/api/python/execute", json={"python_code": "t = [0.0]"})

    assert res.status_code == 403
    assert res.json()["code"] == "SANDBOX_DISABLED"


def test_python_endpoint_reports_policy_violation(monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_PYTHON_SANDBOX", True)
    res = client.post("/api/python/execute", json={"python_code": "import os"})

    assert res.status_code == 400
    body = res.json()
    assert body["code"] == "SANDBOX_EXECUTION_FAILED"
    assert "Security Violation" in body["message"]


# ---------------------------------------------------------------------------
# Graph resource limits
# ---------------------------------------------------------------------------

def _graph_project(node_count: int, connection_count: int = 0):
    nodes = [
        {"id": f"n{i}", "type": "generator.sine", "params": {}}
        for i in range(node_count)
    ]
    connections = [
        {"from_node": "n0", "from_port": "out", "to_node": "n1", "to_port": "in"}
        for _ in range(connection_count)
    ]
    return {"project": {"version": "2.1.0", "graph": {"nodes": nodes, "connections": connections}}}


def test_graph_rejects_node_count_over_limit():
    payload = _graph_project(node_count=settings.MAX_GRAPH_NODES + 1)
    res = client.post("/api/graph/validate", json=payload)

    assert res.status_code == 422
    codes = [err["code"] for err in res.json()["errors"]]
    assert "GRAPH_NODE_LIMIT_EXCEEDED" in codes


def test_graph_rejects_connection_count_over_limit():
    payload = _graph_project(node_count=2, connection_count=settings.MAX_GRAPH_CONNECTIONS + 1)
    res = client.post("/api/graph/validate", json=payload)

    assert res.status_code == 422
    codes = [err["code"] for err in res.json()["errors"]]
    assert "GRAPH_CONNECTION_LIMIT_EXCEEDED" in codes


def test_graph_execute_rejects_oversized_graph():
    payload = _graph_project(node_count=settings.MAX_GRAPH_NODES + 1)
    res = client.post("/api/graph/execute", json=payload)

    assert res.status_code == 422
    codes = [err["code"] for err in res.json()["validation"]["errors"]]
    assert "GRAPH_NODE_LIMIT_EXCEEDED" in codes


def test_graph_rejects_sandbox_node_fanout():
    """One graph must not be able to spawn an unbounded number of interpreters."""
    count = settings.MAX_SANDBOX_NODES_PER_GRAPH + 1
    nodes = [
        {"id": f"s{i}", "type": "sandbox.python_exec", "params": {}}
        for i in range(count)
    ]
    payload = {"project": {"version": "2.1.0", "graph": {"nodes": nodes, "connections": []}}}

    res = client.post("/api/graph/validate", json=payload)

    assert res.status_code == 422
    codes = [err["code"] for err in res.json()["errors"]]
    assert "GRAPH_SANDBOX_NODE_LIMIT_EXCEEDED" in codes


def test_graph_allows_sandbox_nodes_within_budget():
    nodes = [
        {"id": f"s{i}", "type": "sandbox.python_exec", "params": {}}
        for i in range(settings.MAX_SANDBOX_NODES_PER_GRAPH)
    ]
    payload = {"project": {"version": "2.1.0", "graph": {"nodes": nodes, "connections": []}}}

    res = client.post("/api/graph/validate", json=payload)

    codes = [err["code"] for err in res.json().get("errors", [])]
    assert "GRAPH_SANDBOX_NODE_LIMIT_EXCEEDED" not in codes


@pytest.mark.slow
def test_sandbox_injects_host_variables_without_touching_source(monkeypatch):
    """
    Host data reaches the script as a value, not as source text — so a large
    vector neither inflates the script past the size cap nor changes parsing.
    """
    monkeypatch.setattr(settings, "ENABLE_PYTHON_SANDBOX", True)

    result = PythonDSPEngine.execute_script(
        "output_signal = input_signal * 2.0",
        variables={"input_signal": [1.0, 2.0, 3.0]},
    )

    assert result["status"] == "success", result["logs"]
    assert result["output_signal"] == [2.0, 4.0, 6.0]


def test_graph_within_limits_is_not_rejected_for_size():
    payload = _graph_project(node_count=3)
    res = client.post("/api/graph/validate", json=payload)

    body = res.json()
    codes = [err["code"] for err in body.get("errors", [])]
    assert "GRAPH_NODE_LIMIT_EXCEEDED" not in codes
    assert "GRAPH_CONNECTION_LIMIT_EXCEEDED" not in codes


# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------

def test_fixed_window_limiter_blocks_after_limit():
    local = FixedWindowRateLimiter(window_seconds=60)

    for _ in range(3):
        allowed, _ = local.check("bucket", "1.2.3.4", limit=3, now=100.0)
        assert allowed

    allowed, retry_after = local.check("bucket", "1.2.3.4", limit=3, now=100.0)
    assert not allowed
    assert retry_after > 0


def test_fixed_window_limiter_isolates_clients_and_buckets():
    local = FixedWindowRateLimiter(window_seconds=60)

    assert local.check("a", "1.1.1.1", limit=1, now=0.0)[0]
    assert not local.check("a", "1.1.1.1", limit=1, now=0.0)[0]
    # A different caller and a different bucket each get their own budget.
    assert local.check("a", "2.2.2.2", limit=1, now=0.0)[0]
    assert local.check("b", "1.1.1.1", limit=1, now=0.0)[0]


def test_fixed_window_limiter_resets_in_next_window():
    local = FixedWindowRateLimiter(window_seconds=60)

    assert local.check("a", "1.1.1.1", limit=1, now=0.0)[0]
    assert not local.check("a", "1.1.1.1", limit=1, now=30.0)[0]
    assert local.check("a", "1.1.1.1", limit=1, now=61.0)[0]


def test_sandbox_endpoint_is_rate_limited(monkeypatch):
    monkeypatch.setattr(settings, "ENABLE_PYTHON_SANDBOX", False)
    monkeypatch.setattr(settings, "RATE_LIMIT_SANDBOX_PER_WINDOW", 3)

    payload = {"python_code": "t = [0.0]"}
    statuses = [client.post("/api/python/execute", json=payload).status_code for _ in range(5)]

    # First three hit the (disabled) endpoint, the rest are throttled.
    assert statuses[:3] == [403, 403, 403]
    assert statuses[3:] == [429, 429]


def test_rate_limited_response_is_structured(monkeypatch):
    monkeypatch.setattr(settings, "RATE_LIMIT_SANDBOX_PER_WINDOW", 1)
    monkeypatch.setattr(settings, "ENABLE_PYTHON_SANDBOX", False)

    payload = {"python_code": "t = [0.0]"}
    client.post("/api/python/execute", json=payload)
    res = client.post("/api/python/execute", json=payload)

    assert res.status_code == 429
    assert res.headers["Retry-After"].isdigit()
    body = res.json()
    assert body["code"] == "RATE_LIMIT_EXCEEDED"
    assert body["details"]["bucket"] == "sandbox"
    assert body["requestId"]


def test_health_probes_are_not_throttled_by_compute_budget(monkeypatch):
    monkeypatch.setattr(settings, "RATE_LIMIT_COMPUTE_PER_WINDOW", 1)

    for _ in range(5):
        assert client.get("/api/health/live").status_code == 200


# ---------------------------------------------------------------------------
# Vibration calculator request validation
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "endpoint,payload",
    [
        ("/api/vibration/belt-calculator", {"driver_pulley_d1_mm": -1}),
        ("/api/vibration/alignment-calculator", {"coupling_diameter_dr_mm": 0}),
        ("/api/vibration/unit-converter", {"value": 1.0, "input_unit": "g", "freq_hz": 0}),
        ("/api/vibration/sdof-simulator", {"mass_kg": 0, "stiffness_n_m": 1, "damping_c_n_s_m": 1}),
        ("/api/vibration/balance/two-plane", {"va0_amp": -5}),
        ("/api/vibration/balance/four-run-nophase", {"a0": 1.0}),
        ("/api/vibration/balance/static-couple", {}),
        ("/api/vibration/balance/split-weight", {"target_mass": -1}),
    ],
)
def test_vibration_calculators_reject_invalid_payloads(endpoint, payload):
    res = client.post(endpoint, json=payload)
    assert res.status_code == 422


def test_vibration_calculators_accept_valid_payloads():
    belt = client.post(
        "/api/vibration/belt-calculator",
        json={
            "driver_pulley_d1_mm": 150.0,
            "driven_pulley_d2_mm": 300.0,
            "belt_length_l_mm": 1200.0,
            "driver_rpm": 1500.0,
        },
    )
    assert belt.status_code == 200

    sdof = client.post(
        "/api/vibration/sdof-simulator",
        json={"mass_kg": 10.0, "stiffness_n_m": 5000.0, "damping_c_n_s_m": 20.0},
    )
    assert sdof.status_code == 200
