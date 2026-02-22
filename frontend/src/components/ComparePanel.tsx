import React, { useState, useCallback, useEffect } from 'react';

interface Summary {
  queue_reduction_pct: number;
  delay_reduction_pct: number;
  fuel_saved_L: number;
  co2_saved_kg: number;
  baseline_final_queue: number;
  optimized_final_queue: number;
}

interface ComparisonData {
  summary: Summary;
  corridor: { id: string; name: string }[];
}

const ComparePanel: React.FC = () => {
  const [data,    setData]    = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [ran,     setRan]     = useState(false);

  const runScenario = useCallback(async () => {
    setLoading(true);
    try {
      // Force refresh
      const res  = await fetch('http://localhost:5000/api/compare?refresh=1');
      const json = await res.json();
      setData(json);
      setRan(true);
    } catch {
      // backend not available
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load on mount (no-refresh, uses cache)
  useEffect(() => {
    fetch('http://localhost:5000/api/compare')
      .then(r => r.json())
      .then(json => { setData(json); setRan(true); })
      .catch(() => {});
  }, []);

  const s = data?.summary;

  return (
    <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="text-orange-400">⚡</span> Optimization Results
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {data?.corridor?.length ?? 8}-intersection corridor · 300s simulation
          </p>
        </div>
        <button
          onClick={runScenario}
          disabled={loading}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            loading
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg'
          }`}
        >
          {loading ? (
            <><span className="animate-spin">⟳</span> Running...</>
          ) : (
            <>▶ Run Scenario</>
          )}
        </button>
      </div>

      {!ran ? (
        <div className="flex items-center justify-center h-28 text-gray-500 text-sm">
          Click "Run Scenario" to simulate the corridor
        </div>
      ) : (
        <div className="space-y-3">
          {/* Before / After queue */}
          <div className="grid grid-cols-2 gap-3">
            <StatBox
              label="Fixed Timing Queue"
              value={s?.baseline_final_queue?.toFixed(1) ?? '—'}
              unit="vehicles"
              color="text-red-400"
              bg="bg-red-900/20 border-red-800/40"
            />
            <StatBox
              label="GreenSync Queue"
              value={s?.optimized_final_queue?.toFixed(1) ?? '—'}
              unit="vehicles"
              color="text-green-400"
              bg="bg-green-900/20 border-green-800/40"
            />
          </div>

          {/* Reduction KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <ReductionBadge label="Queue Reduced"   value={s?.queue_reduction_pct} unit="%" />
            <ReductionBadge label="Delay Reduced"   value={s?.delay_reduction_pct} unit="%" />
            <ReductionBadge label="Fuel Saved"      value={s?.fuel_saved_L}        unit="L/hr" color="text-blue-400" />
            <ReductionBadge label="CO₂ Saved"       value={s?.co2_saved_kg}        unit="kg/hr" color="text-emerald-400" />
          </div>

          {/* Worst-case note */}
          <div className="mt-2 text-xs text-amber-500/80 flex items-center gap-1.5 bg-amber-900/10 border border-amber-800/20 rounded-lg px-3 py-2">
            <span>⚠</span>
            <span>Includes worst-case surge at <strong>t=120–180s</strong> (40% higher traffic)</span>
          </div>
        </div>
      )}
    </div>
  );
};

const StatBox = ({ label, value, unit, color, bg }: {
  label: string; value: string; unit: string; color: string; bg: string;
}) => (
  <div className={`rounded-lg px-3 py-2.5 border ${bg}`}>
    <div className="text-xs text-gray-400 mb-1">{label}</div>
    <div className="flex items-baseline gap-1">
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-gray-500">{unit}</span>
    </div>
  </div>
);

const ReductionBadge = ({ label, value, unit, color = 'text-green-400' }: {
  label: string; value: number | undefined; unit: string; color?: string;
}) => (
  <div className="bg-gray-900/60 rounded-lg px-3 py-2 flex items-center justify-between">
    <span className="text-xs text-gray-400">{label}</span>
    <span className={`text-sm font-bold ${color}`}>
      {value !== undefined ? `+${value.toFixed(1)} ${unit}` : '—'}
    </span>
  </div>
);

export default ComparePanel;
