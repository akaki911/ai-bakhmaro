import React from 'react';
import type { DecisionEventPayload } from './types';

interface NextActionProps {
  decision: DecisionEventPayload | null;
  statusPhase: string | null;
}

const NextAction: React.FC<NextActionProps> = ({ decision, statusPhase }) => {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-5 text-sm text-slate-200 shadow-[0_25px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.28em] text-sky-200/80">Next Action</p>
      <div className="living-ai-divider my-4" aria-hidden="true" />
      <p className="text-base font-semibold text-white">
        {decision?.chosenPath ?? 'Standing by for the next instruction.'}
      </p>
      <p className="mt-3 text-xs text-slate-300/80">
        {decision?.reason ??
          (statusPhase ? `Awaiting completion of the ${statusPhase} phase.` : 'Monitoring the pipeline.')}
      </p>
    </div>
  );
};

export default NextAction;
