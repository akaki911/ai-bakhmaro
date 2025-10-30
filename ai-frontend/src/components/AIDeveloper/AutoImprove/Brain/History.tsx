import React from 'react';
import classNames from 'classnames';
import type { BrainHistoryEntry } from './types';

interface HistoryProps {
  entries: BrainHistoryEntry[];
  onSelect: (entry: BrainHistoryEntry) => void;
  onDiffNavigate?: (entry: BrainHistoryEntry, diffUrl: string | null) => void;
}

const toneStyles: Record<BrainHistoryEntry['tone'], string> = {
  info: 'border-white/10 bg-white/5 text-slate-200 shadow-[0_18px_55px_rgba(2,6,23,0.35)]',
  warning: 'border-amber-400/60 bg-amber-500/15 text-amber-100 shadow-[0_18px_55px_rgba(251,191,36,0.28)]',
  error: 'border-rose-400/60 bg-rose-500/15 text-rose-100 shadow-[0_18px_55px_rgba(244,63,94,0.28)]',
};

const toneHeadlineClass: Record<BrainHistoryEntry['tone'], string> = {
  info: 'text-slate-100',
  warning: 'text-amber-50',
  error: 'text-rose-50',
};

const toneDetailClass: Record<BrainHistoryEntry['tone'], string> = {
  info: 'text-slate-400',
  warning: 'text-amber-200',
  error: 'text-rose-200',
};

const History: React.FC<HistoryProps> = ({ entries, onSelect, onDiffNavigate }) => {
  if (!entries.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/10 p-5 text-sm text-slate-300 shadow-[0_25px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-400/80">History</p>
        <p className="mt-3 text-slate-400">No completed runs yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-5 text-sm text-slate-200 shadow-[0_25px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400/80">History</p>
      <div className="living-ai-divider my-4" aria-hidden="true" />
      <ul className="space-y-3" role="list">
        {entries.map((entry) => {
          const diffUrl = entry.diffUrl ?? null;

          return (
            <li
              key={entry.runId ?? entry.updatedAt}
              className={classNames(
                'rounded-2xl border p-4 focus-within:ring-2 focus-within:ring-cyan-400/60 backdrop-blur-xl',
                toneStyles[entry.tone],
              )}
              role="listitem"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Run {entry.runId ?? '—'}
                  </p>
                  <p className={classNames('mt-2 text-sm', toneHeadlineClass[entry.tone])}>{entry.headline}</p>
                  <div className="living-ai-divider my-3" aria-hidden="true" />
                  {entry.detail ? (
                    <p className={classNames('mt-1 text-xs', toneDetailClass[entry.tone])}>{entry.detail}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {diffUrl ? (
                    <a
                      href={diffUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-emerald-400/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-100 transition hover:border-emerald-300/60 hover:text-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      onClick={() => onDiffNavigate?.(entry, diffUrl)}
                    >
                      View Diff
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onSelect(entry)}
                    className="rounded-full border border-cyan-400/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100 transition hover:border-cyan-300/60 hover:text-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    Inspect Run
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default History;
