import React from 'react';
import type { ControlCallbacks } from './types';

interface ControlsProps extends ControlCallbacks {
  hasRollbackCheckpoint: boolean;
  currentRunId: string | null;
}

const Controls: React.FC<ControlsProps> = ({
  onPause,
  onResume,
  onRetry,
  onRollback,
  isPaused,
  isRetrying,
  isRollingBack,
  hasRollbackCheckpoint,
  currentRunId,
}) => {
  const handleRetry = () => onRetry(currentRunId ?? undefined);
  const handleRollback = () => onRollback(currentRunId ?? undefined, undefined);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-white/10 bg-white/10 p-5 text-sm text-slate-200 shadow-[0_25px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl">
      <button
        type="button"
        onClick={isPaused ? onResume : onPause}
        className="rounded-full border border-purple-400/60 bg-purple-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-purple-100 transition hover:border-purple-300/60 hover:text-purple-50"
      >
        {isPaused ? 'Resume Stream' : 'Pause Stream'}
      </button>
      <button
        type="button"
        onClick={handleRetry}
        disabled={isRetrying}
        className="rounded-full border border-emerald-400/60 bg-emerald-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100 transition hover:border-emerald-300/60 hover:text-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRetrying ? 'Retrying…' : 'Retry Run'}
      </button>
      <button
        type="button"
        onClick={handleRollback}
        disabled={!hasRollbackCheckpoint || isRollingBack}
        className="rounded-full border border-rose-400/60 bg-rose-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-rose-100 transition hover:border-rose-300/60 hover:text-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRollingBack ? 'Rolling Back…' : 'Rollback'}
      </button>
      {currentRunId ? (
        <span className="ml-auto font-jetbrains text-[11px] uppercase tracking-[0.24em] text-slate-400/80">
          Focused run: {currentRunId}
        </span>
      ) : null}
    </div>
  );
};

export default Controls;
