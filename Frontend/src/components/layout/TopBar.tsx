import { motion } from 'framer-motion';
import { ChevronDown, ShieldAlert, Waves } from 'lucide-react';
import { useTrafficStore } from '../../store/trafficStore';

export function TopBar() {
  const network = useTrafficStore((state) => state.network);
  const districtId = useTrafficStore((state) => state.selectedDistrictId);
  const district = network.districts.find((item) => item.id === districtId);

  return (
    <header className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
      <div className="space-y-1">
        <div className="text-[0.72rem] uppercase tracking-[0.42em] text-slate-500">Mission Control</div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold text-slate-50">Traffic Control Center</h1>
          <div className="text-sm text-slate-400">Citywide movement intelligence for road operators</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="glass-panel flex items-center gap-3 rounded-2xl px-4 py-2">
          <Waves size={16} className="text-cyan-300" />
          <div>
            <div className="text-[0.68rem] uppercase tracking-[0.28em] text-slate-500">District focus</div>
            <div className="text-sm font-medium text-slate-100">{district?.name ?? 'All districts'}</div>
          </div>
          <ChevronDown size={15} className="text-slate-500" />
        </div>
        <div className="glass-panel flex items-center gap-3 rounded-2xl px-4 py-2">
          <ShieldAlert size={16} className="text-amber-300" />
          <div>
            <div className="text-[0.68rem] uppercase tracking-[0.28em] text-slate-500">Alert load</div>
            <div className="text-sm font-medium text-slate-100">{network.alerts.length} active events</div>
          </div>
        </div>
        <motion.div
          key={network.updatedAt}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-2xl px-4 py-2 text-right"
        >
          <div className="text-[0.68rem] uppercase tracking-[0.28em] text-slate-500">Updated</div>
          <div className="text-sm font-medium text-slate-100">{new Date(network.updatedAt).toLocaleTimeString()}</div>
        </motion.div>
      </div>
    </header>
  );
}
