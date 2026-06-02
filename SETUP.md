# Setup and Deployment Guide

## Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [Quantum Circuit Configuration](#quantum-circuit-configuration)
3. [Testing and Validation](#testing-and-validation)
4. [Troubleshooting](#troubleshooting)
5. [Production Deployment](#production-deployment)
6. [Performance Tuning](#performance-tuning)

## Local Development Setup

### System Requirements

- **Operating System**: Windows, macOS, or Linux
- **Python**: 3.8+ (for backend)
- **Node.js**: 16+ (for frontend)
- **RAM**: Minimum 4GB (8GB recommended for quantum simulation)
- **Disk Space**: 2GB free

### Step-by-Step Setup

#### 1. Clone/Extract Project

```bash
cd your-project-directory
# Project structure:
# ├── Frontend/
# ├── Backend/
# ├── README.md
# └── SETUP.md
```

#### 2. Backend Setup

##### Create Python Virtual Environment

```bash
cd Backend

# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

##### Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**Dependencies installed**:
- FastAPI 0.104.1 - Web framework
- Uvicorn 0.24.0 - ASGI server
- PyTorch 2.1.0 - Deep learning
- PennyLane 0.32.0 - Quantum computing
- Torch-Geometric 2.4.0 - Graph neural networks

##### Verify Installation

```bash
python -c "import pennylane as qml; print(f'PennyLane {qml.__version__} ready')"
python -c "import torch; print(f'PyTorch {torch.__version__} ready')"
```

##### Configure Backend (Optional)

Create `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
# Edit .env with your settings
```

##### Start Backend Server

```bash
python main.py
# Or with explicit settings:
# uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**Expected output**:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

**Verify backend**:
```bash
# In another terminal:
curl http://localhost:8000/health
```

**Expected response**:
```json
{
  "status": "healthy",
  "num_qubits": null,
  "model_version": "1.0.0"
}
```

#### 3. Frontend Setup

##### Install Node Dependencies

```bash
cd Frontend
npm install
```

**Key dependencies**:
- react 18 - UI framework
- vite - Build tool
- typescript - Type safety
- tailwindcss - Styling
- maplibre-gl - Map visualization
- zustand - State management

##### Configure Frontend (Optional)

Create `.env` file:

```bash
echo "VITE_BACKEND_URL=http://localhost:8000" > .env
```

Or on Windows:
```powershell
"VITE_BACKEND_URL=http://localhost:8000" | Out-File -Encoding utf8 .env
```

##### Start Frontend Development Server

```bash
npm run dev
```

**Expected output**:
```
  VITE v4.4.0  ready in 245 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

#### 4. Verify Full Integration

1. **Backend running**: http://localhost:8000/health ✓
2. **Frontend running**: http://localhost:5173 ✓
3. **Open browser**: http://localhost:5173

**Expected**:
- Traffic map loads
- Junctions display as colored circles
- "Initializing quantum circuit..." message appears
- After 1-2 seconds: "Quantum circuit initialized with 100 qubits"
- Predictions appear in the dashboard

## Quantum Circuit Configuration

### Understanding the Setup

```
Frontend Network (100 Junctions)
    ↓
Quantum Circuit (100 Qubits)
    ↓
1 Qubit per Junction (1:1 mapping)
```

### Current Configuration

- **Junctions**: 100 (across 8 districts)
- **Qubits**: 100 (dynamic, scales with junction count)
- **Entanglement**: CNOT gates based on road connections
- **Circuit Depth**: Configurable
- **Execution**: Classical simulation (PennyLane default.qubit)

### Customizing Junction Count

#### Option 1: Modify Frontend Mock Data

Edit `Frontend/src/services/mockTraffic.ts`:

```typescript
// Line ~150: Change junction slice size
return junctions.slice(0, 50);  // Create 50 junctions instead of 100
```

Backend will automatically adjust to 50 qubits.

#### Option 2: Modify Backend Circuit Depth

Edit `Backend/traffic_graph.py`:

```python
# To add more quantum layers:
# Modify the create_traffic_quantum_circuit function
# to add additional quantum gates or layers
```

#### Option 3: Change Entanglement Pattern

Edit `Backend/traffic_graph.py` in `create_traffic_quantum_circuit()`:

```python
# Current: CNOT along road connections
for source, target in roads:
    qml.CNOT(wires=[source, target])

# Alternative: Linear chain
for wire in range(num_qubits - 1):
    qml.CNOT(wires=[wire, wire + 1])
```

### Monitoring Quantum State

In browser console:

```javascript
// Access predictions from latest response
const store = useTrafficStore.getState();
console.log('Network:', store.network);
// Check quantum backend service
import { getBackendInfo } from './services/quantumBackend';
getBackendInfo().then(info => console.log(info));
```

## Testing and Validation

### Backend Testing

#### Unit Test: Quantum Circuit

```bash
cd Backend
python -c "
from traffic_graph import create_traffic_quantum_circuit
import torch

# Test with 5 qubits
edges = [(0, 1), (1, 2), (2, 3)]
circuit = create_traffic_quantum_circuit(5, edges)

# Test with sample angles
theta = torch.tensor([0.1, 0.2, 0.3, 0.4, 0.5])
result = circuit(theta)
print(f'Result shape: {result}')
print(f'Predictions: {result}')
"
```

#### Integration Test: API Endpoints

```bash
# 1. Health check
curl http://localhost:8000/health

# 2. Get model info
curl http://localhost:8000/info

# 3. Initialize model (requires valid data)
curl -X POST http://localhost:8000/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "junctions": [{"id": "J001", "name": "Test", "traffic_density": 0.5, "average_speed": 30, "queue_length": 5, "status": "moderate"}],
    "roads": [{"id": "R001", "from_junction": "J001", "to_junction": "J001", "congestion_score": 0.5, "traffic_volume": 100, "average_speed": 30}]
  }'
```

### Frontend Testing

#### Manual Testing Checklist

- [ ] Map loads without errors
- [ ] Junctions render with correct colors
- [ ] Clicking junction shows details panel
- [ ] "Backend initializing..." message appears
- [ ] "Initialized with X qubits" message appears
- [ ] Predictions populate in dashboard
- [ ] Traffic updates every second
- [ ] No console errors

#### Browser Console Testing

```javascript
// Check backend service
import { checkBackendHealth } from './services/quantumBackend';
checkBackendHealth().then(console.log);

// Get current predictions
import { useTrafficStore } from './store/trafficStore';
const state = useTrafficStore.getState();
console.log(state.network.junctions.length);

// Trigger prediction fetch
const { useQuantumPredictions } = await import('./hooks/useQuantumPredictions');
// Check hook state in component
```

#### Network Tab Testing

1. Open DevTools (F12)
2. Go to Network tab
3. Refresh page
4. Look for:
   - `GET http://localhost:8000/health` - Should return 200
   - `POST http://localhost:8000/initialize` - Should return 200
   - `POST http://localhost:8000/predict` - Should return 200 with predictions

### Performance Testing

#### Backend Performance

```bash
# Time prediction latency
python -c "
import time
from main import quantum_model, QuantumTrafficModel
from models import NetworkStateRequest, JunctionData, RoadData

# Create test data
qm = QuantumTrafficModel()
qm.initialize_circuit(10, [(0,1), (1,2)])

# Time prediction
densities = [0.5] * 10
start = time.time()
result = qm.predict(densities)
elapsed = time.time() - start
print(f'Prediction time: {elapsed*1000:.2f}ms')
"
```

#### Frontend Performance

Use Chrome DevTools:
1. Open DevTools (F12)
2. Go to Performance tab
3. Record for 5 seconds while interacting
4. Check FPS: Should be ~60 FPS on modern hardware

## Troubleshooting

### Backend Issues

#### Problem: "Address already in use"
```bash
# Find process on port 8000
netstat -ano | findstr :8000
# Kill process
taskkill /PID <PID> /F
# Or use different port
python main.py --port 8001
```

#### Problem: "ModuleNotFoundError: No module named 'pennylane'"
```bash
# Reinstall dependencies
pip install --upgrade pip
pip install -r requirements.txt --no-cache-dir
# Verify
python -c "import pennylane; print(pennylane.__version__)"
```

#### Problem: "Circuit initialization failed"
```
Check:
1. Junction count matches edge list length
2. All edges reference valid junction indices
3. Backend logs for detailed error
4. PennyLane is installed: pip show pennylane
```

### Frontend Issues

#### Problem: "Cannot connect to backend"
```bash
# 1. Verify backend is running
curl http://localhost:8000/health

# 2. Check VITE_BACKEND_URL in .env
cat .env | grep VITE_BACKEND_URL

# 3. Check browser console for CORS errors
# DevTools > Console tab

# 4. Verify CORS in Backend/main.py
# Check allow_origins matches frontend URL
```

#### Problem: "Quantum predictions not appearing"
```
Check:
1. Backend health: http://localhost:8000/health
2. Network tab in DevTools:
   - Look for POST /predict request
   - Check response status (should be 200)
   - Check response body has predictions
3. Browser console for JavaScript errors
4. useQuantumPredictions hook state in React DevTools
```

#### Problem: "Map not rendering"
```bash
# Check:
1. MapLibre GL CSS loaded: DevTools > Elements > look for maplibre CSS
2. Junctions data exists: 
   import { useTrafficStore } from './store/trafficStore';
   useTrafficStore.getState().network.junctions.length
3. No console errors in DevTools > Console
```

### Common Solutions

#### Clear Cache and Restart

```bash
# Backend
deactivate  # Exit virtual env
rm -rf venv
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py

# Frontend
rm -rf node_modules
rm package-lock.json
npm install
npm run dev
```

#### Update Dependencies

```bash
# Backend
pip install --upgrade -r requirements.txt

# Frontend
npm update
npm audit fix
```

## Production Deployment

### Build Frontend

```bash
cd Frontend
npm run build
# Output in Frontend/dist/
```

### Deploy Frontend

Options:
1. **Netlify**: Connect GitHub repo, auto-deploys
2. **Vercel**: Similar to Netlify
3. **GitHub Pages**: `npm run build`, push dist/ to gh-pages branch
4. **AWS S3**: `aws s3 sync dist/ s3://bucket-name/`
5. **Docker**: Create Dockerfile for containerization

### Deploy Backend

#### Option 1: Heroku

```bash
# Create Procfile
echo "web: uvicorn main:app --host=0.0.0.0 --port=${PORT:-8000}" > Procfile

# Deploy
heroku create app-name
git push heroku main
```

#### Option 2: AWS EC2

```bash
# SSH into instance
ssh -i key.pem ec2-user@ip-address

# Install Python, create virtual env, run server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
nohup python main.py > backend.log 2>&1 &
```

#### Option 3: Docker

```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY Backend/ .

RUN pip install -r requirements.txt

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t traffic-backend .
docker run -p 8000:8000 traffic-backend
```

### Environment Configuration for Production

**Frontend (.env.production)**:
```
VITE_BACKEND_URL=https://api.example.com
```

**Backend (.env.production)**:
```
FASTAPI_ENV=production
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=INFO
CORS_ORIGINS=["https://example.com", "https://www.example.com"]
```

## Performance Tuning

### Backend Optimization

#### 1. Use FastAPI Workers

```bash
# 4 workers for production
uvicorn main:app --workers 4 --host 0.0.0.0 --port 8000
```

#### 2. Enable Response Compression

```python
# In main.py
from fastapi.middleware.gzip import GZIPMiddleware
app.add_middleware(GZIPMiddleware, minimum_size=1000)
```

#### 3. Cache Predictions

```python
# In main.py - add simple caching
from functools import lru_cache

@lru_cache(maxsize=100)
def cached_prediction(network_hash):
    # Return cached result
    pass
```

#### 4. Use Quantum Optimizations

```python
# In traffic_graph.py
# Consider differentiable quantum simulation
device = qml.device("default.qubit.autograd", wires=num_qubits)
# or
device = qml.device("lightning.qubit", wires=num_qubits)  # Faster
```

### Frontend Optimization

#### 1. Code Splitting

```typescript
// In App.tsx
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const Suspense = lazy(() => import('react').then(m => ({ default: m.Suspense })));
```

#### 2. Memoization

```typescript
const TrafficMap = React.memo(TrafficMapComponent);
```

#### 3. Debouncing Predictions

Already implemented in `useQuantumPredictions.ts` (500ms debounce)

#### 4. Image Optimization

Ensure all images are optimized (WebP format)

### Monitoring and Logging

#### Backend Logging

```python
# In main.py
import logging
logger = logging.getLogger(__name__)

logger.info(f"Prediction took {elapsed_ms}ms")
logger.error(f"Circuit initialization failed: {error}")
```

#### Frontend Error Reporting

```typescript
// In services/quantumBackend.ts
catch (error) {
  console.error('Prediction error:', error);
  // Send to error tracking service
  // e.g., Sentry.captureException(error);
}
```

## Summary Checklist

### Before First Run
- [ ] Python 3.8+ installed
- [ ] Node.js 16+ installed
- [ ] Backend virtual environment created
- [ ] All dependencies installed
- [ ] No port conflicts (8000, 5173)

### After Setup
- [ ] Backend server running (`http://localhost:8000/health` returns 200)
- [ ] Frontend server running (`http://localhost:5173` loads)
- [ ] Traffic map displays 100 junctions
- [ ] Quantum circuit initializes with 100 qubits
- [ ] Predictions populate in dashboard
- [ ] No console errors in browser

### Before Deployment
- [ ] Frontend build succeeds: `npm run build`
- [ ] Backend test passes
- [ ] Environment variables configured
- [ ] CORS settings correct
- [ ] Performance baseline established

---

For additional help, see:
- [Backend README](Backend/README.md)
- [Frontend README](Frontend/README.md)
- [Main README](README.md)
