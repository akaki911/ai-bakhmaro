import React, { useMemo } from 'react';
import classNames from 'classnames';
import type { BrainMachineSnapshot } from '@/state/brainMachine';
import type { StatusEventPayload } from './types';

interface StatusStripProps {
  status: StatusEventPayload | null;
  connection: BrainMachineSnapshot;
  lastHeartbeatAt: number | null;
  transport?: 'sse' | 'poll';
  backpressure?: number;
}

const COLOR_CLASS: Record<BrainMachineSnapshot['color'], string> = {
  green: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.35)]',
  yellow: 'border-amber-400/60 bg-amber-500/15 text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.3)]',
  red: 'border-rose-400/60 bg-rose-500/15 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.35)]',
  purple: 'border-purple-400/60 bg-purple-500/15 text-purple-100 shadow-[0_0_20px_rgba(168,85,247,0.35)]',
  slate: 'border-white/10 bg-white/5 text-slate-200 shadow-[0_0_18px_rgba(148,163,184,0.25)]',
};

const formatDuration = (ms?: number | null) => {
  if (!ms || Number.isNaN(ms)) {
    return '—';
  }
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((segment) => String(segment).padStart(2, '0'))
    .join(':');
};

const StatusStrip: React.FC<StatusStripProps> = ({ status, connection, lastHeartbeatAt, transport = 'sse', backpressure = 0 }) => {
  const uptime = useMemo(() => {
    if (!status?.uptimeMs && status?.startedAt) {
      const started = new Date(status.startedAt).getTime();
      if (!Number.isNaN(started)) {
        return Date.now() - started;
      }
    }
    return status?.uptimeMs ?? null;
  }, [status]);

  const badges = [
    {
      label: status?.phase ? status.phase.toUpperCase() : 'IDLE',
      tone: COLOR_CLASS[connection.color],
    },
    {
      label: connection.value.toUpperCase(),
      tone: COLOR_CLASS[connection.color],
    },
  ];

  if (transport === 'poll') {
    badges.push({
      label: 'FALLBACK: POLL',
      tone: 'bg-amber-500/20 text-amber-100 border-amber-400/40',
    });
  }

  const runBadge = status?.runId
    ? { label: `Run ${status.runId}`, tone: 'bg-slate-800/60 text-slate-200 border-slate-600/50' }
    : null;

  if (runBadge) {
    badges.push(runBadge);
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-slate-200 shadow-[0_25px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center gap-2">
        {badges.map((badge, index) => (
          <span
            key={`${badge.label}-${index}`}
            className={classNames(
              'rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.2em]',
              badge.tone,
            )}
          >
            {badge.label}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
        <div>
          <p className="uppercase tracking-[0.2em] text-slate-500">Uptime</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{formatDuration(uptime)}</p>
        </div>
        <div>
          <p className="uppercase tracking-[0.2em] text-slate-500">Heartbeat</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">
            {lastHeartbeatAt ? new Date(lastHeartbeatAt).toLocaleTimeString() : '—'}
          </p>
        </div>
        <div>
          <p className="uppercase tracking-[0.2em] text-slate-500">Queue</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{backpressure > 0 ? `${backpressure} buffered` : 'Stable'}</p>
        </div>
      </div>
    </div>
  );
};

export default StatusStrip;
