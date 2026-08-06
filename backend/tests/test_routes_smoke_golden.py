"""
Route-level smoke suite.

The rest of the suite exercises the engines directly, which is why a route
calling a method that did not exist (`VibrationEngine.compute_envelope_spectrum`
had lost its `def` line) could return HTTP 500 in production while every test
passed. These tests drive each endpoint through the HTTP layer with a minimal
valid payload, so a broken wiring surfaces here rather than in a deploy smoke
test that then triggers an auto-rollback.

The assertion is deliberately weak — "does not fault" — because the point is
coverage of every route, not numerical verification. Correctness lives in the
golden suites.
"""

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.ratelimit import limiter

client = TestClient(app)


@pytest.fixture(autouse=True)
def _clear_rate_limiter():
    limiter.reset()
    yield
    limiter.reset()


GET_ROUTES = [
    "/",
    "/api/health/live",
    "/api/health/ready",
    "/api/version",
    "/api/nodes",
    "/api/nodes/generator.sine",
    "/api/vibration/bearing-database",
    "/api/vibration/bearing-search?q=6205",
    "/api/gps/gold-code/1",
    "/api/ai/models",
    "/api/matlab/client",
    "/api/matlab/installer",
]

SIGNAL_REQUEST = {
    "generator": {"waveform": "sine", "frequency": 440.0, "sample_rate": 44100, "duration": 0.05},
    "math": {},
    "filter": {},
    "fft": {"n_fft": 1024},
}

POST_ROUTES = [
    ("/api/process", SIGNAL_REQUEST),
    ("/api/export/wav", SIGNAL_REQUEST),
    ("/api/lisp/process", {**SIGNAL_REQUEST, "lisp_code": "(lisp-quantize-buffer signal 8)"}),
    ("/api/graph/validate", {"project": {"version": "2.1.0", "graph": {"nodes": [], "connections": []}}}),
    ("/api/graph/execute", {"project": {"version": "2.1.0", "graph": {"nodes": [], "connections": []}}}),
    # The payload the CD pipeline's smoke test posts. It must not fault.
    ("/api/vibration/analyze", {"sample_rate": 25600, "rpm": {"manual_rpm": 1500.0}}),
    ("/api/vibration/balance", {}),
    (
        "/api/vibration/balance/two-plane",
        {
            "va0_amp": 4.8, "va0_phase_deg": 72.0, "vb0_amp": 3.9, "vb0_phase_deg": 145.0,
            "w_ta_mass": 10.0, "w_ta_angle_deg": 0.0,
            "vaa_amp": 7.2, "vaa_phase_deg": 128.0, "vba_amp": 4.4, "vba_phase_deg": 160.0,
            "w_tb_mass": 10.0, "w_tb_angle_deg": 0.0,
            "vab_amp": 5.1, "vab_phase_deg": 95.0, "vbb_amp": 6.3, "vbb_phase_deg": 190.0,
        },
    ),
    ("/api/vibration/balance/four-run-nophase", {"a0": 5.0, "trial_mass": 10.0, "a1": 6.0, "a2": 4.0, "a3": 5.5}),
    ("/api/vibration/balance/static-couple", {"va0_amp": 4.8, "va0_phase_deg": 72.0, "vb0_amp": 3.9, "vb0_phase_deg": 145.0}),
    ("/api/vibration/balance/split-weight", {"target_mass": 12.0, "target_angle_deg": 45.0, "hole1_angle_deg": 0.0, "hole2_angle_deg": 90.0}),
    (
        "/api/vibration/belt-calculator",
        {"driver_pulley_d1_mm": 150.0, "driven_pulley_d2_mm": 300.0, "belt_length_l_mm": 1200.0, "driver_rpm": 1500.0},
    ),
    (
        "/api/vibration/alignment-calculator",
        {
            "coupling_diameter_dr_mm": 100.0,
            "dist_coupling_to_front_feet_l1_mm": 200.0,
            "dist_coupling_to_rear_feet_l2_mm": 400.0,
            "rim_top": 0.05, "rim_bottom": -0.05, "face_top": 0.02, "face_bottom": -0.02,
        },
    ),
    ("/api/vibration/unit-converter", {"value": 2.5, "input_unit": "mm/s", "freq_hz": 50.0}),
    ("/api/vibration/sdof-simulator", {"mass_kg": 10.0, "stiffness_n_m": 5000.0, "damping_c_n_s_m": 20.0}),
    ("/api/electrical/analyze", {}),
    ("/api/antenna/analyze", {}),
    ("/api/gps/simulate", {}),
    ("/api/srw/simulate", {}),
    ("/api/matlab/export-m", {"graph_name": "TestGraph"}),
    ("/api/dsp-lab/sampling-aliasing", {}),
    ("/api/dsp-lab/fir-parks-mcclellan", {}),
    ("/api/dsp-lab/autocorrelation", {}),
    ("/api/dsp-lab/lms-adaptive", {}),
    ("/api/dsp-lab/cwt-scalogram", {}),
]


def _assert_not_faulted(response, label):
    assert response.status_code != 500, (
        f"{label} returned HTTP 500: {response.text[:400]}"
    )
    # 422 means the payload was rejected by validation, which is a test-data
    # problem, not a server fault. Anything else in 5xx is a real failure.
    assert response.status_code < 500, f"{label} returned {response.status_code}: {response.text[:400]}"


@pytest.mark.parametrize("path", GET_ROUTES)
def test_get_route_does_not_fault(path):
    _assert_not_faulted(client.get(path), f"GET {path}")


@pytest.mark.parametrize("path,payload", POST_ROUTES, ids=[p for p, _ in POST_ROUTES])
def test_post_route_does_not_fault(path, payload):
    _assert_not_faulted(client.post(path, json=payload), f"POST {path}")


def test_every_registered_route_is_covered():
    """A new endpoint must be added to this suite, not silently left untested."""
    covered = {path for path in GET_ROUTES} | {path for path, _ in POST_ROUTES}
    covered = {path.split("?")[0] for path in covered}

    exempt = {
        "/docs", "/docs/oauth2-redirect", "/redoc", "/openapi.json",
        "/api/nodes/{node_type}",       # covered by a concrete instance above
        "/api/gps/gold-code/{prn}",     # covered by a concrete instance above
        "/api/upload/signal",           # multipart; covered by the golden suites
        "/api/vibration/upload",        # multipart
        "/api/electrical/upload",       # multipart
        "/api/gps/export-iq-bin",       # binary response
        "/api/python/execute",          # covered by test_security_golden
        "/api/ai/analyze",              # external LLM API call
    }

    registered = {
        route.path for route in app.routes
        if hasattr(route, "methods") and route.path not in exempt
    }

    uncovered = sorted(registered - covered)
    assert not uncovered, f"routes with no smoke coverage: {uncovered}"


def test_cd_smoke_payload_returns_analysable_result():
    """
    Mirrors the assertion the deploy pipeline makes. If this fails, the deploy
    fails its smoke test and auto-rolls back.
    """
    res = client.post("/api/vibration/analyze", json={"sample_rate": 25600, "rpm": {"manual_rpm": 1500.0}})

    assert res.status_code == 200, res.text
    body = res.json()
    assert body["trust_mode"]
    assert isinstance(body["time_metrics"]["rms_acc_g"], (int, float))
    assert len(body["fft_frequencies"]) > 0
    assert len(body["envelope_frequencies"]) > 0


def test_primary_origin_is_allowed_by_cors():
    assert "https://signallab.site" in settings.CORS_ALLOWED_ORIGINS
