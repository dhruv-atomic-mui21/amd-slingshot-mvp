import React, { useEffect, useState, useCallback } from 'react';
import {
  MapContainer, TileLayer, CircleMarker, Polyline,
  useMap, useMapEvents, Tooltip
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../services/api';

// ─── Types ──────────────────────────────────────────────────────────────────
interface CityNode {
  id: string;
  lat: number;
  lon: number;
  name: string;
}

interface Edge {
  source: string;
  target: string;
  distance: number;
}

interface LiveData {
  signals: Record<string, 'GREEN' | 'YELLOW' | 'RED'>;
  queues:  Record<string, number>;
  mode:    'SUMO' | 'MOCK';
  metrics: {
    queue_length: number;
    avg_wait_time: number;
    carbon_offset: number;
    ai_confidence: number;
  };
}

// ─── Signal Colors ───────────────────────────────────────────────────────────
const SIGNAL_COLORS: Record<string, { fill: string; border: string }> = {
  GREEN:  { fill: '#22c55e', border: '#16a34a' },
  YELLOW: { fill: '#eab308', border: '#ca8a04' },
  RED:    { fill: '#ef4444', border: '#dc2626' },
};

// ─── Map Click Handler ───────────────────────────────────────────────────────
interface ClickHandlerProps {
  nodes: CityNode[];
  onNodeClick: (node: CityNode) => void;
}
function MapClickHandler({ nodes, onNodeClick }: ClickHandlerProps) {
  useMapEvents({
    click(e) {
      // Find nearest node within 300m
      let nearest: CityNode | null = null;
      let nearestDist = Infinity;
      const clickLatLng = e.latlng;
      for (const n of nodes) {
        const d = clickLatLng.distanceTo([n.lat, n.lon]);
        if (d < nearestDist && d < 400) {
          nearestDist = d;
          nearest = n;
        }
      }
      if (nearest) onNodeClick(nearest);
    }
  });
  return null;
}

// ─── Geolocation Button ──────────────────────────────────────────────────────
interface GeoButtonProps {
  onLocate: (lat: number, lon: number) => void;
}
function GeolocationControl({ onLocate }: GeoButtonProps) {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  const handleLocate = () => {
    setLocating(true);
    map.locate({ setView: true, maxZoom: 15 });
  };

  useEffect(() => {
    map.on('locationfound', (e) => {
      setLocating(false);
      onLocate(e.latlng.lat, e.latlng.lng);
    });
    map.on('locationerror', () => setLocating(false));
    return () => { map.off('locationfound'); map.off('locationerror'); };
  }, [map, onLocate]);

  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '10px', marginRight: '10px' }}>
      <div className="leaflet-control leaflet-bar">
        <button
          onClick={handleLocate}
          title="Use My Location"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '34px', height: '34px', fontSize: '18px',
            background: locating ? '#374151' : '#1f2937',
            color: locating ? '#9ca3af' : '#60a5fa',
            border: 'none', cursor: 'pointer', borderRadius: '4px'
          }}
        >
          {locating ? '⟳' : '📍'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface DashboardMetrics {
  queueLength:  number;
  avgWaitTime:  number;
  carbonOffset: number;
  aiConfidence: number;
}

interface TrafficMapProps {
  onStatsUpdate?: (stats: DashboardMetrics) => void;
  onModeChange?:  (mode: 'SUMO' | 'MOCK') => void;
}

const TrafficMap: React.FC<TrafficMapProps> = ({ onStatsUpdate, onModeChange }) => {
  const [nodes, setNodes]     = useState<CityNode[]>([]);
  const [edges, setEdges]     = useState<Edge[]>([]);
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [startNode, setStartNode] = useState<CityNode | null>(null);
  const [endNode,   setEndNode]   = useState<CityNode | null>(null);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{ duration: number; distance: number } | null>(null);

  // Fetch static topology once
  useEffect(() => {
    api.getConfig().then(d => {
      setNodes(d.nodes);
      setEdges(d.edges);
    });
  }, []);

  // Poll live data every second
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const d: LiveData = await api.getLiveData();
        setLiveData(d);
        if (onStatsUpdate) onStatsUpdate({
          queueLength:  d.metrics.queue_length,
          avgWaitTime:  d.metrics.avg_wait_time,
          carbonOffset: d.metrics.carbon_offset,
          aiConfidence: d.metrics.ai_confidence,
        });
        if (onModeChange) onModeChange(d.mode);
      } catch { /* backend not ready yet */ }
    }, 1000);
    return () => clearInterval(interval);
  }, [onStatsUpdate, onModeChange]);

  // Find route whenever start/end change
  useEffect(() => {
    if (!startNode || !endNode) return;
    api.getRoute(startNode.id, endNode.id).then((res: any) => {
      const latlons: [number, number][] = res.path_latlon.map(
        (p: { lat: number; lon: number }) => [p.lat, p.lon] as [number, number]
      );
      setRoutePath(latlons);
      setRouteInfo({
        duration: res.estimated_duration_s,
        distance: res.estimated_distance_m
      });
    }).catch(() => {});
  }, [startNode, endNode, liveData]); // re-fires on live update for dynamic rerouting

  const handleNodeClick = useCallback((node: CityNode) => {
    if (!startNode || (startNode && endNode)) {
      setStartNode(node);
      setEndNode(null);
      setRoutePath([]);
      setRouteInfo(null);
    } else {
      setEndNode(node);
    }
  }, [startNode, endNode]);

  const handleLocate = useCallback((lat: number, lon: number) => {
    // Snap to nearest node
    let nearest: CityNode | null = null;
    let nearestDist = Infinity;
    for (const n of nodes) {
      const d = Math.hypot(lat - n.lat, lon - n.lon);
      if (d < nearestDist) { nearestDist = d; nearest = n; }
    }
    if (nearest) {
      setStartNode(nearest);
      setEndNode(null);
      setRoutePath([]);
      setRouteInfo(null);
    }
  }, [nodes]);

  // Center on the grid
  const centerLat = 23.0300 + (7 * 0.0045) / 2;
  const centerLon = 72.5400 + (8 * 0.0045) / 2;

  // Build node map for quick lookup
  const nodeMap = React.useMemo(() => {
    const m: Record<string, CityNode> = {};
    nodes.forEach(n => { m[n.id] = n; });
    return m;
  }, [nodes]);

  return (
    <div className="relative w-full h-full">
      {/* Overlay legend */}
      <div className="absolute top-3 left-3 z-[1000] bg-gray-900/90 backdrop-blur text-white px-4 py-3 rounded-xl border border-gray-700 text-xs space-y-1 shadow-xl">
        <div className="font-bold text-sm mb-2">
          {liveData?.mode === 'SUMO' ? '⚡ SUMO Live' : '🔁 AI Optimized'} Signals
        </div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Green</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span> Yellow</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Red</div>
        <hr className="border-gray-600 my-1"/>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block"></span> Start</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-purple-400 inline-block"></span> End</div>
      </div>

      {/* Route Info Panel */}
      {routeInfo && startNode && endNode && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-gray-900/90 backdrop-blur text-white px-4 py-3 rounded-xl border border-blue-500/50 text-sm shadow-xl max-w-xs">
          <div className="font-bold text-blue-400 mb-1">🛣  Best Route Found</div>
          <div className="text-gray-300">From: <span className="text-white">{startNode.name}</span></div>
          <div className="text-gray-300">To: <span className="text-white">{endNode.name}</span></div>
          <div className="mt-2 flex gap-4">
            <div>
              <div className="text-gray-500 text-xs">Distance</div>
              <div className="font-semibold">{(routeInfo.distance / 1000).toFixed(1)} km</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Est. Time</div>
              <div className="font-semibold">{Math.round(routeInfo.duration / 60)} min</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">Live rerouting active • Click to reset</div>
        </div>
      )}

      {/* Instructions */}
      {!startNode && nodes.length > 0 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-gray-900/90 backdrop-blur text-gray-300 px-4 py-2 rounded-full border border-gray-700 text-xs shadow-xl">
          Click any intersection to set your <span className="text-blue-400 font-semibold">Start</span>, then click <span className="text-purple-400 font-semibold">Destination</span>
        </div>
      )}
      {startNode && !endNode && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-gray-900/90 backdrop-blur text-gray-300 px-4 py-2 rounded-full border border-blue-500/50 text-xs shadow-xl">
          Now click your <span className="text-purple-400 font-semibold">Destination</span>
        </div>
      )}

      <MapContainer
        center={[centerLat, centerLon]}
        zoom={14}
        style={{ width: '100%', height: '100%' }}
        className="rounded-xl"
      >
        {/* Dark OSM Tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com">CARTO</a>'
        />

        <MapClickHandler nodes={nodes} onNodeClick={handleNodeClick} />
        <GeolocationControl onLocate={handleLocate} />

        {/* Edges (grid roads) */}
        {edges.map(edge => {
          const s = nodeMap[edge.source];
          const t = nodeMap[edge.target];
          if (!s || !t) return null;
          const isRoute = routePath.length > 1 &&
            routePath.some(p => p[0] === s.lat && p[1] === s.lon) &&
            routePath.some(p => p[0] === t.lat && p[1] === t.lon);
          return (
            <Polyline
              key={`${edge.source}-${edge.target}`}
              positions={[[s.lat, s.lon], [t.lat, t.lon]]}
              weight={isRoute ? 0 : 1.5}
              color="#374151"
              opacity={0.5}
            />
          );
        })}

        {/* Route path overlay */}
        {routePath.length > 1 && (
          <>
            {/* Glow layer */}
            <Polyline positions={routePath} weight={12} color="#3b82f6" opacity={0.15} />
            {/* Main route */}
            <Polyline positions={routePath} weight={5} color="#60a5fa" opacity={0.9} />
          </>
        )}

        {/* Intersection nodes */}
        {nodes.map(node => {
          const phase = liveData?.signals[node.id] ?? 'GREEN';
          const queue = liveData?.queues[node.id] ?? 0;
          const colors = SIGNAL_COLORS[phase] ?? SIGNAL_COLORS['GREEN'];
          const isStart = startNode?.id === node.id;
          const isEnd   = endNode?.id   === node.id;
          const isCongested = queue > 30;

          const fillColor  = isStart ? '#60a5fa' : isEnd ? '#a78bfa' : colors.fill;
          const borderColor = isStart ? '#3b82f6' : isEnd ? '#7c3aed' : colors.border;
          const radius = isStart || isEnd ? 10 : isCongested ? 9 : 7;

          return (
            <CircleMarker
              key={node.id}
              center={[node.lat, node.lon]}
              radius={radius}
              fillColor={fillColor}
              fillOpacity={0.85}
              color={borderColor}
              weight={2}
              eventHandlers={{ click: () => handleNodeClick(node) }}
            >
              <Tooltip sticky>
                <div className="text-xs">
                  <div className="font-bold">{node.name}</div>
                  <div>Signal: <span style={{ color: fillColor }}>{phase}</span></div>
                  <div>Queue: {queue} vehicles</div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default TrafficMap;
