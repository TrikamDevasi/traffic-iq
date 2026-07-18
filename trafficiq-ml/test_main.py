from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_predict_optimal_phase():
    response = client.post(
        "/predict",
        json={
            "intersection_id": "test-intersection",
            "lane_data": [
                {"lane_id": "L1", "queue_length": 5, "avg_wait": 20},
                {"lane_id": "L2", "queue_length": 15, "avg_wait": 45}
            ],
            "current_phase": 0
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "recommended_phase" in data
    assert "green_duration" in data
    assert "confidence" in data
    assert "fallback" in data
    assert type(data["green_duration"]) is int
    assert data["green_duration"] > 0

def test_simulate():
    response = client.post(
        "/simulate",
        json={
            "scenario": "test-scenario",
            "duration": 60,
            "controllerType": "MARL",
            "comparedTo": "fixed-time"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "runId" in data
    assert "status" in data
    # For sync completion, it should return metrics
    if data["status"] == "completed":
        assert "avgWaitTimeReduction" in data
        assert "avgTravelTimeReduction" in data
        assert "busSpeedImprovement" in data
        # Ensure it's not the old mock value
        assert data["avgWaitTimeReduction"] != 45.2
