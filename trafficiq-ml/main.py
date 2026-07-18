"""
TrafficIQ ML Service - FastAPI Application
Endpoints for MARL (predict, simulate) and YOLOv8 (detect).
"""

import os
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from models.yolo_detector import YoloDetector
from models.gat import TrafficGAT
from models.qmix import QMIXAgent
import torch
from training.train_marl import train_marl
from simulation.scenario_builder import ScenarioBuilder
from simulation.sumo_runner import create_env

# --- Pydantic Models ---
class PredictRequest(BaseModel):
    intersectionId: str
    observation_vector: List[float]
    neighbor_states: Optional[Dict[str, List[float]]] = None

class PredictResponse(BaseModel):
    recommended_phase: int
    green_duration: int
    confidence: float
    bus_priority: bool

class SimulateRequest(BaseModel):
    scenario: str
    duration: int
    controller_type: str = "MARL"
    intersections: Optional[List[str]] = None
    episodes: int = 1

class SimulateResponse(BaseModel):
    avg_wait_time: float
    avg_travel_time: float
    bus_speed: float
    reward_history: List[float]

# --- App Init ---
app = FastAPI(
    title="TrafficIQ ML Service",
    description="MARL + YOLOv8 + SUMO simulation microservice",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize YOLO detector and MARL models (lazy load or global)
yolo = None
gat_model = None
qmix_model = None

@app.on_event("startup")
async def startup_event():
    global yolo, gat_model, qmix_model
    try:
        print("Loading YOLO model...")
        yolo = YoloDetector()
        print("YOLO loaded.")
    except Exception as e:
        print(f"Failed to load YOLO: {e}")

    try:
        print("Initializing MARL models with random weights...")
        # Assume an input feature size of 10 for the observation vector
        gat_model = TrafficGAT(in_channels=10, hidden_channels=32, out_channels=16)
        # 1 agent for inference, obs_dim is the GAT output, n_actions=4 phases
        qmix_model = QMIXAgent(n_agents=1, obs_dim=16, state_dim=16, n_actions=4)
        gat_model.eval()
        qmix_model.eval()
        print("MARL models loaded.")
    except Exception as e:
        print(f"Failed to load MARL models: {e}")

# --- Endpoints ---

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "trafficiq-ml",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": os.getenv("NODE_ENV", "development"),
    }

@app.get("/")
async def root():
    return {"message": "TrafficIQ ML Service is running"}

@app.post("/predict", response_model=PredictResponse)
async def predict_phase(req: PredictRequest):
    """
    Returns optimal traffic light phase using GAT + QMIX inference.
    """
    if gat_model is None or qmix_model is None:
        raise HTTPException(status_code=500, detail="Models not loaded")

    try:
        # 1. Prepare inputs
        # Pad or truncate observation vector to match in_channels=10
        obs = req.observation_vector
        if len(obs) < 10:
            obs = obs + [0.0] * (10 - len(obs))
        else:
            obs = obs[:10]
            
        x = torch.tensor([obs], dtype=torch.float32)
        # Dummy edge_index for self-loop (single intersection graph for predict)
        edge_index = torch.tensor([[0], [0]], dtype=torch.long)

        # 2. Forward pass with no_grad
        with torch.no_grad():
            # Get GAT embedding
            embedding = gat_model(x, edge_index)
            
            # Pass to QMIX agent (using agent 0)
            # The observation for the agent is the embedding
            q_values = qmix_model.agents[0](embedding)
            
            # 3. Get action and confidence
            action = torch.argmax(q_values, dim=1).item()
            confidence = torch.softmax(q_values, dim=1).max().item()

        # Calculate a dynamic green duration based on confidence (20 to 60 seconds)
        green_duration = max(20, min(60, int(30 * (1 + confidence))))
        
        return PredictResponse(
            recommended_phase=action,
            green_duration=green_duration,
            confidence=round(confidence, 3),
            bus_priority=False
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

@app.post("/detect")
async def detect_vehicles(file: UploadFile = File(...)):
    """
    Runs YOLOv8 object detection on the uploaded image.
    """
    if not yolo:
        raise HTTPException(status_code=500, detail="YOLO model not loaded.")
        
    image_bytes = await file.read()
    detections = yolo.detect_vehicles(image_bytes)
    return {"detections": detections, "count": len(detections)}

@app.post("/simulate", response_model=SimulateResponse)
async def run_simulation(req: SimulateRequest):
    """
    Triggers a SUMO simulation run (or fallback) and optional training episode.
    """
    builder = ScenarioBuilder()
    intersections = req.intersections or ["INT-01", "INT-02"]
    
    config = builder.build_scenario(req.scenario, intersections, req.duration)
    config["episodes"] = req.episodes
    
    # Run a short training loop / episode run
    result = train_marl(config)
    
    return SimulateResponse(
        avg_wait_time=result["avg_wait_time"],
        avg_travel_time=result["avg_travel_time"],
        bus_speed=result["bus_speed"],
        reward_history=result.get("reward_history", [])
    )
