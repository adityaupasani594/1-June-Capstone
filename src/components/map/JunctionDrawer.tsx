import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Clock3, MapPin, Route, RouteOff, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from 'recharts';
import { useTrafficStore } from '../../store/trafficStore';
import { getStateLabel } from '../../services/mockTraffic';

export function JunctionDrawer() {
  const network = useTrafficStore((state) => state.network);
  const selectedJunctionId = useTrafficStore((state) => state.selectedJunctionId);
  const selectedRoadId = useTrafficStore((state) => state.selectedRoadId);
  const selectJunction = useTrafficStore((state) => state.selectJunction);
  const selectRoad = useTrafficStore((state) => state.selectRoad);

  const junction = network.junctions.find((item) => item.id === selectedJunctionId);
  const road = network.roads.find((item) => item.id === selectedRoadId);

  const trendData = useMemo(() => {
    if (!junction) return [];
    return junction.trend.map((value, index) => ({
      name: `T${index + 1}`,
      value: Math.round(value * 100),
    }));
  }, [junction]);

  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={junction?.id ?? road?.id ?? 'empty'}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="glass-panel rounded-3xl border border-slate-800/80 p-4"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[0.68rem] uppercase tracking-[0.34em] text-slate-500">Junction detail drawer</div>
            <div className="text-lg font-semibold text-slate-50">{junction ? junction.name : road ? road.name : 'No selection'}</div>
          </div>
          <div className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-400">
            {junction ? 'Junction' : road ? 'Road' : 'Idle'}
          </div>
        </div>

        {junction ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Metric icon={MapPin} label="Current Congestion" value={`${Math.round(junction.trafficDensity * 100)}%`} />
              <Metric icon={TrendingUp} label="Average Speed" value={`${junction.averageSpeed} km/h`} />
              <Metric icon={Clock3} label="Queue Length" value={`${junction.queueLength} vehicles`} />
              <Metric icon={Route} label="Connected Roads" value={`${junction.connectedRoadIds.length}`} />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="mb-2 text-[0.65rem] uppercase tracking-[0.28em] text-slate-500">Predicted Traffic Trend</div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <XAxis dataKey="name" hide />
                    <Tooltip contentStyle={{ background: '#0b1322', border: '1px solid rgba(148,163,184,0.15)', color: '#e2e8f0' }} />
                    <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="mb-2 text-[0.65rem] uppercase tracking-[0.28em] text-slate-500">Recent events</div>
              <div className="space-y-2 text-sm text-slate-300">
                {network.alerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="flex items-start gap-2">
                    <ArrowRight size={14} className="mt-1 text-slate-500" />
                    <span>{alert.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : road ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Metric icon={MapPin} label="Congestion Score" value={`${Math.round(road.congestionScore * 100)}%`} />
              <Metric icon={TrendingUp} label="Average Speed" value={`${road.averageSpeed} km/h`} />
              <Metric icon={Clock3} label="Traffic Volume" value={`${road.trafficVolume}`} />
              <Metric icon={RouteOff} label="Status" value={getStateLabel(road.state)} />
            </div>
            <button
              onClick={() => selectJunction(road.from)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-left text-sm text-slate-300 transition hover:border-cyan-500/30 hover:text-white"
            >
              Jump to source junction
            </button>
            <button
              onClick={() => selectRoad(null)}
              className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-left text-sm text-slate-300 transition hover:border-slate-700 hover:text-white"
            >
              Clear road selection
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm leading-6 text-slate-400">
            Select a junction on the map to inspect congestion, queue length, connected roads, and the live forecast trend.
          </div>
        )}
      </motion.section>
    </AnimatePresence>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-3">
      <div className="mb-2 flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.28em] text-slate-500">
        <Icon size={12} />
        {label}
      </div>
      <div className="text-lg font-semibold text-slate-100">{value}</div>
    </div>
  );
}
