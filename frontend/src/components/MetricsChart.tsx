import React, { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts';

interface DataPoint {
  time_s: number;
  queue_length: number;
  avg_delay_s: number;
  fuel_L: number;
  co2_kg: number;
}

interface MetricsChartProps {
  metric?: 'queue_length' | 'avg_delay_s' | 'co2_kg';
}

const METRIC_LABELS: Record<string, { label: string; unit: string }> = {
  queue_length: { label: 'Queue Length',   unit: 'vehicles' },
  avg_delay_s:  { label: 'Avg Delay',      unit: 'seconds'  },
  co2_kg:       { label: 'CO₂ Emitted',    unit: 'kg'       },
};

const MetricsChart: React.FC<MetricsChartProps> = ({ metric = 'queue_length' }) => {
  const [baseline,  setBaseline]  = useState<DataPoint[]>([]);
  const [optimized, setOptimized] = useState<DataPoint[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [activeMetric, setActiveMetric] = useState(metric);

  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch('http://localhost:5000/api/compare');
      const data = await res.json();
      setBaseline(data.baseline);
      setOptimized(data.optimized);
      setLoading(false);
    } catch { /* backend might not be ready */ }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Merge into chart format
  const chartData = baseline.map((b, i) => ({
    time_s:    b.time_s,
    baseline:  b[activeMetric as keyof DataPoint] as number,
    optimized: (optimized[i]?.[activeMetric as keyof DataPoint] ?? 0) as number,
  }));

  const { label, unit } = METRIC_LABELS[activeMetric];

  const CustomTooltip = ({ active, payload, label: l }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs shadow-xl">
        <p className="text-gray-400 mb-1">t = {l}s</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name === 'baseline' ? '⊗ Fixed' : '✦ GreenSync'}: {p.value.toFixed(1)} {unit}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">{label} Over Time</h3>
          <p className="text-xs text-gray-500 mt-0.5">300-second corridor simulation · 8 intersections</p>
        </div>
        {/* Metric Tabs */}
        <div className="flex gap-1">
          {Object.entries(METRIC_LABELS).map(([key, { label: lbl }]) => (
            <button
              key={key}
              onClick={() => setActiveMetric(key as typeof activeMetric)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                activeMetric === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
          Loading simulation data...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time_s"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              tickFormatter={(v) => `${v}s`}
              stroke="#374151"
            />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} stroke="#374151" />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(v) => v === 'baseline' ? '⊗ Fixed Timing' : '✦ GreenSync AI'}
              wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }}
            />
            {/* Worst-case congestion zone */}
            <ReferenceLine x={120} stroke="#f59e0b" strokeDasharray="4 2" label={{
              value: '⚠ Congestion', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight'
            }} />
            <ReferenceLine x={195} stroke="#f59e0b" strokeDasharray="4 2" />
            <Line
              type="monotone" dataKey="baseline"
              stroke="#ef4444" strokeWidth={2} dot={false}
              strokeDasharray="5 3"
            />
            <Line
              type="monotone" dataKey="optimized"
              stroke="#22c55e" strokeWidth={2.5} dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default MetricsChart;
