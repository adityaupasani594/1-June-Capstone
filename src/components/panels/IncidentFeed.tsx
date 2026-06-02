import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { useTrafficStore } from '../../store/trafficStore';

const severityIcon = {
  info: Info,
  warning: AlertTriangle,
  critical: ShieldAlert,
};

export function IncidentFeed() {
  const alerts = useTrafficStore((state) => state.network.alerts);

  return (
    <section className="glass-panel rounded-3xl border border-slate-800/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[0.68rem] uppercase tracking-[0.34em] text-slate-500">Alert feed</div>
          <div className="text-lg font-semibold text-slate-50">Operational events</div>
        </div>
        <div className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs text-slate-400">
          {alerts.length} items
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const Icon = severityIcon[alert.severity];
          return (
            <div key={alert.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300">
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-sm font-medium text-slate-100">{alert.title}</div>
                    <div className="text-[0.65rem] uppercase tracking-[0.28em] text-slate-500">{alert.timestamp}</div>
                  </div>
                  <div className="mt-1 text-sm leading-5 text-slate-400">{alert.message}</div>
                  <div className="mt-2 text-xs text-slate-500">{alert.district}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
