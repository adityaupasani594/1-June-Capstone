import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useTrafficStore } from '../../store/trafficStore';

export function PredictionTicker() {
  const predictions = useTrafficStore((state) => state.network.predictions);
  const looped = useMemo(() => [...predictions, ...predictions], [predictions]);

  return (
    <div className="glass-panel absolute bottom-4 left-4 right-4 z-10 overflow-hidden rounded-2xl border border-slate-800/80">
      <div className="flex items-center border-b border-slate-800/80 bg-slate-950/65 px-4 py-2">
        <div className="mr-3 h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_0_6px_rgba(251,191,36,0.08)]" />
        <div className="text-[0.68rem] uppercase tracking-[0.34em] text-slate-500">Prediction ticker</div>
      </div>
      <div className="relative overflow-hidden py-3">
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="flex w-max items-center gap-3 px-4"
        >
          {looped.map((item, index) => (
            <div key={`${item.id}-${index}`} className="flex min-w-[320px] items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                {item.etaMinutes}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-100">{item.message}</div>
                <div className="text-xs text-slate-500">{item.district}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
