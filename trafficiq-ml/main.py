"""
TrafficIQ ML Service — FastAPI Application
Scaffold with health check endpoint.
Actual ML endpoints (predict, simulate, detect) will be implemented on Day 4.
"""

import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/health")
async def health_check():
    """Health check endpoint for the ML service."""
    return {
        "status": "healthy",
        "service": "trafficiq-ml",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": os.getenv("NODE_ENV", os.getenv("HOST", "development")),
    }


@app.get("/")
async def root():
    return {"message": "TrafficIQ ML Service is running"}
