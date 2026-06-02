import { motion } from 'framer-motion';
import {
  BellRing,
  Building2,
  Camera,
  ChevronLeft,
  CloudSun,
  LayoutDashboard,
  MapPinned,
  Radar,
  Route,
  Settings2,
  SquareActivity,
  TrafficCone,
} from 'lucide-react';
import { useTrafficStore } from '../../store/trafficStore';
import { DashboardSection } from '../../types/traffic';

const sections: { id: DashboardSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'traffic-network', label: 'Traffic Network', icon: Route },
  { id: 'incidents', label: 'Incidents', icon: BellRing },
  { id: 'weather', label: 'Weather', icon: CloudSun },
  { id: 'predictions', label: 'Predictions', icon: Radar },
  { id: 'cameras', label: 'Cameras', icon: Camera },
  { id: 'reports', label: 'Reports', icon: SquareActivity },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

export function Sidebar() {
  const collapsed = useTrafficStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useTrafficStore((state) => state.toggleSidebar);
  const activeSection = useTrafficStore((state) => state.activeSection);
  const setActiveSection = useTrafficStore((state) => state.setActiveSection);

  return (
    <motion.aside
      animate={{ width: collapsed ? 92 : 278 }}
      transition={{ type: 'spring', stiffness: 180, damping: 24 }}
      className="glass-panel z-20 flex h-full flex-col border-r border-slate-800/70 px-3 py-4"
    >
      <div className="mb-6 flex items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700/80 bg-slate-950/80 text-slate-200 shadow-panel">
            <TrafficCone size={19} />
          </div>
          {!collapsed && (
            <div>
              <div className="text-[0.72rem] uppercase tracking-[0.34em] text-slate-500">Traffic Control Center</div>
              <div className="text-base font-semibold text-slate-100">Fictional Smart City</div>
            </div>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/70 bg-slate-950/70 text-slate-300 transition hover:border-slate-500 hover:text-white"
        >
          <ChevronLeft className={`transition ${collapsed ? 'rotate-180' : ''}`} size={16} />
        </button>
      </div>

      <nav className="space-y-1">
        {sections.map(({ id, label, icon: Icon }) => {
          const selected = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                selected
                  ? 'border-cyan-500/25 bg-cyan-500/10 text-white'
                  : 'border-transparent text-slate-400 hover:border-slate-700/80 hover:bg-slate-900/70 hover:text-slate-100'
              }`}
            >
              <Icon size={18} className={selected ? 'text-cyan-300' : 'text-slate-500 group-hover:text-slate-300'} />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="mt-auto space-y-3 rounded-3xl border border-slate-800/80 bg-slate-950/55 p-4">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-slate-500">
            <Building2 size={12} />
            Network posture
          </div>
          <div className="text-sm leading-6 text-slate-300">
            Live district telemetry, incident routing, weather impact, and forecast operations are synchronized every 5 seconds.
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-400">
            Operator grade visualization for mobility command centers.
          </div>
        </div>
      )}
    </motion.aside>
  );
}
