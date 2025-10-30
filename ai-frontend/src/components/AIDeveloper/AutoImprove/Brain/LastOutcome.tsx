import React from 'react';
import type { ActionEventPayload } from './types';

interface LastOutcomeProps {
  action: ActionEventPayload | null;
  diffUrl?: string | null;
  transport?: 'sse' | 'poll';
}

const LastOutcome: React.FC<LastOutcomeProps> = ({ action, diffUrl, transport = 'sse' }) => {
  if (!action) {
    return (
      <div
        className="rounded-3xl border border-white/10 bg-white/10 p-5 text-sm text-slate-300 shadow-[0_25px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl"
        aria-live="polite"
      >
        <p className="text-xs uppercase tracking-[0.28em] text-slate-400/80">Last Outcome</p>
        <p className="mt-3 text-slate-200">No actions have been completed yet.</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-3xl border border-white/10 bg-white/10 p-5 text-sm text-slate-200 shadow-[0_25px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl"
      aria-live="polite"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.28em] text-emerald-200/80">Last Outcome</p>
        <span className="rounded-full border border-emerald-400/60 bg-emerald-500/15 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-emerald-100">
          {transport.toUpperCase()}
        </span>
      </div>
      <div className="living-ai-divider my-4" aria-hidden="true" />
      <p className="text-base font-semibold text-white">{action.summary}</p>
      <div className="mt-4 grid gap-3 text-xs text-slate-200/80 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="uppercase tracking-[0.24em] text-emerald-200/70">Files</p>
          <p className="mt-2 font-jetbrains text-sm text-white">
            {action.filesTouched.length ? action.filesTouched.length : '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="uppercase tracking-[0.24em] text-emerald-200/70">Tests</p>
          <p className="mt-2 font-jetbrains text-sm text-white">
            {action.testsRan.length ? action.testsRan.join(', ') : '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="uppercase tracking-[0.24em] text-emerald-200/70">Result</p>
          <p className="mt-2 font-jetbrains text-sm text-white">{action.result}</p>
        </div>
      </div>
      {action.durationMs ? (
        <p className="mt-4 text-xs text-emerald-100/80">Duration: {Math.round(action.durationMs)} ms</p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        {action.checkpointId ? (
          <span className="rounded-full border border-emerald-400/50 bg-emerald-500/15 px-3 py-1 uppercase tracking-[0.24em] text-emerald-100">
            Checkpoint {action.checkpointId}
          </span>
        ) : null}
        {diffUrl ? (
          <a
            href={diffUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-emerald-300/60 px-3 py-1 uppercase tracking-[0.24em] text-emerald-100 transition hover:border-emerald-200/60 hover:text-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            View Diff
          </a>
        ) : null}
      </div>
    </div>
  );
};

export default LastOutcome;
