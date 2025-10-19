
import React, { useCallback, useMemo, useState } from 'react';
import ExplorerPanel from '../../ExplorerPanel';
import { Github, GitPullRequestArrow, History, RefreshCcw } from 'lucide-react';

interface ExplorerTabProps {
  tree: any[];
  currentFile: { path: string; content: string; lastModified: string } | null;
  setCurrentFile: React.Dispatch<React.SetStateAction<{ path: string; content: string; lastModified: string } | null>>;
  aiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
  loadFile: (path: string) => Promise<{ content: string }>;
  saveFile: (path: string, content: string) => Promise<any>;
}

const ExplorerTab: React.FC<ExplorerTabProps> = ({
  tree,
  currentFile,
  setCurrentFile,
  aiFetch,
  loadFile,
  saveFile
}) => {
  void aiFetch;
  const [diffPreview, setDiffPreview] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const filePath = currentFile?.path ?? '';
  const hasFileSelected = Boolean(filePath);
  const diffLines = useMemo(() => diffPreview?.split('\n') ?? [], [diffPreview]);

  const handleGithubConnect = useCallback(async () => {
    try {
      setIsConnecting(true);
      setActionError(null);
      setActionMessage('Connecting to GitHub…');
      const response = await fetch('/api/github/connect', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const payload = await response.json();
      if (!response.ok || payload?.error) {
        throw new Error(payload?.error || 'Unable to connect to GitHub');
      }
      setActionMessage('GitHub integration ready for diff/restore operations.');
    } catch (error) {
      console.error('GitHub connect failed', error);
      setActionError((error as Error)?.message ?? 'GitHub connection failed');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleViewDiff = useCallback(async () => {
    if (!hasFileSelected) {
      setActionError('Select a file to inspect changes.');
      return;
    }
    try {
      setIsLoadingDiff(true);
      setActionError(null);
      setActionMessage(`Loading diff for ${filePath}…`);
      const response = await fetch('/api/ai/version-control/diff', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, from: 'HEAD~1', to: 'HEAD' }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.error) {
        throw new Error(payload?.error || 'Diff request failed');
      }
      setDiffPreview(payload?.diff ?? '');
      setActionMessage('Latest repository diff loaded.');
    } catch (error) {
      console.error('Diff load failed', error);
      setActionError((error as Error)?.message ?? 'Unable to load diff');
      setDiffPreview(null);
    } finally {
      setIsLoadingDiff(false);
    }
  }, [filePath, hasFileSelected]);

  const handleRestoreFile = useCallback(async () => {
    if (!hasFileSelected) {
      setActionError('Select a file to restore.');
      return;
    }
    try {
      setIsRestoring(true);
      setActionError(null);
      setActionMessage(`Restoring ${filePath} from Git history…`);
      const response = await fetch('/api/ai/version-control/restore', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, version: 'HEAD' }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.error) {
        throw new Error(payload?.error || 'Restore failed');
      }
      setActionMessage(payload?.message ?? 'File restored from HEAD.');
      await loadFile(filePath).then((fileData) => {
        setCurrentFile({ path: filePath, content: fileData.content, lastModified: new Date().toISOString() });
      });
    } catch (error) {
      console.error('Restore failed', error);
      setActionError((error as Error)?.message ?? 'Unable to restore file');
    } finally {
      setIsRestoring(false);
    }
  }, [filePath, hasFileSelected, loadFile, setCurrentFile]);

  return (
    <div className="h-full bg-gradient-to-br from-[#0E1116]/90 via-[#1A1533]/90 to-[#351D6A]/90 text-[#E6E8EC]">
      <div className="flex h-full flex-col gap-4 px-6 pb-6 pt-4">
        <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-white/10 bg-[#141b2d]/80 px-6 py-4 text-sm shadow-[0_20px_48px_rgba(8,12,32,0.55)] backdrop-blur-2xl">
          <div className="flex flex-1 flex-col gap-1 min-w-[240px]">
            <span className="text-xs uppercase tracking-wide text-white/60">Active file</span>
            <span className="font-mono text-[13px] text-white">
              {hasFileSelected ? filePath : 'Select a file from the explorer'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGithubConnect}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-medium text-white transition hover:border-white/30"
              disabled={isConnecting}
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              {isConnecting ? 'Connecting…' : 'Connect GitHub'}
            </button>
            <button
              type="button"
              onClick={handleViewDiff}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-medium text-white transition hover:border-white/30 disabled:opacity-60"
              disabled={!hasFileSelected || isLoadingDiff}
            >
              <GitPullRequestArrow className="h-4 w-4" aria-hidden="true" />
              {isLoadingDiff ? 'Loading diff…' : 'View Diff'}
            </button>
            <button
              type="button"
              onClick={handleRestoreFile}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-medium text-white transition hover:border-white/30 disabled:opacity-60"
              disabled={!hasFileSelected || isRestoring}
            >
              <History className="h-4 w-4" aria-hidden="true" />
              {isRestoring ? 'Restoring…' : 'Restore HEAD'}
            </button>
            <button
              type="button"
              onClick={() => setDiffPreview(null)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-medium text-white transition hover:border-white/30"
            >
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Clear Diff
            </button>
          </div>
        </div>

        {(actionMessage || actionError) && (
          <div
            className={`rounded-2xl border px-5 py-3 text-sm shadow-[0_16px_40px_rgba(8,10,26,0.45)] backdrop-blur-2xl ${
              actionError ? 'border-[#FF5A6F]/40 bg-[#331924]/70 text-[#FFB4C3]' : 'border-[#7C6CFF]/40 bg-[#1d1f3a]/70 text-[#C9C5FF]'
            }`}
          >
            {actionError ?? actionMessage}
          </div>
        )}

        {diffPreview && (
          <div className="max-h-72 overflow-auto rounded-3xl border border-white/10 bg-[#0F1320]/85 p-4 font-mono text-xs text-[#F0F3FF] shadow-[0_24px_60px_rgba(8,10,26,0.55)]">
            {diffLines.map((line, index) => {
              const tone = line.startsWith('+')
                ? 'text-emerald-400'
                : line.startsWith('-')
                ? 'text-rose-400'
                : 'text-white';
              return (
                <div key={index} className={`whitespace-pre ${tone}`}>
                  {line || ' '}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-hidden rounded-3xl border border-white/10 bg-[#0F1320]/80 backdrop-blur-2xl shadow-[0_35px_80px_rgba(5,10,30,0.55)]">
          <ExplorerPanel
            tree={tree}
            currentFile={currentFile}
            setCurrentFile={setCurrentFile}
            aiFetch={aiFetch}
            loadFile={loadFile}
            saveFile={saveFile}
          />
        </div>
      </div>
    </div>
  );
};

export default ExplorerTab;
