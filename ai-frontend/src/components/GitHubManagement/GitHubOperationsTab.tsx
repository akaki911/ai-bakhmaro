// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileText,
  FolderTree,
  GitPullRequest,
  RefreshCcw,
  Rocket,
  TrendingUp,
} from 'lucide-react';
import classNames from 'classnames';
import { formatDistanceToNow } from 'date-fns';

import { useGitHubOperations } from './hooks';

const SectionCard: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  title,
  icon,
  children,
  className,
}) => (
  <div
    className={classNames(
      'rounded-3xl border border-white/10 bg-[#0F1320]/80 p-6 shadow-[0_24px_60px_rgba(5,10,30,0.55)] backdrop-blur-2xl',
      className,
    )}
  >
    <div className="mb-4 flex items-center gap-3 text-sm font-semibold text-white/90">
      {icon}
      <span className="tracking-wide uppercase text-[11px] text-white/60">{title}</span>
    </div>
    {children}
  </div>
);

const metricFormatter = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });

const formatPercent = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  return metricFormatter.format(Math.max(0, Math.min(1, value)));
};

const formatKb = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })} KB`;
};

const emptyMessage = 'ამ ეტაპზე შესაფერისი ცვლილებები არ ფიქსირდება. შეინახეთ ფაილები ან განაახლეთ სტატუსი.';

const GitHubOperationsTab: React.FC = () => {
  const {
    getOperationsPolicy,
    getOperationsChanges,
    getOperationsMetrics,
    listOperationsPulls,
    createOperationsPullRequest,
    runOperationsSmokeTest,
    operationLoading,
  } = useGitHubOperations();

  const [policy, setPolicy] = useState<any | null>(null);
  const [changes, setChanges] = useState<any | null>(null);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [pulls, setPulls] = useState<any | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [branchName, setBranchName] = useState<string>(() => `ops/${new Date().toISOString().split('T')[0]}`);
  const [baseBranch, setBaseBranch] = useState<string>('main');
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [prTitle, setPrTitle] = useState<string>('');
  const [prBody, setPrBody] = useState<string>('');
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [smokeNote, setSmokeNote] = useState<string>('');
  const [smokeResult, setSmokeResult] = useState<any | null>(null);

  const allowedFiles = useMemo(() => changes?.files?.filter((file: any) => file.allowed) ?? [], [changes]);
  const blockedFiles = useMemo(() => changes?.files?.filter((file: any) => !file.allowed) ?? [], [changes]);
  const directories = useMemo(() => changes?.directories ?? [], [changes]);

  const isBusy = Boolean(operationLoading && operationLoading !== null);

  const refreshAll = useCallback(async () => {
    setError(null);
    try {
      const [policyRes, changesRes, metricsRes, pullsRes] = await Promise.all([
        getOperationsPolicy(),
        getOperationsChanges(),
        getOperationsMetrics(),
        listOperationsPulls(5),
      ]);

      if (policyRes.success) {
        const data = policyRes.data?.policy || policyRes.data;
        setPolicy(data);
        if (data?.baseBranch) {
          setBaseBranch(data.baseBranch);
        }
      } else if (policyRes.error) {
        setError(policyRes.error);
      }

      if (changesRes.success) {
        setChanges(changesRes.data);
      } else if (changesRes.error) {
        setError((prev) => prev || changesRes.error);
      }

      if (metricsRes.success) {
        setMetrics(metricsRes.data);
      }

      if (pullsRes.success) {
        setPulls(pullsRes.data);
      }
    } catch (refreshError) {
      console.error('❌ Operations panel refresh failed:', refreshError);
      if (refreshError instanceof Error) {
        setError(refreshError.message);
      } else {
        setError('ვერ მოხერხდა ოპერაციების მონაცემების განახლება');
      }
    }
  }, [getOperationsPolicy, getOperationsChanges, getOperationsMetrics, listOperationsPulls]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const togglePath = useCallback((path: string) => {
    setSelectedPaths((prev) => {
      if (prev.includes(path)) {
        return prev.filter((entry) => entry !== path);
      }
      return [...prev, path];
    });
  }, []);

  const toggleDirectory = useCallback(
    (anchor: string) => {
      const matching = allowedFiles
        .filter((file: any) => file.anchor === anchor || file.path.startsWith(anchor))
        .map((file: any) => file.path);
      setSelectedPaths((prev) => {
        const hasAll = matching.every((path) => prev.includes(path));
        if (hasAll) {
          return prev.filter((path) => !matching.includes(path));
        }
        const next = new Set(prev);
        matching.forEach((path) => next.add(path));
        return Array.from(next);
      });
    },
    [allowedFiles],
  );

  const resetForm = useCallback(() => {
    setSelectedPaths([]);
    setCommitMessage('');
    setPrTitle('');
    setPrBody('');
  }, []);

  const handleCreatePr = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (selectedPaths.length === 0) {
        setError('აირჩიეთ მაინც ერთი ფაილი ან დირექტორია, რომლის გაგზავნაც გსურთ.');
        return;
      }
      setError(null);
      setResult(null);
      const payload = {
        files: selectedPaths,
        branchName,
        baseBranch,
        commitMessage,
        prTitle,
        prBody,
      };
      const response = await createOperationsPullRequest(payload);
      if (response.success) {
        setResult(response.data);
        resetForm();
        await refreshAll();
      } else {
        const serverError = response.data?.error || response.error || 'ოპერაცია ვერ შესრულდა';
        setError(serverError);
      }
    },
    [selectedPaths, branchName, baseBranch, commitMessage, prTitle, prBody, createOperationsPullRequest, resetForm, refreshAll],
  );

  const handleSmokeTest = useCallback(
    async () => {
      const response = await runOperationsSmokeTest(smokeNote.trim() ? smokeNote.trim() : undefined);
      if (response.success) {
        setSmokeResult(response.data);
      } else {
        setError(response.data?.error || response.error || 'Smoke ტესტი ჩავარდა');
      }
    },
    [runOperationsSmokeTest, smokeNote],
  );

  const selectedCount = selectedPaths.length;

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-[#070B16] via-[#0D1024] to-[#191433] text-white">
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#0F1320]/70 p-6 shadow-[0_24px_60px_rgba(5,10,30,0.55)] backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-violet-300/80">
                <Rocket size={16} />
                ოპერაციები • GitHub Control
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-white">AI Space Operations Panel</h1>
              <p className="text-sm text-white/60">
                აირჩიეთ უსაფრთხო ცვლილებები, შექმენით Pull Request და აკონტროლეთ CI სტატუსი bakhmaro.co-ისთვის.
              </p>
            </div>
            <button
              type="button"
              onClick={() => refreshAll()}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
              disabled={isBusy}
            >
              <RefreshCcw size={16} className={classNames('transition-transform', { 'animate-spin': isBusy })} />
              განახლება
            </button>
          </div>
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
              <AlertTriangle size={18} className="mt-0.5" />
              <div>
                <p className="font-medium">დაფიქსირდა შეცდომა</p>
                <p className="text-red-100/80">{error}</p>
              </div>
            </div>
          )}
          {result?.pr && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              <CheckCircle2 size={18} className="mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Pull Request წარმატებით შეიქმნა</p>
                <a
                  href={result.pr.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-100 underline decoration-dotted decoration-emerald-200/60 hover:text-emerald-50"
                >
                  #{result.pr.number} · {result.pr.title}
                </a>
                {result.ci?.state && (
                  <p className="text-emerald-100/80">CI status: {result.ci.state}</p>
                )}
              </div>
            </div>
          )}
          {smokeResult?.pr && (
            <div className="flex items-start gap-3 rounded-2xl border border-sky-500/40 bg-sky-500/10 p-4 text-sm text-sky-100">
              <Activity size={18} className="mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Sandbox smoke ტესტი გაუშვებულია</p>
                <a
                  href={smokeResult.pr.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-100 underline decoration-dotted decoration-sky-200/60 hover:text-white"
                >
                  #{smokeResult.pr.number} · {smokeResult.file}
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <SectionCard
            title="Policy Overview"
            icon={<FolderTree size={16} className="text-violet-300" />}
            className="lg:col-span-1"
          >
            <div className="space-y-3 text-sm text-white/70">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">დასაშვები ბილიკები</p>
                <ul className="mt-1 space-y-1">
                  {(policy?.allowList ?? []).map((entry: string) => (
                    <li key={`allow-${entry}`} className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1">
                      {entry}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">აკრძალული ზონები</p>
                <ul className="mt-1 space-y-1">
                  {(policy?.denyList ?? []).map((entry: string) => (
                    <li key={`deny-${entry}`} className="rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-red-200/90">
                      {entry}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
                {(policy?.guidelines ?? []).map((guideline: string, index: number) => (
                  <p key={`guideline-${index}`} className="mb-2 last:mb-0">
                    • {guideline}
                  </p>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Eligible Changes"
            icon={<FileText size={16} className="text-emerald-300" />}
            className="lg:col-span-2"
          >
            <div className="flex flex-col gap-4">
              {allowedFiles.length === 0 ? (
                <p className="text-sm text-white/50">{emptyMessage}</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {directories.map((directory: any) => (
                      <button
                        key={`dir-${directory.path}`}
                        type="button"
                        onClick={() => toggleDirectory(directory.path)}
                        className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-xs text-violet-100/80 hover:bg-violet-400/20"
                      >
                        {directory.path} · {directory.allowed} ფაილი
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2 overflow-hidden rounded-2xl border border-white/5 bg-black/20">
                    {allowedFiles.map((file: any) => (
                      <label
                        key={`allowed-${file.path}`}
                        className="flex items-center justify-between gap-4 border-b border-white/5 px-4 py-2 last:border-b-0"
                      >
                        <div className="flex items-center gap-3 text-sm text-white/80">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-white/30 bg-transparent"
                            checked={selectedPaths.includes(file.path)}
                            onChange={() => togglePath(file.path)}
                          />
                          <span>{file.path}</span>
                        </div>
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-200">
                          {file.status}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {blockedFiles.length > 0 && (
                <div className="space-y-2 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-red-200/70">
                    <AlertTriangle size={14} />
                    შეზღუდული ცვლილებები
                  </div>
                  {blockedFiles.map((file: any) => (
                    <div key={`blocked-${file.path}`} className="flex items-center justify-between gap-3 border-b border-red-400/20 pb-2 last:border-b-0 last:pb-0">
                      <span>{file.path}</span>
                      <span className="text-xs text-red-200/70">{file.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Create Pull Request"
          icon={<GitPullRequest size={16} className="text-sky-300" />}
        >
          <form className="space-y-4" onSubmit={handleCreatePr}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase tracking-[0.25em] text-white/40">Branch Name</label>
                <input
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white focus:border-sky-400/60 focus:outline-none"
                  value={branchName}
                  onChange={(event) => setBranchName(event.target.value)}
                  placeholder="ops/docs-update"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.25em] text-white/40">Base Branch</label>
                <input
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white focus:border-sky-400/60 focus:outline-none"
                  value={baseBranch}
                  onChange={(event) => setBaseBranch(event.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.25em] text-white/40">Commit Message</label>
              <input
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white focus:border-sky-400/60 focus:outline-none"
                value={commitMessage}
                onChange={(event) => setCommitMessage(event.target.value)}
                placeholder="chore: refresh docs copy"
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.25em] text-white/40">PR Title</label>
              <input
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white focus:border-sky-400/60 focus:outline-none"
                value={prTitle}
                onChange={(event) => setPrTitle(event.target.value)}
                placeholder="docs: clarify AI space onboarding"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.25em] text-white/40">PR Body</label>
              <textarea
                className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:border-sky-400/60 focus:outline-none"
                rows={4}
                value={prBody}
                onChange={(event) => setPrBody(event.target.value)}
                placeholder="## Summary\n- Updated marketing copy\n- Tweaked docs navigation"
              />
            </div>
            <div className="flex items-center justify-between text-sm text-white/60">
              <span>{selectedCount} ფაილი მონიშნულია</span>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/20 px-5 py-2 text-sm font-medium text-sky-50 hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={selectedCount === 0 || isBusy}
              >
                <GitPullRequest size={16} />
                შექმენი PR
              </button>
            </div>
          </form>
        </SectionCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard
            title="Deployment Metrics"
            icon={<TrendingUp size={16} className="text-amber-300" />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">PR Merge Rate</p>
                <p className="mt-2 text-2xl font-semibold text-white">{formatPercent(metrics?.prMergeRate)}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">CI Pass Ratio</p>
                <p className="mt-2 text-2xl font-semibold text-white">{formatPercent(metrics?.ciPassRatio)}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Bundle Size</p>
                <div className="mt-2 flex items-center justify-between text-sm text-white/70">
                  <span>Current: {formatKb(metrics?.bundle?.currentKb)}</span>
                  <span>Baseline: {formatKb(metrics?.bundle?.baselineKb)}</span>
                  <span>Δ {formatKb(metrics?.bundle?.deltaKb)}</span>
                </div>
                {metrics?.bundle?.note && (
                  <p className="mt-1 text-xs text-white/40">{metrics.bundle.note}</p>
                )}
              </div>
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">ESLint Trend</p>
                <div className="mt-2 space-y-2">
                  {(metrics?.eslintTrend?.recent ?? []).map((run: any) => (
                    <div key={`lint-${run.id}`} className="flex items-center justify-between text-xs text-white/70">
                      <span>{run.name || 'lint'}</span>
                      <span className={classNames('rounded-full px-2 py-0.5', run.conclusion === 'success' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-red-500/20 text-red-200')}>
                        {run.conclusion || run.status}
                      </span>
                      <span className="text-white/40">
                        {run.updatedAt ? formatDistanceToNow(new Date(run.updatedAt), { addSuffix: true }) : '—'}
                      </span>
                    </div>
                  ))}
                  {metrics?.eslintTrend?.recent?.length === 0 && (
                    <p className="text-xs text-white/40">Lint history is empty.</p>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Open Pull Requests"
            icon={<CheckCircle2 size={16} className="text-emerald-300" />}
          >
            <div className="space-y-3">
              {(pulls?.pulls ?? []).map((pr: any) => (
                <div key={`pr-${pr.number}`} className="rounded-2xl border border-white/5 bg-black/20 p-4 text-sm text-white/70">
                  <div className="flex items-center justify-between">
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-white hover:text-white/80"
                    >
                      #{pr.number} · {pr.title}
                    </a>
                    <span className="text-xs uppercase text-white/40">{pr.ciState}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {(pr.statuses ?? []).map((status: any, index: number) => (
                      <span
                        key={`status-${pr.number}-${index}`}
                        className={classNames(
                          'rounded-full px-2 py-0.5',
                          status.state === 'success'
                            ? 'bg-emerald-500/20 text-emerald-100'
                            : status.state === 'pending'
                              ? 'bg-amber-500/20 text-amber-100'
                              : 'bg-red-500/20 text-red-100',
                        )}
                      >
                        {status.context}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {(pulls?.pulls ?? []).length === 0 && (
                <p className="text-sm text-white/50">ამჟამად ღია Pull Request არ არის.</p>
              )}
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Sandbox Smoke Test"
          icon={<Activity size={16} className="text-sky-300" />}
        >
          <div className="flex flex-col gap-3 text-sm text-white/70">
            <p>
              შექმენით მცირე შემოწმების PR sandbox საცავში, რათა დაადასტუროთ GitHub ინტეგრაციის ჯანმრთელობა სანამ რეალურ ცვლილებებს გამოაქვეყნებთ.
            </p>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white focus:border-sky-400/60 focus:outline-none"
                placeholder="სურვილისამებრ: აღწერეთ smoke ტესტის მიზანი"
                value={smokeNote}
                onChange={(event) => setSmokeNote(event.target.value)}
              />
              <button
                type="button"
                onClick={() => void handleSmokeTest()}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/20 px-4 py-2 text-sm text-sky-50 hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBusy}
              >
                <RefreshCcw size={16} />
                გაუშვი smoke ტესტი
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default GitHubOperationsTab;
