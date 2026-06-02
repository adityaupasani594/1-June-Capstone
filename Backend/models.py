from pydantic import BaseModel, Field
from typing import List, Tuple


class JunctionData(BaseModel):
    """Data for a single junction"""
    id: str
    name: str
    traffic_density: float = Field(..., ge=0.0, le=1.0)
    average_speed: float
    queue_length: int
    status: str


class RoadData(BaseModel):
    """Data for a single road connection"""
    id: str
    from_junction: str
    to_junction: str
    congestion_score: float = Field(..., ge=0.0, le=1.0)
    traffic_volume: int
    average_speed: float


class NetworkStateRequest(BaseModel):
    """Request body for traffic prediction"""
    junctions: List[JunctionData]
    roads: List[RoadData]
    timestamp: str = None


class PredictionResponse(BaseModel):
    """Response with quantum predictions"""
    junction_id: str
    junction_name: str
    quantum_prediction: float = Field(..., ge=-1.0, le=1.0)
    predicted_density: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)


class NetworkPredictionResponse(BaseModel):
    """Full network prediction response"""
    num_qubits: int
    predictions: List[PredictionResponse]
    timestamp: str
    model_version: str = "1.0.0"


class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str
    num_qubits: int = None
    model_version: str = "1.0.0"
