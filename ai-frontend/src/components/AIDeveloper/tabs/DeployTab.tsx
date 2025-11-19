import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RadioTower, ShieldCheck, XCircle, RefreshCcw } from 'lucide-react';
import { getAdminAuthHeaders } from '@/utils/adminToken';

type DeployStatus = 'idle' | 'running' | 'success' | 'error';
type PhaseState = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

type DeployLog = {
  id: string;
  timestamp: string;
  message: string;
  level: 'info' | 'error';
  phase?: string;
};

type DeployTabProps = {
  defaultProjectId?: string;
  isSuperAdmin: boolean;
};

type StatusEventPayload = {
  phase?: string;
  state?: string;
};

type LogEventPayload = {
  message: string;
  level?: 'info' | 'error';
  phase?: string;
};

const PHASES = [
  { key: 'install', label: 'Install dependencies', description: 'Runs pnpm install with the frozen lockfile' },
  { key: 'build', label: 'Build workspace', description: 'Builds workspaces via pnpm build' },
  { key: 'deploy', label: 'Deploy to Firebase', description: 'Runs firebase deploy --only hosting,functions' },
] as const;

const initialPhaseState = (): Record<string, PhaseState> =>
  PHASES.reduce<Record<string, PhaseState>>((acc, { key }) => {
    acc[key] = 'pending';
    return acc;
  }, {});

const statusTone: Record<DeployStatus, { text: string; className: string; icon: React.ReactElement }> = {
  idle: {
    text: 'Standby',
    className: 'text-slate-600 border border-slate-300 bg-white',
    icon: <ShieldCheck size={16} />,
  },
  running: {
    text: 'Running',
    className: 'text-amber-700 border border-amber-200 bg-amber-50',
    icon: <Loader2 size={16} className="animate-spin" />,
  },
  success: {
    text: 'Completed',
    className: 'text-emerald-700 border border-emerald-200 bg-emerald-50',
    icon: <CheckCircle2 size={16} />,
  },
  error: {
    text: 'Needs attention',
    className: 'text-rose-700 border border-rose-200 bg-rose-50',
    icon: <AlertCircle size={16} />,
  },
};

const phaseTone: Record<PhaseState, { color: string; label: string; icon: React.ReactElement }> = {
  pending: {
    color: 'text-slate-500',
    label: 'Pending',
    icon: <RadioTower size={14} className="text-slate-400" />,
  },
  running: {
    color: 'text-amber-600',
    label: 'Running',
    icon: <Loader2 size={14} className="text-amber-600 animate-spin" />,
  },
  completed: {
    color: 'text-emerald-600',
    label: 'Done',
    icon: <CheckCircle2 size={14} className="text-emerald-600" />,
  },
  failed: {
    color: 'text-rose-600',
    label: 'Failed',
    icon: <XCircle size={14} className="text-rose-600" />,
  },
  skipped: {
    color: 'text-slate-400',
    label: 'Skipped',
    icon: <ShieldCheck size={14} className="text-slate-400" />,
  },
};

const DeployTab: React.FC<DeployTabProps> = ({ defaultProjectId, isSuperAdmin }) => {
  const [projectId, setProjectId] = useState(defaultProjectId ?? '');
  const [skipInstall, setSkipInstall] = useState(false);
  const [status, setStatus] = useState<DeployStatus>('idle');
  const statusRef = useRef<DeployStatus>('idle');
  const [logs, setLogs] = useState<DeployLog[]>([]);
  const [phaseStatuses, setPhaseStatuses] = useState<Record<string, PhaseState>>(initialPhaseState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const updateStatus = useCallback((next: DeployStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const appendLog = useCallback((entry: LogEventPayload) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length + 1}`,
        timestamp: new Date().toLocaleTimeString(),
        message: entry.message,
        level: entry.level ?? 'info',
        phase: entry.phase,
      },
    ]);
  }, []);

  useEffect(() => {
    if (!logContainerRef.current) {
      return;
    }
    logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }, [logs]);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  const resetState = useCallback(() => {
    setLogs([]);
    setPhaseStatuses(initialPhaseState());
    setErrorMessage(null);
    updateStatus('idle');
  }, [updateStatus]);

  const handleStatusEvent = useCallback((payload: StatusEventPayload) => {
    if (!payload || !payload.phase) {
      return;
    }

    const state = payload.state ?? 'pending';
    if (payload.phase === 'overall') {
      if (state === 'completed') {
        updateStatus('success');
      } else if (state === 'failed') {
        updateStatus('error');
      } else if (state === 'running') {
        updateStatus('running');
      }
      return;
    }

    setPhaseStatuses((prev) => ({
      ...prev,
      [payload.phase ?? '']: (['running', 'completed', 'failed', 'skipped'].includes(state)
        ? (state as PhaseState)
        : 'pending'),
    }));
  }, [updateStatus]);

  const handleSseEvent = useCallback(
    (event: string, data: string) => {
      let payload: any = data;
      if (data) {
        try {
          payload = JSON.parse(data);
        } catch {
          payload = data;
        }
      }

      switch (event) {
        case 'log':
          if (typeof payload === 'object' && payload !== null) {
            appendLog({
              message: payload.message ?? '',
              level: payload.level ?? 'info',
              phase: payload.phase,
            });
          } else if (typeof payload === 'string') {
            appendLog({ message: payload });
          }
          break;
        case 'status':
          handleStatusEvent(payload as StatusEventPayload);
          break;
        case 'error':
          {
            const message =
              typeof payload === 'object' && payload !== null ? payload.message : String(payload ?? 'Unknown error');
            setErrorMessage(message);
            updateStatus('error');
          }
          break;
        case 'end':
          {
            const result =
              typeof payload === 'object' && payload !== null ? payload.status : String(payload ?? 'success');
            if (result === 'success') {
              updateStatus('success');
            } else if (result === 'aborted') {
              updateStatus('error');
              setErrorMessage('Deployment aborted.');
            } else {
              updateStatus('error');
            }
            setIsStreaming(false);
          }
          break;
        default:
      }
    },
    [appendLog, handleStatusEvent, updateStatus],
  );

  const processStream = useCallback(
    async (response: Response) => {
      if (!response.body) {
        throw new Error('Deployment stream unavailable');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let eventName = 'message';
      let dataLines: string[] = [];

      const flushEvent = () => {
        if (!dataLines.length) {
          eventName = 'message';
          return;
        }
        const payload = dataLines.join('\n');
        handleSseEvent(eventName, payload);
        eventName = 'message';
        dataLines = [];
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          flushEvent();
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        let lineEnd = buffer.indexOf('\n');
        while (lineEnd !== -1) {
          let line = buffer.slice(0, lineEnd);
          buffer = buffer.slice(lineEnd + 1);
          line = line.replace(/\r$/, '');
          if (line.startsWith('event:')) {
            eventName = line.slice(6).trim() || eventName;
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5));
          } else if (line === '') {
            flushEvent();
          }
          lineEnd = buffer.indexOf('\n');
        }
      }
    },
    [handleSseEvent],
  );

  const handleDeploy = useCallback(async () => {
    if (!projectId.trim()) {
      setErrorMessage('Project ID is required before deployment.');
      return;
    }
    if (!isSuperAdmin) {
      setErrorMessage('Only Super Admins can deploy to Firebase.');
      return;
    }

    resetState();
    updateStatus('running');
    setIsStreaming(true);

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const response = await fetch('/api/ai/deploy/firebase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders(),
        },
        body: JSON.stringify({
          projectId: projectId.trim(),
          skipInstall,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = `Deployment request failed (${response.status})`;
        appendLog({ message, level: 'error' });
        throw new Error(message);
      }

      await processStream(response);

      if (statusRef.current === 'running') {
        updateStatus('success');
      }
    } catch (error) {
      if (controller.signal.aborted) {
        appendLog({ message: 'Deployment cancelled by user', level: 'error' });
        setErrorMessage('Deployment cancelled.');
      } else {
        const message = error instanceof Error ? error.message : 'Deployment failed';
        appendLog({ message, level: 'error' });
        setErrorMessage(message);
      }
      updateStatus('error');
    } finally {
      controllerRef.current = null;
      setIsStreaming(false);
    }
  }, [appendLog, isSuperAdmin, processStream, projectId, resetState, skipInstall, updateStatus]);

  const handleAbort = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const statusMeta = statusTone[status];

  const hasLogs = logs.length > 0;

  const helperText = useMemo(
    () =>
      status === 'success'
        ? 'Firebase reported a successful deployment. Run the smoke tests below to finish the release.'
        : 'The deploy runner executes pnpm build + firebase deploy with the current workspace state.',
    [status],
  );

  if (!isSuperAdmin) {
    return (
      <div className="ai-dev-panel__empty-state" role="alert">
        <ShieldCheck size={40} className="text-amber-500" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-slate-900">Deployments are restricted</h2>
        <p className="text-slate-600 max-w-2xl">
          მხოლოდ SUPER_ADMIN ანგარიშებს შეუძლიათ Firebase განახლების შესრულება. მიმართეთ ოპერაციებს თუ გჭირდებათ
          დაშვება ან ჩაატარეთ ცვლილება GitHub Actions-იდან.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">Firebase Deployment</p>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Deploy to Hosting + Functions</h2>
          </div>
          <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm ${statusMeta.className}`}>
            {statusMeta.icon}
            <span>{statusMeta.text}</span>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{helperText}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Firebase Project ID</span>
            <input
              type="text"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-sky-900"
              placeholder="gurulo-ai-space"
            />
            <span className="text-xs text-slate-500">
              Overrides <code>FIREBASE_PROJECT_ID</code> for this run only.
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              checked={skipInstall}
              onChange={(event) => setSkipInstall(event.target.checked)}
              disabled={isStreaming}
            />
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">Skip dependency install</p>
              <p className="text-xs text-slate-500">Use when node_modules is already up to date.</p>
            </div>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleDeploy}
            disabled={isStreaming}
          >
            {isStreaming ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            Deploy to Firebase
          </button>
          {isStreaming && (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={handleAbort}
              disabled={!isStreaming}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Progress</h3>
          <ul className="mt-4 space-y-3">
            {PHASES.map((phase) => {
              const tone = phaseTone[phaseStatuses[phase.key] ?? 'pending'];
              return (
                <li
                  key={phase.key}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 px-3 py-3 shadow-sm dark:border-slate-800"
                >
                  <span className="mt-0.5">{tone.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm font-medium text-slate-900 dark:text-white">
                      <span>{phase.label}</span>
                      <span className={`text-xs font-semibold ${tone.color}`}>{tone.label}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{phase.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
            Run the smoke tests from <code>docs/deployment.md</code> after every successful deploy to validate Hosting,
            gateway, and WebAuthn health.
          </div>
        </div>

        <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-950 text-slate-100 shadow-inner dark:border-slate-700">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-xs uppercase tracking-wide text-slate-400">
            <span>Realtime logs</span>
            {hasLogs && <span>{logs.length} entries</span>}
          </div>
          <div ref={logContainerRef} className="flex-1 overflow-auto px-4 py-3 text-sm">
            {logs.length === 0 ? (
              <p className="text-slate-500">Logs will stream here once the deployment starts.</p>
            ) : (
              <ul className="space-y-2 font-mono text-xs leading-relaxed">
                {logs.map((log) => (
                  <li key={log.id} className="whitespace-pre-wrap break-words">
                    <span className="text-slate-500">[{log.timestamp}]</span>{' '}
                    {log.phase ? <span className="text-slate-400">{log.phase}</span> : null}{' '}
                    <span className={log.level === 'error' ? 'text-rose-300' : 'text-emerald-200'}>{log.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-400/50 dark:bg-rose-950/40 dark:text-rose-200" role="alert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default DeployTab;
