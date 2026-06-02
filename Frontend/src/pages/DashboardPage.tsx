import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, PanelRightClose, PanelRightOpen, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { PredictionTicker } from '../components/map/PredictionTicker';
import { TrafficMap } from '../components/map/TrafficMap';
import { JunctionDrawer } from '../components/map/JunctionDrawer';
import { IncidentFeed } from '../components/panels/IncidentFeed';
import { TrafficCharts } from '../components/charts/TrafficCharts';
import { WeatherPanel } from '../components/panels/WeatherPanel';

export function DashboardPage() {
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  return (
    <div className="flex h-full min-h-screen overflow-hidden bg-[#070B11] text-slate-100">
      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-4 p-4 pt-4">
          <section className="relative min-h-0">
            <TrafficMap />
            <PredictionTicker />
          </section>

          <motion.aside
            animate={{ width: rightPanelCollapsed ? 84 : 420 }}
            transition={{ type: 'spring', stiffness: 180, damping: 26 }}
            className="glass-panel flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-800/80"
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
              <div className={`transition ${rightPanelCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="text-[0.68rem] uppercase tracking-[0.34em] text-slate-500">Operator panel</div>
                <div className="text-sm font-medium text-slate-100">Live context, forecasts, and incidents</div>
              </div>
              <button
                onClick={() => setRightPanelCollapsed((value) => !value)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/80 text-slate-300 transition hover:border-cyan-500/30 hover:text-white"
              >
                {rightPanelCollapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {!rightPanelCollapsed ? (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pr-2"
                >
                  <WeatherPanel />
                  <JunctionDrawer />
                  <TrafficCharts />
                  <IncidentFeed />
                </motion.div>
              ) : (
                <motion.div
                  key="collapsed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-1 flex-col items-center gap-3 px-2 py-4"
                >
                  <RailBadge icon={ChevronLeft} label="Map" />
                  <RailBadge icon={ChevronRight} label="Forecast" />
                  <RailBadge icon={PanelRightClose} label="Feeds" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.aside>
        </div>
      </main>
    </div>
  );
}

function RailBadge({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex w-full flex-col items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-2 py-3 text-center">
      <Icon size={16} className="text-slate-400" />
      <div className="text-[0.62rem] uppercase tracking-[0.24em] text-slate-500">{label}</div>
    </div>
  );
}
