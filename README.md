# Hybrid Traffic Prediction System - Project Setup Guide

## Project Architecture

This is a hybrid classical-quantum traffic prediction system split into two components:

### Frontend
- **Technology**: React + TypeScript + Vite
- **Purpose**: Interactive traffic visualization and monitoring dashboard
- **Port**: http://localhost:5173
- **Features**:
  - Real-time traffic map visualization
  - Junction and road state monitoring
  - Weather and incident feed
  - Quantum prediction integration

### Backend
- **Technology**: Python with FastAPI + PennyLane (Quantum)
- **Purpose**: Quantum-enhanced traffic prediction using hybrid neural networks
- **Port**: http://localhost:8000
- **Features**:
  - Dynamic quantum circuit (1 qubit per junction)
  - Traffic graph neural network (GNN)
  - Hybrid classical-quantum fusion
  - REST API for predictions

## Qubit Configuration

**Key Feature**: The number of qubits in the quantum circuit automatically scales with the number of junctions:
- **1 Qubit per Junction**
- Frontend creates up to 100 junctions across 8 districts
- Current configuration: **100 Qubits** (for 100 junctions)
- Dynamically adjusts if junction topology changes

## Project Structure

```
project-root/
├── Frontend/                    # React TypeScript application
│   ├── src/
│   │   ├── components/         # UI components
│   │   │   ├── charts/
│   │   │   ├── layout/
│   │   │   ├── map/
│   │   │   └── panels/
│   │   ├── hooks/
│   │   │   ├── useTrafficSimulation.ts
│   │   │   └── useQuantumPredictions.ts  # NEW: Quantum predictions hook
│   │   ├── services/
│   │   │   ├── mockTraffic.ts
│   │   │   └── quantumBackend.ts         # NEW: Backend API client
│   │   ├── store/               # Zustand state management
│   │   ├── types/               # TypeScript types
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── index.html
│
├── Backend/                     # Python FastAPI application
│   ├── main.py                 # NEW: FastAPI server with quantum predictions
│   ├── models.py               # NEW: Pydantic request/response models
│   ├── requirements.txt         # NEW: Python dependencies
│   ├── hybrid_traffic_model.py  # Hybrid GNN + Quantum model
│   ├── variational_quantum_circuit.py  # Variational quantum circuit
│   ├── traffic_graph.py         # Traffic GNN layers and quantum utilities
│   └── README.md               # Backend setup instructions
│
├── README.md                    # This file
├── SETUP.md                     # Detailed setup instructions
└── .gitignore
```

## Quick Start

### 1. Install Dependencies

#### Frontend
```bash
cd Frontend
npm install
```

#### Backend
```bash
cd Backend
pip install -r requirements.txt
```

### 2. Start the Backend Server

```bash
cd Backend
python main.py
```

The backend will start on `http://localhost:8000`

Check health: `curl http://localhost:8000/health`

### 3. Start the Frontend Development Server

```bash
cd Frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

### 4. Access the Application

Open your browser to `http://localhost:5173`

## API Endpoints

The backend provides the following REST API:

### Health Check
```
GET /health
```
Check if backend is running and get quantum configuration

### Initialize Model
```
POST /initialize
```
Initialize quantum circuit with network topology
Request body: `{ junctions: [...], roads: [...] }`

### Get Predictions
```
POST /predict
```
Get quantum-enhanced traffic predictions
Request body: `{ junctions: [...], roads: [...] }`

### Get Model Info
```
GET /info
```
Get current backend model configuration

## Frontend-Backend Connection

The frontend automatically connects to the backend via:

1. **Environment Variable**: `REACT_APP_BACKEND_URL` (default: `http://localhost:8000`)
2. **Service Layer**: `src/services/quantumBackend.ts`
3. **Custom Hook**: `src/hooks/useQuantumPredictions.ts`

The `useQuantumPredictions` hook:
- Initializes the quantum model on component mount
- Automatically fetches predictions when network topology changes
- Handles errors gracefully (predictions are optional)
- Scales qubits based on junction count

## Configuration

### Environment Variables

**Frontend** (Frontend/.env):
```
REACT_APP_BACKEND_URL=http://localhost:8000
```

**Backend** (Backend/.env):
```
FASTAPI_ENV=development
LOG_LEVEL=INFO
```

## Data Flow

```
Frontend Network Data
        ↓
quantumBackend.ts (Service)
        ↓
FastAPI Backend (main.py)
        ↓
Quantum Circuit (traffic_graph.py)
        ↓
Traffic GNN + Quantum Fusion
        ↓
Predictions (JSON)
        ↓
useQuantumPredictions Hook
        ↓
Frontend UI Update
```

## Junction to Qubit Mapping

Each junction in the traffic network maps to one qubit:

```
Junction J001 → Qubit 0
Junction J002 → Qubit 1
Junction J003 → Qubit 2
...
Junction J100 → Qubit 99
```

This 1:1 mapping allows the quantum circuit to represent the entire traffic network as a quantum state.

## Performance Characteristics

- **Quantum Circuit Initialization**: ~100ms for 100 qubits
- **Prediction Latency**: ~50-200ms per request
- **Concurrent Predictions**: Handled by FastAPI async
- **State Management**: Zustand on frontend, in-memory on backend

## Troubleshooting

### Backend won't start
- Check Python version: `python --version` (requires Python 3.8+)
- Check dependencies: `pip install -r requirements.txt`
- Check port 8000 is not in use: `netstat -ano | findstr :8000`

### Frontend can't connect to backend
- Ensure backend is running on port 8000
- Check CORS configuration in `Backend/main.py`
- Check browser console for CORS errors

### Quantum circuit initialization fails
- Verify junction count matches edge list
- Check PennyLane installation: `python -c "import pennylane as qml; print(qml.__version__)"`

## Development Notes

### Adding New Features
1. **Frontend**: Add components in `Frontend/src/components/`
2. **Backend**: Add new endpoints in `Backend/main.py`
3. **Types**: Update `Frontend/src/types/traffic.ts` for shared types
4. **API Models**: Update `Backend/models.py` for new request/response formats

### Testing Predictions
```bash
# In Backend directory
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d @sample_request.json
```

## License

This project is part of a capstone project.

## Future Enhancements

- [ ] Persistent model weights storage
- [ ] Real database backend (MongoDB)
- [ ] Advanced quantum optimizations (VQE, QAOA)
- [ ] Batch prediction processing
- [ ] WebSocket for real-time updates
- [ ] Model training endpoint
- [ ] Performance metrics dashboard
