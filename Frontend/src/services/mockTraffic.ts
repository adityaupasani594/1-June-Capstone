import {
  AlertItem,
  District,
  Junction,
  NetworkSnapshot,
  PredictionItem,
  Road,
  TrafficState,
  WeatherSnapshot,
  WeatherState,
} from '../types/traffic';

const districtNames = [
  'Northgate',
  'Downtown',
  'Midtown',
  'Westpark',
  'Riverfront',
  'Lakeview',
  'Airport District',
  'Industrial Zone',
];

const districtGrid = [
  { bounds: [-0.12, 0.06, -0.04, 0.14], center: [-0.08, 0.1] },
  { bounds: [-0.04, 0.06, 0.04, 0.14], center: [0, 0.1] },
  { bounds: [0.04, 0.06, 0.12, 0.14], center: [0.08, 0.1] },
  { bounds: [-0.12, -0.02, -0.04, 0.06], center: [-0.08, 0.02] },
  { bounds: [-0.04, -0.02, 0.04, 0.06], center: [0, 0.02] },
  { bounds: [0.04, -0.02, 0.12, 0.06], center: [0.08, 0.02] },
  { bounds: [-0.12, -0.1, -0.04, -0.02], center: [-0.08, -0.06] },
  { bounds: [-0.04, -0.1, 0.04, -0.02], center: [0, -0.06] },
];

const districtPosition = new Map(
  districtNames.map((name, index) => [name, { row: Math.floor(index / 3), col: index % 3 }]),
);
const weatherStates: WeatherState[] = ['sunny', 'cloudy', 'rain', 'storm'];

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function trafficStateFromScore(score: number): TrafficState {
  if (score < 0.28) return 'free';
  if (score < 0.5) return 'moderate';
  if (score < 0.72) return 'heavy';
  return 'severe';
}

function createDistricts(): District[] {
  return districtNames.map((name, index): District => ({
    id: `district-${index + 1}`,
    name,
    center: districtGrid[index].center as [number, number],
    bounds: districtGrid[index].bounds as [number, number, number, number],
    utilization: 0.35 + index * 0.045,
  }));
}

function createJunctions(districts: District[], random: () => number): Junction[] {
  const junctions: Junction[] = [];
  let counter = 1;

  districts.forEach((district, districtIndex) => {
    const [minX, minY, maxX, maxY] = district.bounds;
    const rows = 4 + (districtIndex % 2);
    const cols = 3 + ((districtIndex + 1) % 2);

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = minX + ((col + 1) / (cols + 1)) * (maxX - minX);
        const y = minY + ((row + 1) / (rows + 1)) * (maxY - minY);
        const density = clamp(0.18 + random() * 0.7 + districtIndex * 0.015, 0.05, 0.96);

        junctions.push({
          id: `J${String(counter).padStart(3, '0')}`,
          name: `${district.name} Junction ${counter}`,
          district: district.name,
          coordinates: [x, y],
          trafficDensity: density,
          averageSpeed: Math.round((55 - density * 32 + random() * 6) * 10) / 10,
          queueLength: Math.round(2 + density * 26 + random() * 5),
          status: trafficStateFromScore(density),
          connectedRoadIds: [],
          trend: Array.from({ length: 8 }, () => clamp(density + (random() - 0.5) * 0.18, 0.05, 0.98)),
        });
        counter += 1;
      }
    }
  });

  return junctions.slice(0, 100);
}

function createRoads(junctions: Junction[], random: () => number): Road[] {
  const roads: Road[] = [];
  const usedPairs = new Set<string>();
  const names = ['Corridor', 'Boulevard', 'Expressway', 'Connector', 'Avenue', 'Ring'];

  const distanceSquared = (left: Junction, right: Junction) => {
    const dx = left.coordinates[0] - right.coordinates[0];
    const dy = left.coordinates[1] - right.coordinates[1];
    return dx * dx + dy * dy;
  };

  const addRoad = (from: Junction, to: Junction, labelIndex: number, crossDistrict = false) => {
    const pairKey = [from.id, to.id].sort().join('::');
    if (from.id === to.id || usedPairs.has(pairKey)) return false;

    usedPairs.add(pairKey);
    const baseScore = (from.trafficDensity + to.trafficDensity) / 2;
    const trafficScore = clamp(baseScore + random() * 0.1, 0.05, 0.94);

    const road: Road = {
      id: `R${String(roads.length + 1).padStart(3, '0')}`,
      name: `${from.district} ${crossDistrict ? 'Connector' : names[labelIndex % names.length]} ${roads.length + 1}`,
      district: from.district,
      from: from.id,
      to: to.id,
      coordinates: [from.coordinates, to.coordinates],
      trafficVolume: Math.round(260 + trafficScore * 1250),
      averageSpeed: Math.round((63 - trafficScore * 30 + random() * 3) * 10) / 10,
      congestionScore: clamp(trafficScore + random() * 0.08, 0.05, 0.98),
      state: trafficStateFromScore(trafficScore),
      laneCount: crossDistrict ? 3 + Math.floor(random() * 2) : 2 + Math.floor(random() * 2),
      speedLimit: crossDistrict ? 45 + Math.floor(random() * 20) : 30 + Math.floor(random() * 20),
      roadQuality: clamp(0.5 + random() * 0.45, 0, 1),
      incidentFlag: random() > 0.93,
      flowPhase: random(),
    };

    roads.push(road);
    from.connectedRoadIds.push(road.id);
    to.connectedRoadIds.push(road.id);
    return true;
  };

  junctions.forEach((junction, index) => {
    const sameDistrictLinks = junctions
      .filter((candidate) => candidate.district === junction.district && candidate.id !== junction.id)
      .sort((left, right) => distanceSquared(junction, left) - distanceSquared(junction, right))
      .slice(0, 2);

    sameDistrictLinks.forEach((candidate, candidateIndex) => {
      addRoad(junction, candidate, index + candidateIndex);
    });

    const crossDistrictLink = junctions
      .filter((candidate) => candidate.district !== junction.district)
      .sort((left, right) => distanceSquared(junction, left) - distanceSquared(junction, right))
      .slice(0, 1);

    crossDistrictLink.forEach((candidate) => {
      addRoad(junction, candidate, index + 3, true);
    });
  });

  for (let index = 0; roads.length < 120 && index < junctions.length; index += 1) {
    const from = junctions[index];
    const to = junctions[(index + 11) % junctions.length];
    addRoad(from, to, index + roads.length, true);
  }

  return roads;
}

function createWeather(random: () => number): WeatherSnapshot {
  const condition = weatherStates[Math.floor(random() * weatherStates.length)];
  return {
    condition,
    temperature: Math.round((condition === 'storm' ? 17 : condition === 'rain' ? 19 : condition === 'cloudy' ? 23 : 28) + random() * 3),
    humidity: Math.round(clamp((condition === 'storm' ? 82 : condition === 'rain' ? 76 : condition === 'cloudy' ? 61 : 48) + random() * 8, 30, 98)),
    visibility: Math.round((condition === 'storm' ? 4 : condition === 'rain' ? 6 : condition === 'cloudy' ? 10 : 14) * 10) / 10,
    windSpeed: Math.round((condition === 'storm' ? 34 : condition === 'rain' ? 18 : condition === 'cloudy' ? 11 : 7) + random() * 4),
    precipitation: Math.round((condition === 'storm' ? 14 : condition === 'rain' ? 8 : condition === 'cloudy' ? 2 : 0) + random() * 2),
  };
}

function buildAlerts(roads: Road[], random: () => number): AlertItem[] {
  return roads
    .filter((road) => road.incidentFlag || road.state === 'severe' || road.state === 'heavy')
    .slice(0, 6)
    .map((road, index) => ({
      id: `alert-${road.id}-${index}`,
      severity: road.incidentFlag ? 'critical' : road.state === 'severe' ? 'warning' : 'info',
      title: road.incidentFlag ? 'Incident reported' : 'Slow traffic build-up',
      message: `${road.name} shows ${road.state} conditions with ${Math.round(road.congestionScore * 100)}% congestion.`,
      timestamp: `${Math.floor(8 + random() * 10)}:${String(Math.floor(random() * 60)).padStart(2, '0')}`,
      district: road.district,
    }));
}

function buildPredictions(junctions: Junction[], roads: Road[], random: () => number): PredictionItem[] {
  const rankedJunctions = [...junctions].sort((left, right) => right.trafficDensity - left.trafficDensity).slice(0, 5);
  const rankedRoads = [...roads].sort((left, right) => right.congestionScore - left.congestionScore).slice(0, 5);

  return [
    ...rankedJunctions.map((junction, index) => ({
      id: `pred-j-${junction.id}`,
      label: junction.name,
      message: `${junction.name} expected congestion increase +${Math.round((junction.trafficDensity * 28 + random() * 8) * 10) / 10}% in ${10 + index * 5} min`,
      delta: Math.round((junction.trafficDensity * 28 + random() * 8) * 10) / 10,
      etaMinutes: 10 + index * 5,
      district: junction.district,
    })),
    ...rankedRoads.map((road, index) => ({
      id: `pred-r-${road.id}`,
      label: road.name,
      message: `${road.name} projected delay +${Math.round((road.congestionScore * 12 + random() * 4) * 10) / 10} min`,
      delta: Math.round((road.congestionScore * 12 + random() * 4) * 10) / 10,
      etaMinutes: 15 + index * 4,
      district: road.district,
    })),
  ];
}

export function createMockNetwork(seed = 1031): NetworkSnapshot {
  const random = mulberry32(seed);
  const districts = createDistricts();
  const junctions = createJunctions(districts, random);
  const roads = createRoads(junctions, random);
  const weather = createWeather(random);
  const alerts = buildAlerts(roads, random);
  const predictions = buildPredictions(junctions, roads, random);
  const trafficTrend = Array.from({ length: 12 }, (_, index) => 48 + Math.sin(index / 2.2) * 9 + random() * 6);
  const congestionForecast = Array.from({ length: 12 }, (_, index) => 35 + index * 2.6 + random() * 4);
  const districtUtilization = districts.map((district) => ({
    district: district.name,
    value: Math.round((district.utilization + random() * 0.22) * 100),
  }));

  return {
    districts,
    junctions,
    roads,
    weather,
    alerts,
    predictions,
    trafficTrend,
    congestionForecast,
    districtUtilization,
    updatedAt: Date.now(),
  };
}

export function advanceMockNetwork(previous: NetworkSnapshot): NetworkSnapshot {
  const random = mulberry32(previous.updatedAt % 9973 + 41);
  const weather = createWeather(random);
  const weatherImpact = weather.condition === 'storm' ? 0.22 : weather.condition === 'rain' ? 0.15 : weather.condition === 'cloudy' ? 0.07 : 0;

  const junctions = previous.junctions.map((junction) => {
    const nextDensity = clamp(junction.trafficDensity + (random() - 0.45) * 0.11 + weatherImpact, 0.05, 0.99);
    return {
      ...junction,
      trafficDensity: nextDensity,
      averageSpeed: Math.round((58 - nextDensity * 31 - weatherImpact * 18 + random() * 5) * 10) / 10,
      queueLength: Math.max(0, Math.round(junction.queueLength + (nextDensity - junction.trafficDensity) * 12 + random() * 3)),
      status: trafficStateFromScore(nextDensity),
      trend: [...junction.trend.slice(1), nextDensity],
    };
  });

  const junctionLookup = new Map(junctions.map((junction) => [junction.id, junction]));

  const roads = previous.roads.map((road) => {
    const from = junctionLookup.get(road.from)!;
    const to = junctionLookup.get(road.to)!;
    const score = clamp((from.trafficDensity + to.trafficDensity) / 2 + weatherImpact + (random() - 0.4) * 0.08, 0.04, 0.99);
    const state = trafficStateFromScore(score);

    return {
      ...road,
      trafficVolume: Math.round(280 + score * 1200),
      averageSpeed: Math.round((61 - score * 37 - weatherImpact * 10 + random() * 4) * 10) / 10,
      congestionScore: score,
      state,
      roadQuality: clamp(road.roadQuality + (random() - 0.5) * 0.05, 0.2, 1),
      incidentFlag: random() > 0.9 || (weather.condition === 'storm' && score > 0.74),
      flowPhase: (road.flowPhase + 0.16 + random() * 0.08) % 1,
    };
  });

  const alerts = buildAlerts(roads, random).slice(0, 7);
  const predictions = buildPredictions(junctions, roads, random);
  const trafficTrend = Array.from({ length: 12 }, (_, index) => {
    const anchor = junctions[index % junctions.length].trafficDensity * 100;
    return Math.round((anchor * 0.56 + 28 + Math.sin((previous.updatedAt / 1000 + index) / 5) * 4) * 10) / 10;
  });
  const congestionForecast = Array.from({ length: 12 }, (_, index) => {
    const base = 32 + index * 2.3 + weatherImpact * 36;
    return Math.round((base + Math.sin(index / 1.8 + previous.updatedAt / 20000) * 3) * 10) / 10;
  });
  const districtUtilization = previous.districts.map((district) => {
    const relatedJunctions = junctions.filter((junction) => junction.district === district.name);
    const avg = relatedJunctions.reduce((sum, junction) => sum + junction.trafficDensity, 0) / relatedJunctions.length;
    return { district: district.name, value: Math.round(avg * 100) };
  });

  return {
    districts: previous.districts.map((district, index) => ({
      ...district,
      utilization: clamp(districtUtilization[index].value / 100, 0.12, 0.98),
    })),
    junctions,
    roads,
    weather,
    alerts,
    predictions,
    trafficTrend,
    congestionForecast,
    districtUtilization,
    updatedAt: Date.now(),
  };
}

export function getRoadColor(state: TrafficState) {
  switch (state) {
    case 'free':
      return '#22c55e';
    case 'moderate':
      return '#eab308';
    case 'heavy':
      return '#f97316';
    case 'severe':
      return '#ef4444';
  }
}

export function getStateLabel(state: TrafficState) {
  return {
    free: 'Free Flow',
    moderate: 'Moderate',
    heavy: 'Heavy',
    severe: 'Severe Congestion',
  }[state];
}

export function districtGeoJSON(districts: District[]) {
  return {
    type: 'FeatureCollection',
    features: districts.map((district, index) => ({
      type: 'Feature',
      id: district.id,
      properties: {
        id: district.id,
        name: district.name,
        utilization: district.utilization,
        rank: index + 1,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [district.bounds[0], district.bounds[1]],
          [district.bounds[2], district.bounds[1]],
          [district.bounds[2], district.bounds[3]],
          [district.bounds[0], district.bounds[3]],
          [district.bounds[0], district.bounds[1]],
        ]],
      },
    })),
  };
}

export function roadsGeoJSON(roads: Road[]) {
  return {
    type: 'FeatureCollection',
    features: roads.map((road) => ({
      type: 'Feature',
      id: road.id,
      properties: {
        id: road.id,
        name: road.name,
        district: road.district,
        state: road.state,
        trafficVolume: road.trafficVolume,
        averageSpeed: road.averageSpeed,
        congestionScore: road.congestionScore,
        incidentFlag: road.incidentFlag,
        flowPhase: road.flowPhase,
      },
      geometry: {
        type: 'LineString',
        coordinates: road.coordinates,
      },
    })),
  };
}

export function junctionsGeoJSON(junctions: Junction[]) {
  return {
    type: 'FeatureCollection',
    features: junctions.map((junction) => ({
      type: 'Feature',
      id: junction.id,
      properties: {
        id: junction.id,
        name: junction.name,
        district: junction.district,
        trafficDensity: junction.trafficDensity,
        averageSpeed: junction.averageSpeed,
        queueLength: junction.queueLength,
        status: junction.status,
      },
      geometry: {
        type: 'Point',
        coordinates: junction.coordinates,
      },
    })),
  };
}

export function createGaugeSeries(network: NetworkSnapshot) {
  return network.roads.slice(0, 12).map((road, index) => ({
    label: road.name.split(' ').slice(-1)[0] || `R${index + 1}`,
    traffic: road.trafficVolume,
    speed: road.averageSpeed,
    congestion: Math.round(road.congestionScore * 100),
  }));
}
