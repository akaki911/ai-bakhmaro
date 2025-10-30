import React from 'react';
import type { MetricEventPayload } from './types';

interface MetricsProps {
  metric: MetricEventPayload | null;
}

const formatNumber = (value: number | null | undefined, suffix = '') => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return `${Math.round(value * 100) / 100}${suffix}`;
};

const Metrics: React.FC<MetricsProps> = ({ metric }) => {
  const items = [
    { label: 'CPU', value: formatNumber(metric?.cpu, '%') },
    { label: 'Memory', value: formatNumber(metric?.mem, '%') },
    { label: 'Req Rate', value: formatNumber(metric?.reqRate, '/s') },
    { label: 'Error Rate', value: formatNumber(metric?.errorRate, '%') },
    { label: 'P95 Latency', value: formatNumber(metric?.latencyP95, 'ms') },
  ];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-5 text-sm text-slate-200 shadow-[0_25px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">Metrics</p>
      <div className="living-ai-divider my-4" aria-hidden="true" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-3 shadow-[0_15px_45px_rgba(2,6,23,0.35)]">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
            <p className="mt-2 font-jetbrains text-lg text-white">{item.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-400/80">
        {metric?.timestamp ? `Updated ${new Date(metric.timestamp).toLocaleTimeString()}` : 'Awaiting metrics.'}
      </p>
    </div>
  );
};

export default Metrics;
