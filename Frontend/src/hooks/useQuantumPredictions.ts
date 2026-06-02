import { useEffect, useState, useRef } from 'react';
import { useTrafficStore } from '../store/trafficStore';
import {
  getPredictions,
  initializeBackendModel,
  checkBackendHealth,
  NetworkPredictionResponse,
} from '../services/quantumBackend';

interface QuantumPredictionState {
  predictions: NetworkPredictionResponse | null;
  loading: boolean;
  error: string | null;
  backendReady: boolean;
  numQubits: number | null;
  lastUpdate: Date | null;
}

/**
 * Hook to fetch quantum predictions from the backend
 * Automatically initializes model and fetches predictions when network changes
 */
export function useQuantumPredictions() {
  const network = useTrafficStore((state) => state.network);
  const [state, setState] = useState<QuantumPredictionState>({
    predictions: null,
    loading: false,
    error: null,
    backendReady: false,
    numQubits: null,
    lastUpdate: null,
  });

  const initializeRef = useRef(false);
  const lastNetworkRef = useRef<string>('');

  // Check backend health and initialize model on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if backend is running
        const health = await checkBackendHealth();
        setState((prev) => ({
          ...prev,
          backendReady: health.status === 'healthy',
          numQubits: health.num_qubits || network.junctions.length,
        }));

        // Initialize the quantum model with current network topology
        const initResult = await initializeBackendModel(network);
        console.log('Backend model initialized:', initResult);

        // Fetch initial predictions
        const predictions = await getPredictions(network);
        setState((prev) => ({
          ...prev,
          predictions,
          lastUpdate: new Date(),
          backendReady: true,
          numQubits: predictions.num_qubits,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.warn('Backend initialization error (predictions will be disabled):', errorMessage);
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          backendReady: false,
        }));
      }
    };

    if (!initializeRef.current) {
      initializeRef.current = true;
      initialize();
    }
  }, []);

  // Fetch predictions when network changes
  useEffect(() => {
    const networkString = JSON.stringify({
      junctions: network.junctions.map((j) => j.id),
      roads: network.roads.length,
    });

    // Only fetch if network structure actually changed
    if (networkString === lastNetworkRef.current) {
      return;
    }

    lastNetworkRef.current = networkString;

    const fetchPredictions = async () => {
      if (!state.backendReady) return;

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const predictions = await getPredictions(network);
        setState((prev) => ({
          ...prev,
          predictions,
          loading: false,
          lastUpdate: new Date(),
          numQubits: predictions.num_qubits,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
        console.error('Error fetching predictions:', error);
      }
    };

    const timer = setTimeout(fetchPredictions, 500); // Debounce

    return () => clearTimeout(timer);
  }, [network, state.backendReady]);

  return state;
}

export default useQuantumPredictions;
