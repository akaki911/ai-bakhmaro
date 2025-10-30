import React from 'react';
import classNames from 'classnames';
import type { BrainEventRecord } from './types';

interface LiveFeedProps {
  events: BrainEventRecord[];
  activeTypes: Set<BrainEventRecord['type']>;
  onToggleType: (type: BrainEventRecord['type']) => void;
}

const toneByType: Record<BrainEventRecord['type'], string> = {
  status: 'border-sky-400/60 bg-sky-500/15 text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.3)]',
  action: 'border-emerald-400/60 bg-emerald-500/15 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.3)]',
  problem: 'border-rose-400/60 bg-rose-500/15 text-rose-100 shadow-[0_0_18px_rgba(244,63,94,0.3)]',
  decision: 'border-purple-400/60 bg-purple-500/15 text-purple-100 shadow-[0_0_18px_rgba(168,85,247,0.3)]',
  log: 'border-white/10 bg-white/5 text-slate-200 shadow-[0_0_18px_rgba(148,163,184,0.25)]',
  metric: 'border-amber-400/60 bg-amber-500/15 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.3)]',
  error: 'border-rose-500/60 bg-rose-600/15 text-rose-100 shadow-[0_0_18px_rgba(248,113,113,0.3)]',
};

const LiveFeed: React.FC<LiveFeedProps> = ({ events, activeTypes, onToggleType }) => {
  const ordered = [...events].sort((a, b) => b.receivedAt - a.receivedAt);
  const filters = (Object.keys(toneByType) as BrainEventRecord['type'][]).map((type) => ({
    type,
    active: activeTypes.has(type),
  }));

  return (
    <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/10 shadow-[0_25px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 text-xs text-slate-400/80">
        <span className="uppercase tracking-[0.28em] text-cyan-200/80">Live Feed</span>
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <button
              key={filter.type}
              type="button"
              onClick={() => onToggleType(filter.type)}
              className={classNames(
                'rounded-full border px-2 py-1 transition-colors',
                filter.active
                  ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.35)]'
                  : 'border-white/10 bg-transparent text-slate-400 hover:border-cyan-400/40 hover:text-cyan-100',
              )}
            >
              {filter.type}
            </button>
          ))}
        </div>
      </div>
      <div className="mx-4 mb-3 h-px living-ai-divider" aria-hidden="true" />
      <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4 text-xs">
        {ordered.length === 0 ? (
          <p className="text-slate-500">No events yet.</p>
        ) : (
          ordered.map((event) => (
            <div
              key={event.id}
              className={classNames('rounded-2xl border px-3 py-3 backdrop-blur-xl transition', toneByType[event.type])}
            >
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em]">
                <span>{event.type}</span>
                <span>{event.runId ?? 'no-run'}</span>
              </div>
              <div className="living-ai-divider my-2" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-white/90">
                {(() => {
                  switch (event.type) {
                    case 'status':
                      return event.data.phase ?? 'Status update';
                    case 'action':
                      return event.data.summary;
                    case 'decision':
                      return event.data.chosenPath;
                    case 'problem':
                      return event.data.title;
                    case 'metric':
                      return `CPU ${event.data.cpu ?? '—'}% | MEM ${event.data.mem ?? '—'}% | P95 ${event.data.latencyP95 ?? '—'}ms`;
                    case 'error':
                      return `${event.data.code}: ${event.data.message}`;
                    case 'log':
                    default:
                      return event.data.message;
                  }
                })()}
              </p>
              <p className="mt-3 text-[10px] text-white/70">
                {new Date(event.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LiveFeed;
