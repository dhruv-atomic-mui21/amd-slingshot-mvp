// Dashboard.tsx
import React, { useCallback, useState, memo } from 'react';
import SpatScrubber from './SpatScrubber';
import TrafficMap from './TrafficMap';
import MetricsChart from './MetricsChart';
import ComparePanel from './ComparePanel';

/* =======================
   Domain Types
======================= */
type SimMode = 'SUMO' | 'MOCK';

interface Metrics {
  queueLength: number;
  avgWaitTime: number;
  carbonOffset: number;
  aiConfidence: number;
}

/* =======================
   Stateless UI Blocks
======================= */
const DashboardHeader = memo(
  ({ simMode, lastUpdated }: { simMode: SimMode; lastUpdated: string }) => (
    <header className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-orange-600 rounded-md flex items-center justify-center font-bold text-xl">
          A
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            AMD Slingshot <span className="text-orange-500">GreenSync</span>
          </h1>
          <p className="text-xs text-gray-500 uppercase tracking-widest">
            Powered by ROCm AI
          </p>
        </div>
      </div>

      <div className="flex gap-3 text-sm text-gray-400">
        <span className="px-3 py-1 bg-gray-800 rounded-full flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          LIVE {lastUpdated}
        </span>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            simMode === 'SUMO'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          {simMode} Sim
        </span>

        <span className="px-3 py-1 bg-gray-800 rounded-full">
          56 Intersections
        </span>
      </div>
    </header>
  )
);

const KpiCard = memo(
  ({
    title,
    value,
    unit,
    accent,
    precision = 1,
  }: {
    title: string;
    value: number;
    unit: string;
    accent: string;
    precision?: number;
  }) => (
    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
      <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
        {title}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-bold ${accent}`}>
          {value.toFixed(precision)}
        </span>
        <span className="text-xs text-gray-500">{unit}</span>
      </div>
    </div>
  )
);

const KpiStrip = memo(({ metrics }: { metrics: Metrics }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
    <KpiCard
      title="Network Queue"
      value={metrics.queueLength}
      unit="cars"
      accent="text-red-400"
      precision={0}
    />
    <KpiCard
      title="Avg Wait Time"
      value={metrics.avgWaitTime}
      unit="s"
      accent="text-yellow-400"
    />
    <KpiCard
      title="Carbon Offset"
      value={metrics.carbonOffset}
      unit="tons"
      accent="text-green-400"
      precision={3}
    />
    <KpiCard
      title="AI Confidence"
      value={metrics.aiConfidence}
      unit="%"
      accent="text-blue-400"
    />
  </div>
));

/* =======================
   Dashboard Container
======================= */
const INITIAL_METRICS: Metrics = {
  queueLength: 0,
  avgWaitTime: 0,
  carbonOffset: 0,
  aiConfidence: 0,
};

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics>(INITIAL_METRICS);
  const [simMode, setSimMode] = useState<SimMode>('MOCK');
  const [lastUpdated, setLastUpdated] = useState('');

  const handleStatsUpdate = useCallback((next: Metrics) => {
    setMetrics(next);
    setLastUpdated(new Date().toLocaleTimeString());
  }, []);

  const handleModeChange = useCallback((mode: SimMode) => {
    setSimMode(mode);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-900 text-white font-sans p-4">
      <DashboardHeader simMode={simMode} lastUpdated={lastUpdated} />
      <KpiStrip metrics={metrics} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-280px)]">
        <div className="lg:col-span-2 rounded-xl overflow-hidden border border-gray-700 min-h-[500px]">
          <TrafficMap
            onStatsUpdate={handleStatsUpdate}
            onModeChange={handleModeChange}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700 flex-1">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">
              Signal Phase Timing
            </h3>
            <SpatScrubber />
            <p className="mt-3 text-xs text-gray-500">
              Real-time green/red split optimization across the network.
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700 flex flex-col gap-3">
            <h3 className="text-base font-semibold">Green Wave Mode</h3>
            <p className="text-xs text-gray-400">
              AI synchronizes signals along high-density corridors to reduce
              idling and emissions.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs text-center">
              <div className="bg-gray-900 rounded-lg p-2">
                <div className="text-gray-500">Mode</div>
                <div className="font-bold text-orange-400">
                  {simMode === 'SUMO' ? 'SUMO Live' : 'AI Mock'}
                </div>
              </div>
              <div className="bg-gray-900 rounded-lg p-2">
                <div className="text-gray-500">Routing</div>
                <div className="font-bold text-blue-400">A* Live</div>
              </div>
            </div>

            <button className="w-full bg-gradient-to-r from-green-600 to-emerald-500 py-2.5 rounded-lg font-semibold text-sm">
              Activate Optimization
            </button>
          </div>
        </aside>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <MetricsChart />
        <ComparePanel />
      </div>
    </div>
  );
};

export default Dashboard;