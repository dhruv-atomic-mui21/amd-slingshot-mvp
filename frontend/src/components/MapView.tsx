import React, { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

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

interface MapViewProps {
  title: string;
  scenario: 'baseline' | 'optimized';
  liveData: any;
}

const MapView: React.FC<MapViewProps> = ({ title, scenario, liveData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<CityNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Fetch static topology once
  useEffect(() => {
    api.getConfig().then(data => {
      setNodes(data.nodes);
      setEdges(data.edges);
    });
  }, []);

  // Drawing Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Calculate scaling
    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;
    nodes.forEach(n => {
      minLat = Math.min(minLat, n.lat);
      maxLat = Math.max(maxLat, n.lat);
      minLon = Math.min(minLon, n.lon);
      maxLon = Math.max(maxLon, n.lon);
    });

    const padding = 20;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;

    const latRange = maxLat - minLat;
    const lonRange = maxLon - minLon;

    const project = (lat: number, lon: number) => {
      const x = padding + ((lon - minLon) / lonRange) * width;
      const y = canvas.height - (padding + ((lat - minLat) / latRange) * height);
      return { x, y };
    };

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Background
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Edges
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#374151'; // Gray-700
    
    edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      if (!source || !target) return;

      const p1 = project(source.lat, source.lon);
      const p2 = project(target.lat, target.lon);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    // Draw Nodes
    const simData = liveData?.scenarios?.[scenario];
    
    nodes.forEach(node => {
      const p = project(node.lat, node.lon);
      
      let color = '#9ca3af'; // Gray default
      if (simData && simData.signals) {
        const phase = simData.signals[node.id];
        if (phase === 'GREEN') color = '#22c55e';
        else if (phase === 'YELLOW') color = '#eab308';
        else if (phase === 'RED') color = '#ef4444';
      }

      // Draw Outer Glow for congested nodes
      if (simData && simData.queues) {
          const q = simData.queues[node.id] || 0;
          if (q > 30) {
              ctx.beginPath();
              ctx.arc(p.x, p.y, 8 + Math.min(q/2, 20), 0, Math.PI * 2);
              ctx.fillStyle = `rgba(239, 68, 68, 0.4)`; // Red glow
              ctx.fill();
          } else if (q > 15) {
              ctx.beginPath();
              ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(234, 179, 8, 0.3)`; // Yellow glow
              ctx.fill();
          }
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
    
  }, [nodes, edges, liveData, scenario]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
        const wrap = canvasRef.current?.parentElement;
        if (wrap && canvasRef.current) {
            canvasRef.current.width = wrap.clientWidth;
            canvasRef.current.height = wrap.clientHeight;
        }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-xl overflow-hidden shadow-xl border border-gray-800">
      <div className="absolute top-3 left-3 z-10 bg-gray-900/80 backdrop-blur px-3 py-2 rounded-lg border border-gray-700">
        <h2 className={`text-sm font-bold ${scenario === 'optimized' ? 'text-green-400' : 'text-gray-300'}`}>
            {title}
        </h2>
        {liveData?.scenarios?.[scenario] && (
            <div className="mt-1 text-xs text-gray-500 flex flex-col gap-1">
                <div>Queue: <span className="text-white">{liveData.scenarios[scenario].metrics.queue_length} cars</span></div>
                <div>Avg Wait: <span className="text-white">{liveData.scenarios[scenario].metrics.avg_wait_time.toFixed(1)}s</span></div>
            </div>
        )}
      </div>
      
      <canvas 
        ref={canvasRef} 
        className="w-full h-full cursor-default inset-0 absolute"
      />
    </div>
  );
};

export default MapView;
