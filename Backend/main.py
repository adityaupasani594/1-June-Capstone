from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import torch
import numpy as np
from typing import Dict, List, Tuple
import logging

from models import (
    NetworkStateRequest,
    NetworkPredictionResponse,
    PredictionResponse,
    HealthCheckResponse,
)

# Import the quantum circuit components
import sys
sys.path.insert(0, '/Backend')

try:
    from traffic_graph import create_traffic_quantum_circuit, evaluate_traffic_quantum_circuit
except ImportError:
    print("Warning: Could not import traffic_graph module")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Traffic Quantum Hybrid Model API",
    description="API for traffic prediction using hybrid classical-quantum neural networks",
    version="1.0.0",
)

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state for the model
class QuantumTrafficModel:
    def __init__(self):
        self.num_qubits = None
        self.circuit = None
        self.junction_id_map = {}
        self.edge_index = None
        self.model_version = "1.0.0"
    
    def initialize_circuit(self, num_junctions: int, edge_index: List[Tuple[int, int]]):
        """Initialize quantum circuit with given number of junctions (qubits)"""
        self.num_qubits = num_junctions
        self.edge_index = edge_index
        try:
            self.circuit = create_traffic_quantum_circuit(num_junctions, edge_index)
            logger.info(f"Initialized quantum circuit with {num_junctions} qubits")
        except Exception as e:
            logger.error(f"Error initializing circuit: {e}")
            raise
    
    def predict(self, junction_densities: List[float]) -> np.ndarray:
        """Get quantum predictions for junction densities"""
        if self.circuit is None:
            raise RuntimeError("Quantum circuit not initialized")
        
        if len(junction_densities) != self.num_qubits:
            raise ValueError(f"Expected {self.num_qubits} junction densities, got {len(junction_densities)}")
        
        # Convert densities to angles (0-1 -> 0-pi)
        theta = torch.tensor(junction_densities, dtype=torch.float32) * np.pi
        
        # Evaluate the quantum circuit
        try:
            predictions = self.circuit(theta)
            if isinstance(predictions, torch.Tensor):
                return predictions.detach().numpy()
            elif isinstance(predictions, list):
                return np.array(predictions)
            else:
                return np.array(predictions)
        except Exception as e:
            logger.error(f"Error evaluating circuit: {e}")
            raise

# Initialize the model
quantum_model = QuantumTrafficModel()


@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check endpoint"""
    return HealthCheckResponse(
        status="healthy",
        num_qubits=quantum_model.num_qubits,
        model_version=quantum_model.model_version,
    )


@app.post("/predict", response_model=NetworkPredictionResponse)
async def predict_traffic(request: NetworkStateRequest) -> NetworkPredictionResponse:
    """
    Predict traffic conditions using quantum-hybrid model
    
    Takes current junction and road data, returns quantum-enhanced predictions
    """
    try:
        # Get number of junctions
        num_junctions = len(request.junctions)
        
        # Build junction ID to index mapping
        junction_map = {j.id: i for i, j in enumerate(request.junctions)}
        
        # Convert roads to edge indices
        edge_index = []
        for road in request.roads:
            from_idx = junction_map.get(road.from_junction)
            to_idx = junction_map.get(road.to_junction)
            if from_idx is not None and to_idx is not None:
                edge_index.append((from_idx, to_idx))
        
        # Initialize circuit if number of junctions changed
        if (quantum_model.num_qubits is None or 
            quantum_model.num_qubits != num_junctions or
            quantum_model.edge_index != edge_index):
            quantum_model.initialize_circuit(num_junctions, edge_index)
            quantum_model.junction_id_map = junction_map
        
        # Extract junction densities
        junction_densities = [j.traffic_density for j in request.junctions]
        
        # Get quantum predictions
        quantum_preds = quantum_model.predict(junction_densities)
        
        # Convert quantum predictions to traffic densities
        # Quantum predictions range from -1 to 1, map to 0 to 1 density
        predicted_densities = (quantum_preds + 1.0) / 2.0
        predicted_densities = np.clip(predicted_densities, 0.0, 1.0)
        
        # Calculate confidence based on quantum state magnitude
        confidence = np.abs(quantum_preds)
        
        # Build predictions for each junction
        predictions = []
        for i, junction in enumerate(request.junctions):
            pred = PredictionResponse(
                junction_id=junction.id,
                junction_name=junction.name,
                quantum_prediction=float(quantum_preds[i]),
                predicted_density=float(predicted_densities[i]),
                confidence=float(confidence[i]),
            )
            predictions.append(pred)
        
        return NetworkPredictionResponse(
            num_qubits=num_junctions,
            predictions=predictions,
            timestamp=datetime.now().isoformat(),
            model_version=quantum_model.model_version,
        )
    
    except Exception as e:
        logger.error(f"Error in prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/initialize")
async def initialize_model(request: NetworkStateRequest):
    """Initialize the quantum model with network topology"""
    try:
        num_junctions = len(request.junctions)
        junction_map = {j.id: i for i, j in enumerate(request.junctions)}
        
        # Convert roads to edge indices
        edge_index = []
        for road in request.roads:
            from_idx = junction_map.get(road.from_junction)
            to_idx = junction_map.get(road.to_junction)
            if from_idx is not None and to_idx is not None:
                edge_index.append((from_idx, to_idx))
        
        quantum_model.initialize_circuit(num_junctions, edge_index)
        quantum_model.junction_id_map = junction_map
        
        return {
            "status": "initialized",
            "num_qubits": num_junctions,
            "num_edges": len(edge_index),
            "model_version": quantum_model.model_version,
        }
    except Exception as e:
        logger.error(f"Error initializing model: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/info")
async def get_model_info():
    """Get current model configuration"""
    return {
        "num_qubits": quantum_model.num_qubits,
        "model_version": quantum_model.model_version,
        "backend": "PennyLane with Quantum Simulator",
        "description": "Hybrid classical-quantum traffic prediction model",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
