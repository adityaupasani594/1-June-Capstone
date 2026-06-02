import { useTrafficSimulation } from './hooks/useTrafficSimulation';
import { DashboardPage } from './pages/DashboardPage';

export default function App() {
  useTrafficSimulation();

  return <DashboardPage />;
}