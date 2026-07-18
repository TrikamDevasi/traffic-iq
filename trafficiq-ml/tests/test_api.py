import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_predict_endpoint():
    payload = {
        "intersectionId": "INT-100",
        "observation_vector": [0.1, 0.5, 1.0, 0.0, 0.2, 0.1, 0.0, 0.0, 0.1, 0.2]
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "recommended_phase" in data
    assert "green_duration" in data
    assert data["confidence"] > 0.0

def test_simulate_endpoint():
    payload = {
        "scenario": "TestScenario",
        "duration": 60,
        "episodes": 1
    }
    response = client.post("/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "avg_wait_time" in data
    assert "reward_history" in data
