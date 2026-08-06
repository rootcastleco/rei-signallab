import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_ai_models():
    response = client.get("/api/ai/models")
    assert response.status_code == 200
    models = response.json()
    assert isinstance(models, list)
    assert len(models) >= 5
    model_ids = [m["id"] for m in models]
    assert "google/gemini-2.0-flash-lite-preview-02-05:free" in model_ids
    assert "meta-llama/llama-3.3-70b-instruct:free" in model_ids
    assert "deepseek/deepseek-r1:free" in model_ids

def test_ai_analyze_validation_error():
    # Test missing required prompt field returns 422
    response = client.post("/api/ai/analyze", json={})
    assert response.status_code == 422
