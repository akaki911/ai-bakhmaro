
import React, { useCallback, useState } from 'react';
// Import Unified Console - the modernized developer console
import { UnifiedConsole } from '../../../features/unified-console/UnifiedConsole';
import { DevConsoleProvider } from '../../../contexts/DevConsoleContext';

interface ConsoleTabProps {
  hasDevConsoleAccess: boolean;
}

const ConsoleTab: React.FC<ConsoleTabProps> = ({ hasDevConsoleAccess }) => {
  if (!hasDevConsoleAccess) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-[#0E1116] via-[#1A1533] to-[#2C214E] px-6 text-[#E6E8EC]">
        <div className="max-w-md w-full rounded-3xl border border-white/10 bg-white/5 px-10 py-12 text-center backdrop-blur-2xl shadow-[0_28px_60px_rgba(8,10,26,0.6)]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-[#121622]/80 shadow-[0_16px_36px_rgba(60,32,128,0.35)]">
            <span className="text-2xl">🔒</span>
          </div>
          <div className="text-lg font-semibold tracking-wide">წვდომა აკრძალულია</div>
          <div className="mt-2 text-sm text-[#A0A4AD]">Dev Console-ზე წვდომა მხოლოდ ადმინისთრატორებს აქვთ</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-[#0E1116]/90 via-[#1A1533]/90 to-[#351D6A]/90 text-[#E6E8EC]">
      <div className="flex h-full flex-col gap-4 px-6 pb-6 pt-4">
        <GithubControlPanel />
        <div className="flex-1 rounded-3xl border border-white/10 bg-[#0F1320]/80 backdrop-blur-2xl shadow-[0_35px_80px_rgba(5,10,30,0.55)]">
          <DevConsoleProvider>
            {/* Unified Console - Comprehensive developer interface */}
            <UnifiedConsole />
          </DevConsoleProvider>
        </div>
      </div>
    </div>
  );
};

export default ConsoleTab;

const GithubControlPanel: React.FC = () => {
  const [token, setToken] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConnect = useCallback(async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      setStatus('Connecting to GitHub…');
      const response = await fetch('/api/github/connect', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() || undefined, repoUrl: repoUrl.trim() || undefined }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.error) {
        throw new Error(payload?.error || 'Failed to connect repository');
      }
      setStatus('GitHub repository connected. Gurulo can now sync commits and diffs.');
    } catch (caught) {
      console.error('GitHub connect error', caught);
      setError((caught as Error)?.message ?? 'GitHub connection failed');
      setStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [repoUrl, token]);

  return (
    <div className="rounded-3xl border border-white/10 bg-[#121a2f]/80 p-6 shadow-[0_28px_70px_rgba(10,14,40,0.55)] backdrop-blur-2xl">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Repository Sync Controls</h3>
          <p className="text-sm text-[#A0A4AD]">
            Provide a GitHub Personal Access Token and repository URL to enable Gurulo’s autonomous commit, diff, and deployment loop.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-[#C6C9D6]">Repository URL</span>
            <input
              type="url"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              placeholder="https://github.com/org/project"
              className="rounded-xl border border-white/10 bg-[#0F1526] px-3 py-2 text-white placeholder:text-white/40 focus:border-[#7C6CFF] focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-[#C6C9D6]">GitHub PAT</span>
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="ghp_…"
              className="rounded-xl border border-white/10 bg-[#0F1526] px-3 py-2 text-white placeholder:text-white/40 focus:border-[#7C6CFF] focus:outline-none"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleConnect}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7C6CFF] to-[#4B3FA8] px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(124,108,255,0.35)] transition-all hover:shadow-[0_24px_52px_rgba(124,108,255,0.45)] disabled:opacity-60"
          >
            {isSubmitting ? 'Connecting…' : 'Connect Repository'}
          </button>
          <span className="text-xs text-[#7C80A0]">
            Gurulo stores the token in the secured session for automated git operations.
          </span>
        </div>
        {(status || error) && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              error ? 'border-[#E14B8E]/40 bg-[#331926]/70 text-[#FFB3CD]' : 'border-[#7C6CFF]/40 bg-[#1e1f3f]/70 text-[#D2CEFF]'
            }`}
          >
            {error ?? status}
          </div>
        )}
      </div>
    </div>
  );
};
