import { useEffect } from 'react';
import { useTrafficStore } from '../store/trafficStore';

export function useTrafficSimulation() {
  const tick = useTrafficStore((state) => state.tick);

  useEffect(() => {
    const interval = window.setInterval(() => {
      tick();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [tick]);
}
