export type TrafficState = 'free' | 'moderate' | 'heavy' | 'severe';
export type WeatherState = 'sunny' | 'cloudy' | 'rain' | 'storm';
export type DashboardSection =
  | 'overview'
  | 'traffic-network'
  | 'incidents'
  | 'weather'
  | 'predictions'
  | 'cameras'
  | 'reports'
  | 'settings';

export interface District {
  id: string;
  name: string;
  center: [number, number];
  bounds: [number, number, number, number];
  utilization: number;
}

export interface Junction {
  id: string;
  name: string;
  district: string;
  coordinates: [number, number];
  trafficDensity: number;
  averageSpeed: number;
  queueLength: number;
  status: TrafficState;
  connectedRoadIds: string[];
  trend: number[];
}

export interface Road {
  id: string;
  name: string;
  district: string;
  from: string;
  to: string;
  coordinates: [number, number][];
  trafficVolume: number;
  averageSpeed: number;
  congestionScore: number;
  state: TrafficState;
  laneCount: number;
  speedLimit: number;
  roadQuality: number;
  incidentFlag: boolean;
  flowPhase: number;
}

export interface WeatherSnapshot {
  condition: WeatherState;
  temperature: number;
  humidity: number;
  visibility: number;
  windSpeed: number;
  precipitation: number;
}

export interface AlertItem {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  district: string;
}

export interface PredictionItem {
  id: string;
  label: string;
  message: string;
  delta: number;
  etaMinutes: number;
  district: string;
}

export interface NetworkSnapshot {
  districts: District[];
  junctions: Junction[];
  roads: Road[];
  weather: WeatherSnapshot;
  alerts: AlertItem[];
  predictions: PredictionItem[];
  trafficTrend: number[];
  congestionForecast: number[];
  districtUtilization: { district: string; value: number }[];
  updatedAt: number;
}
