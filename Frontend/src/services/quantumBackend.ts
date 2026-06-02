import { NetworkSnapshot, Junction, Road } from '../types/traffic';

// Backend API configuration
const BACKEND_API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export interface JunctionData {
  id: string;
  name: string;
  traffic_density: number;
  average_speed: number;
  queue_length: number;
  status: string;
}

export interface RoadData {
  id: string;
  from_junction: string;
  to_junction: string;
  congestion_score: number;
  traffic_volume: number;
  average_speed: number;
}

export interface PredictionData {
  junction_id: string;
  junction_name: string;
  quantum_prediction: number;
  predicted_density: number;
  confidence: number;
}

export interface NetworkPredictionResponse {
  num_qubits: number;
  predictions: PredictionData[];
  timestamp: string;
  model_version: string;
}

export interface HealthCheckResponse {
  status: string;
  num_qubits?: number;
  model_version: string;
}

/**
 * Convert Network data to API format
 */
function convertNetworkToRequest(network: NetworkSnapshot) {
  const junctions: JunctionData[] = network.junctions.map((j: Junction) => ({
    id: j.id,
    name: j.name,
    traffic_density: j.trafficDensity,
    average_speed: j.averageSpeed,
    queue_length: j.queueLength,
    status: j.status,
  }));

  const roads: RoadData[] = network.roads.map((r: Road) => ({
    id: r.id,
    from_junction: r.from,
    to_junction: r.to,
    congestion_score: r.congestionScore,
    traffic_volume: r.trafficVolume,
    average_speed: r.averageSpeed,
  }));

  return { junctions, roads };
}

/**
 * Health check - verify backend is running
 */
export async function checkBackendHealth(): Promise<HealthCheckResponse> {
  try {
    const response = await fetch(`${BACKEND_API_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend health check failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Backend health check error:', error);
    throw error;
  }
}

/**
 * Initialize the quantum model with current network topology
 */
export async function initializeBackendModel(
  network: NetworkSnapshot,
): Promise<any> {
  try {
    const { junctions, roads } = convertNetworkToRequest(network);

    const response = await fetch(`${BACKEND_API_URL}/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ junctions, roads }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to initialize backend model: ${response.statusText}`,
      );
    }

    const data = await response.json();
    console.log(
      `Quantum circuit initialized with ${data.num_qubits} qubits (${data.num_edges} roads)`,
    );
    return data;
  } catch (error) {
    console.error('Backend model initialization error:', error);
    throw error;
  }
}

/**
 * Get traffic predictions from quantum model
 */
export async function getPredictions(
  network: NetworkSnapshot,
): Promise<NetworkPredictionResponse> {
  try {
    const { junctions, roads } = convertNetworkToRequest(network);

    const response = await fetch(`${BACKEND_API_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        junctions,
        roads,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Prediction failed: ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Prediction error:', error);
    throw error;
  }
}

/**
 * Get backend model information
 */
export async function getBackendInfo(): Promise<any> {
  try {
    const response = await fetch(`${BACKEND_API_URL}/info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get backend info: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Backend info error:', error);
    throw error;
  }
}

export default {
  checkBackendHealth,
  initializeBackendModel,
  getPredictions,
  getBackendInfo,
  BACKEND_API_URL,
};
