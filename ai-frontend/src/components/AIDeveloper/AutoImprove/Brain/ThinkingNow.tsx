import React from 'react';
import type { DecisionEventPayload, ProblemEventPayload, StatusEventPayload } from './types';

interface ThinkingNowProps {
  status: StatusEventPayload | null;
  problem: ProblemEventPayload | null;
  decision: DecisionEventPayload | null;
}

const ThinkingNow: React.FC<ThinkingNowProps> = ({ status, problem, decision }) => {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/10 p-5 text-sm text-slate-200 shadow-[0_25px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">Thinking Now</p>
      <div className="living-ai-divider my-4" aria-hidden="true" />
      <div className="space-y-3">
        <p className="text-base text-slate-100">
          {status?.phase
            ? `Gurulo is currently in the “${status.phase}” phase.`
            : 'Awaiting the next phase update from Gurulo.'}
        </p>
        {problem ? (
          <div className="rounded-2xl border border-rose-400/60 bg-rose-500/15 p-4 shadow-[0_0_28px_rgba(244,63,94,0.25)]">
            <p className="text-xs uppercase tracking-[0.24em] text-rose-200/80">Active Problem</p>
            <div className="living-ai-divider my-3" aria-hidden="true" />
            <p className="font-medium text-rose-50">{problem.title}</p>
            {problem.severity ? (
              <p className="text-xs text-rose-100/80">Severity: {problem.severity}</p>
            ) : null}
            {problem.evidence?.length ? (
              <ul className="mt-2 space-y-1 text-xs text-rose-100/70">
                {problem.evidence.slice(0, 3).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {decision ? (
          <div className="rounded-2xl border border-emerald-400/60 bg-emerald-500/15 p-4 shadow-[0_0_28px_rgba(16,185,129,0.25)]">
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/80">Decision</p>
            <div className="living-ai-divider my-3" aria-hidden="true" />
            <p className="font-medium text-emerald-50">{decision.chosenPath}</p>
            {decision.reason ? (
              <p className="mt-2 text-xs text-emerald-100/80">{decision.reason}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ThinkingNow;
