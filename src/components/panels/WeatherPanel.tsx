import { Cloud, Droplets, MountainSnow, SunMedium, Wind, Zap } from 'lucide-react';
import { useTrafficStore } from '../../store/trafficStore';

const weatherIcons = {
  sunny: SunMedium,
  cloudy: Cloud,
  rain: Droplets,
  storm: Zap,
};

export function WeatherPanel() {
  const weather = useTrafficStore((state) => state.network.weather);
  const Icon = weatherIcons[weather.condition];

  const metrics = [
    { label: 'Temperature', value: `${weather.temperature}°C` },
    { label: 'Humidity', value: `${weather.humidity}%` },
    { label: 'Visibility', value: `${weather.visibility} km` },
    { label: 'Wind', value: `${weather.windSpeed} km/h` },
    { label: 'Precipitation', value: `${weather.precipitation} mm` },
  ];

  return (
    <section className="glass-panel rounded-3xl border border-slate-800/80 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[0.68rem] uppercase tracking-[0.34em] text-slate-500">Weather intelligence</div>
          <div className="mt-1 text-xl font-semibold text-slate-50">{weather.condition.toUpperCase()}</div>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/80 text-slate-100">
          <Icon size={22} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-3">
            <div className="text-[0.65rem] uppercase tracking-[0.28em] text-slate-500">{metric.label}</div>
            <div className="mt-1 text-lg font-semibold text-slate-100">{metric.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-3 text-sm text-slate-300">
        Weather conditions adjust road severity, speed decay, and forecast pressure across the entire network.
      </div>
    </section>
  );
}
