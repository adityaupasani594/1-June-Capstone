import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl, { Map, StyleSpecification } from 'maplibre-gl';
import { useEffect, useMemo, useRef } from 'react';
import { useTrafficStore } from '../../store/trafficStore';
import { districtGeoJSON, junctionsGeoJSON, roadsGeoJSON } from '../../services/mockTraffic';

const cityStyle: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#070B11' },
    },
  ],
};

export function TrafficMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const network = useTrafficStore((state) => state.network);
  const selectedDistrictId = useTrafficStore((state) => state.selectedDistrictId);
  const selectDistrict = useTrafficStore((state) => state.selectDistrict);
  const selectJunction = useTrafficStore((state) => state.selectJunction);
  const selectRoad = useTrafficStore((state) => state.selectRoad);

  const districtData = useMemo(() => districtGeoJSON(network.districts), [network.districts]);
  const roadsData = useMemo(() => roadsGeoJSON(network.roads), [network.roads]);
  const junctionsData = useMemo(() => junctionsGeoJSON(network.junctions), [network.junctions]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: cityStyle,
      center: [0, 0],
      zoom: 11.6,
      minZoom: 10.3,
      maxZoom: 16,
      pitch: 47,
      bearing: -18,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    map.on('load', () => {
      map.addSource('districts', { type: 'geojson', data: districtData as never });
      map.addSource('roads', { type: 'geojson', data: roadsData as never });
      map.addSource('junctions', { type: 'geojson', data: junctionsData as never });

      map.addLayer({
        id: 'district-fill',
        type: 'fill',
        source: 'districts',
        paint: {
          'fill-color': '#132033',
          'fill-opacity': ['case', ['==', ['get', 'id'], selectedDistrictId ?? ''], 0.38, 0.18],
        },
      });

      map.addLayer({
        id: 'district-outline',
        type: 'line',
        source: 'districts',
        paint: {
          'line-color': '#314155',
          'line-width': 1,
        },
      });

      map.addLayer({
        id: 'roads-base',
        type: 'line',
        source: 'roads',
        paint: {
          'line-color': ['case', ['==', ['get', 'state'], 'free'], '#22c55e', ['==', ['get', 'state'], 'moderate'], '#eab308', ['==', ['get', 'state'], 'heavy'], '#f97316', '#ef4444'],
          'line-width': ['interpolate', ['linear'], ['get', 'congestionScore'], 0.1, 1.5, 0.5, 2.5, 0.9, 4.2],
          'line-opacity': 0.85,
        },
      });

      map.addLayer({
        id: 'roads-flow',
        type: 'line',
        source: 'roads',
        paint: {
          'line-color': '#e2e8f0',
          'line-width': ['interpolate', ['linear'], ['get', 'congestionScore'], 0.1, 1, 0.5, 1.8, 0.9, 2.6],
          'line-opacity': 0.4,
          'line-dasharray': [0.8, 2.2],
        },
      });

      map.addLayer({
        id: 'junction-points',
        type: 'circle',
        source: 'junctions',
        paint: {
          'circle-color': ['case', ['==', ['get', 'status'], 'free'], '#22c55e', ['==', ['get', 'status'], 'moderate'], '#eab308', ['==', ['get', 'status'], 'heavy'], '#f97316', '#ef4444'],
          'circle-radius': ['interpolate', ['linear'], ['get', 'trafficDensity'], 0.1, 4.8, 0.5, 7.6, 0.9, 10.8],
          'circle-stroke-color': '#dbeafe',
          'circle-stroke-width': 1.2,
          'circle-opacity': 0.97,
          'circle-pitch-alignment': 'viewport',
        },
      });

      map.addLayer({
        id: 'junction-halo',
        type: 'circle',
        source: 'junctions',
        paint: {
          'circle-color': '#cbd5e1',
          'circle-radius': ['interpolate', ['linear'], ['get', 'trafficDensity'], 0.1, 8, 0.5, 11, 0.9, 14],
          'circle-opacity': 0.14,
          'circle-blur': 0.7,
        },
      }, 'junction-points');

      map.addLayer({
        id: 'junction-labels',
        type: 'symbol',
        source: 'junctions',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 10,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#cbd5e1',
          'text-halo-color': '#070B11',
          'text-halo-width': 1.2,
        },
      });

      map.fitBounds([
        [-0.12, -0.1],
        [0.12, 0.14],
      ], { padding: 45, duration: 0 });

      const onDistrictClick = (event: maplibregl.MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        if (!feature?.properties) return;
        selectDistrict(String(feature.properties.id));
      };

      const onRoadClick = (event: maplibregl.MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        if (!feature?.properties) return;
        selectRoad(String(feature.properties.id));
      };

      const onJunctionClick = (event: maplibregl.MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        if (!feature?.properties) return;
        selectJunction(String(feature.properties.id));
      };

      map.on('click', 'district-fill', onDistrictClick);
      map.on('click', 'roads-base', onRoadClick);
      map.on('click', 'junction-points', onJunctionClick);

      const interactiveLayers = ['district-fill', 'roads-base', 'junction-points'];
      interactiveLayers.forEach((layerId) => {
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
        });
      });

      const animate = () => {
        const pulse = (Math.sin(Date.now() / 650) + 1) / 2;
        if (map.getLayer('roads-flow')) {
          map.setPaintProperty('roads-flow', 'line-opacity', 0.26 + pulse * 0.34);
          map.setPaintProperty('roads-flow', 'line-dasharray', [0.8, 1.8 + pulse * 2.8]);
        }
        animationFrameRef.current = window.requestAnimationFrame(animate);
      };

      animate();
    });

    mapRef.current = map;

    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      map.remove();
      mapRef.current = null;
    };
  }, [selectDistrict, selectJunction, selectRoad]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const districtsSource = map.getSource('districts') as maplibregl.GeoJSONSource | undefined;
    const roadsSource = map.getSource('roads') as maplibregl.GeoJSONSource | undefined;
    const junctionsSource = map.getSource('junctions') as maplibregl.GeoJSONSource | undefined;

    districtsSource?.setData(districtData as never);
    roadsSource?.setData(roadsData as never);
    junctionsSource?.setData(junctionsData as never);

    if (map.getLayer('district-fill')) {
      map.setPaintProperty('district-fill', 'fill-opacity', ['case', ['==', ['get', 'id'], selectedDistrictId ?? ''], 0.38, 0.18]);
    }
  }, [districtData, junctionsData, roadsData, selectedDistrictId]);

  return <div ref={containerRef} className="maplibre-container h-full min-h-[720px] rounded-[28px] border border-slate-800/80 shadow-panel" />;
}
