# Frontend - Hybrid Traffic Prediction Dashboard

## Overview

A modern React + TypeScript interactive traffic management dashboard with real-time quantum-enhanced predictions.

## Technologies

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling
- **MapLibre GL**: Traffic map visualization
- **Zustand**: State management
- **PennyLane/FastAPI**: Backend integration

## Project Structure

```
src/
├── components/
│   ├── charts/
│   │   └── TrafficCharts.tsx       # Traffic data visualizations
│   ├── layout/
│   │   ├── Sidebar.tsx             # Navigation sidebar
│   │   └── TopBar.tsx              # Header with info
│   ├── map/
│   │   ├── TrafficMap.tsx          # Main map visualization
│   │   ├── JunctionDrawer.tsx      # Junction detail panel
│   │   └── PredictionTicker.tsx    # Quantum predictions display
│   └── panels/
│       ├── IncidentFeed.tsx        # Incident notifications
│       └── WeatherPanel.tsx        # Weather information
├── hooks/
│   ├── useTrafficSimulation.ts     # Traffic data simulation
│   └── useQuantumPredictions.ts    # Quantum prediction fetching (NEW)
├── pages/
│   └── DashboardPage.tsx           # Main dashboard page
├── services/
│   ├── mockTraffic.ts              # Mock traffic data generator
│   └── quantumBackend.ts           # Backend API client (NEW)
├── store/
│   └── trafficStore.ts             # Zustand state store
├── types/
│   └── traffic.ts                  # TypeScript types
├── App.tsx                          # Main app component
├── main.tsx                         # Entry point
└── index.css                        # Global styles
```

## Installation

### Prerequisites

- Node.js 16+ or higher
- npm or yarn

### Setup

1. Navigate to Frontend directory:
```bash
cd Frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (optional):
```bash
echo "REACT_APP_BACKEND_URL=http://localhost:8000" > .env
```

## Running the Development Server

```bash
npm run dev
```

Application will be available at: `http://localhost:5173`

## Building for Production

```bash
npm run build
```

Output in `dist/` directory.

## Features

### 1. Interactive Traffic Map
- Real-time junction and road visualization
- Color-coded congestion levels (green → red)
- 3D perspective view with pitch control
- Junction labels and information
- Click to select and view details

### 2. Traffic Data Display
- Junction density metrics
- Average speed information
- Queue length statistics
- Traffic state indicators (free/moderate/heavy/severe)

### 3. Quantum Predictions Integration
- **Dynamic Qubit Allocation**: Automatically adapts to junction count
- **Real-time Predictions**: Fetches from backend quantum circuit
- **Confidence Scoring**: Shows certainty of predictions
- **Automatic Updates**: Refreshes when network topology changes

### 4. Dashboard Sections
- **Overview**: Network statistics and summary
- **Traffic Charts**: Historical and current data visualization
- **Incident Feed**: Real-time incident notifications
- **Weather Panel**: Weather impact on traffic

### 5. Sidebar Navigation
- District selection
- Section switching (Overview/Charts/etc.)
- Collapsible menu for more space

## Backend Integration

### Connection Flow

1. **Service Layer** (`services/quantumBackend.ts`):
   - Provides API client functions
   - Converts frontend data to backend format
   - Handles HTTP requests/responses

2. **Custom Hook** (`hooks/useQuantumPredictions.ts`):
   - Initializes quantum model on mount
   - Fetches predictions when network changes
   - Manages loading/error states
   - Debounces requests

3. **Frontend State** (`store/trafficStore.ts`):
   - Stores network data (junctions, roads, districts)
   - Manages UI selections (selected junction, road, etc.)
   - Updates via `tick()` function

### API Endpoints Used

- `GET /health` - Check backend availability
- `POST /initialize` - Initialize quantum circuit
- `POST /predict` - Get quantum predictions
- `GET /info` - Get model configuration

## Configuration

### Environment Variables

Create `.env` file in Frontend directory:

```
VITE_BACKEND_URL=http://localhost:8000
```

Or set at build time:
```bash
VITE_BACKEND_URL=http://api.example.com npm run build
```

### Vite Configuration

File: `vite.config.ts`

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
```

### Tailwind CSS

File: `tailwind.config.ts`

Configured for:
- Dark theme (dark background)
- Custom color palette
- Responsive design

## Component Usage

### useQuantumPredictions Hook

```typescript
import { useQuantumPredictions } from '@/hooks/useQuantumPredictions';

function MyComponent() {
  const { predictions, loading, error, backendReady, numQubits } = 
    useQuantumPredictions();

  if (!backendReady) {
    return <div>Backend not available</div>;
  }

  if (loading) {
    return <div>Loading predictions...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <p>Running on {numQubits} qubits</p>
      {predictions?.predictions.map(pred => (
        <div key={pred.junction_id}>
          {pred.junction_name}: {pred.predicted_density}
        </div>
      ))}
    </div>
  );
}
```

### useTrafficStore Hook

```typescript
import { useTrafficStore } from '@/store/trafficStore';

function MyComponent() {
  const network = useTrafficStore((state) => state.network);
  const selectedJunction = useTrafficStore((state) => state.selectedJunctionId);
  const tick = useTrafficStore((state) => state.tick);

  // Update traffic every second
  useEffect(() => {
    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval);
  }, [tick]);

  return (
    <div>
      Junctions: {network.junctions.length}
      Selected: {selectedJunction}
    </div>
  );
}
```

## Network Data Structure

### Junction
```typescript
interface Junction {
  id: string;              // "J001", "J002", ...
  name: string;            // "Downtown Junction 1"
  district: string;        // "Midtown", "Northgate", ...
  coordinates: [number, number];  // [longitude, latitude]
  trafficDensity: number;  // 0.0 - 1.0
  averageSpeed: number;    // mph
  queueLength: number;     // vehicles
  status: TrafficState;    // "free" | "moderate" | "heavy" | "severe"
  connectedRoadIds: string[];
  trend: number[];         // Historical densities
}
```

### Road
```typescript
interface Road {
  id: string;              // "R001", "R002", ...
  name: string;
  district: string;
  from: string;            // Junction ID
  to: string;              // Junction ID
  coordinates: [[number, number], [number, number]]; // Start, End
  trafficVolume: number;   // vehicles/hour
  averageSpeed: number;    // mph
  congestionScore: number; // 0.0 - 1.0
  state: TrafficState;
  laneCount: number;
  speedLimit: number;
  roadQuality: number;     // 0.0 - 1.0
  incidentFlag: boolean;
  flowPhase: number;       // 0.0 - 1.0
}
```

## Styling

### Colors

Dark theme with accent colors:
- Background: `#070B11` (dark navy)
- Primary: `#0F172A` (darker navy)
- Accent: `#3B82F6` (blue)
- Success: `#22C55E` (green)
- Warning: `#EAB308` (yellow)
- Error: `#EF4444` (red)

### Responsive Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## Performance Optimization

### Memoization
- Components wrapped with `React.memo()` where appropriate
- useMemo for expensive calculations

### Virtualization
- Large lists use virtualization (if implemented)

### Lazy Loading
- Components can be code-split

### Network Requests
- Debounced prediction requests
- Caching of backend responses

## Troubleshooting

### Backend Connection Issues

**Error**: "Backend not responding"
```
Solution:
1. Verify backend is running: http://localhost:8000/health
2. Check CORS settings in backend
3. Ensure VITE_BACKEND_URL is correct
4. Check browser console for actual error
```

**Error**: "Failed to initialize backend model"
```
Solution:
1. Check junction/road data format
2. Ensure backend has required dependencies
3. Check backend logs for detailed error
4. Verify quantum circuit can handle junction count
```

### Styling Issues

**Problem**: Tailwind classes not applying
```
Solution:
1. Run: npm run build:css
2. Clear browser cache
3. Restart dev server
```

**Problem**: Dark mode not applied
```
Solution:
Check tailwind.config.ts has darkMode set correctly
```

### Build Issues

**Error**: "module not found"
```
Solution:
1. Clear node_modules: rm -rf node_modules
2. Reinstall: npm install
3. Clear Vite cache: rm -rf .vite
```

**Error**: "TypeScript errors"
```
Solution:
1. Run: npx tsc --noEmit
2. Fix type errors in affected files
3. Rebuild
```

## Development Workflow

### Adding a New Component

1. Create file in `src/components/[category]/NewComponent.tsx`
2. Define interfaces in `src/types/traffic.ts` if needed
3. Use hooks for data fetching
4. Style with Tailwind classes
5. Export from component module
6. Import and use in parent component

### Adding a New Page

1. Create file in `src/pages/NewPage.tsx`
2. Update routing in `App.tsx`
3. Update navigation in `Sidebar.tsx`

### Adding a New Hook

1. Create file in `src/hooks/useNewHook.ts`
2. Export the hook function
3. Use in components with `const data = useNewHook()`

## Testing

### Manual Testing Checklist

- [ ] Map loads and displays junctions
- [ ] Clicking junction shows details
- [ ] Traffic updates in real-time
- [ ] Backend connection initializes
- [ ] Quantum predictions display
- [ ] Sidebar navigation works
- [ ] Responsive on mobile/tablet
- [ ] No console errors

### Browser DevTools

```javascript
// In console, access store:
import { useTrafficStore } from '@/store/trafficStore';
const state = useTrafficStore.getState();
state.network  // View network data
state.tick()   // Advance simulation
```

## Deployment

### Development Build
```bash
npm run build
```

### Preview Build
```bash
npm run preview
```

### Production Deployment

Set environment variables on platform:
```
VITE_BACKEND_URL=https://api.example.com
```

Deploy `dist/` folder to static host (Netlify, Vercel, GitHub Pages, etc.)

## Performance Metrics

- **Bundle Size**: ~250KB (gzipped)
- **Initial Load**: ~1-2 seconds
- **Map Rendering**: 60 FPS
- **Prediction Update**: 100-200ms

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

Follow these guidelines:

1. Use TypeScript for all components
2. Use Tailwind for styling (no CSS files)
3. Keep components small and focused
4. Use custom hooks for logic
5. Update types as needed
6. Follow existing code style

## License

Part of capstone project.

## References

- **React Docs**: https://react.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Vite Docs**: https://vitejs.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **MapLibre GL**: https://maplibre.org/
- **Zustand**: https://github.com/pmndrs/zustand

## Support

For issues:
1. Check the main README.md in project root
2. Review console errors in browser DevTools
3. Verify backend is running and accessible
4. Check network tab for failed requests
