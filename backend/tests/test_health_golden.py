import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_live():
    res = client.get("/api/health/live")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["service"] == "rei-signallab-api"


def test_health_ready():
    res = client.get("/api/health/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert data["checks"]["node_registry"] == "ok"
    assert data["checks"]["dsp_engine"] == "ok"
    assert data["checks"]["vibration_engine"] == "ok"


def test_version_manifest():
    res = client.get("/api/version")
    assert res.status_code == 200
    data = res.json()
    assert data["service"] == "rei-signallab-api"
    assert data["version"] == "2.1.0"
    assert data["apiVersion"] == "v1"
