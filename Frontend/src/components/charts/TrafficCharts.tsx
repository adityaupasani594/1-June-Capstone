import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from 'recharts';
import { useTrafficStore } from '../../store/trafficStore';

export function TrafficCharts() {
  const network = useTrafficStore((state) => state.network);

  const trafficData = network.trafficTrend.map((value, index) => ({
    name: `T${index + 1}`,
    traffic: value,
    forecast: network.congestionForecast[index],
  }));

  return (
    <section className="space-y-4">
      <div className="glass-panel rounded-3xl border border-slate-800/80 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[0.68rem] uppercase tracking-[0.34em] text-slate-500">Traffic trend</div>
            <div className="text-lg font-semibold text-slate-50">Citywide movement index</div>
          </div>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trafficData}>
              <defs>
                <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0b1322', border: '1px solid rgba(148,163,184,0.15)', color: '#e2e8f0' }} />
              <Area type="monotone" dataKey="traffic" stroke="#38bdf8" fill="url(#trafficGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-panel rounded-3xl border border-slate-800/80 p-4">
          <div className="mb-3 text-[0.68rem] uppercase tracking-[0.34em] text-slate-500">Forecast</div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trafficData}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0b1322', border: '1px solid rgba(148,163,184,0.15)', color: '#e2e8f0' }} />
                <Line type="monotone" dataKey="forecast" stroke="#f59e0b" strokeWidth={2.2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-3xl border border-slate-800/80 p-4">
          <div className="mb-3 text-[0.68rem] uppercase tracking-[0.34em] text-slate-500">District load</div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={network.districtUtilization}>
                <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="district" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0b1322', border: '1px solid rgba(148,163,184,0.15)', color: '#e2e8f0' }} />
                <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
