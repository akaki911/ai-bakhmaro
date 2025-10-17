import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/useAuth';

const formLabel = 'text-sm font-medium text-slate-300';
const formInput =
  'w-full rounded-md border border-slate-600 bg-slate-900/80 px-3 py-2 text-slate-100 placeholder-slate-500 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { authInitialized, isAuthenticated, login, deviceRecognition } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestedMethod = useMemo(
    () => deviceRecognition?.suggestedAuthMethod ?? 'standard',
    [deviceRecognition?.suggestedAuthMethod],
  );

  useEffect(() => {
    document.title = 'AI Developer Login – ai.bakhmaro.co';
  }, []);

  useEffect(() => {
    if (!authInitialized) {
      return;
    }

    if (isAuthenticated) {
      navigate('/index.html', { replace: true });
    }
  }, [authInitialized, isAuthenticated, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login(email.trim(), password, trustDevice);
      navigate('/index.html', { replace: true });
    } catch (cause) {
      console.error('❌ AI login failed', cause);
      const message =
        cause instanceof Error
          ? cause.message
          : 'Unable to sign in. Please check your credentials and try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const buttonDisabled = submitting || !email || !password;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-12">
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-10 shadow-2xl shadow-slate-950/60">
          <header className="mb-8 space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">AI Access</p>
            <h1 className="text-3xl font-semibold text-slate-50">Sign in to the AI Developer Console</h1>
            <p className="max-w-xl text-sm text-slate-400">
              Use your administrative credentials to continue. All traffic is routed through the AI gateway with
              secure cookies (SameSite=None; Secure; HttpOnly) and cross-origin requests automatically opt-in to
              credentials.
            </p>
          </header>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className={formLabel} htmlFor="email">
                Email address
              </label>
              <input
                autoComplete="email"
                className={formInput}
                disabled={submitting}
                id="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@ai.bakhmaro.co"
                type="email"
                value={email}
              />
            </div>

            <div className="space-y-2">
              <label className={formLabel} htmlFor="password">
                Password
              </label>
              <input
                autoComplete="current-password"
                className={formInput}
                disabled={submitting}
                id="password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                type="password"
                value={password}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm text-slate-300">
                <input
                  checked={trustDevice}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-400"
                  disabled={submitting}
                  onChange={(event) => setTrustDevice(event.target.checked)}
                  type="checkbox"
                />
                <span>Trust this device</span>
              </label>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Suggested method: {suggestedMethod}
              </span>
            </div>

            {error ? (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            <button
              className="w-full rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={buttonDisabled}
              type="submit"
            >
              {submitting ? 'Signing in…' : 'Access AI Dashboard'}
            </button>
          </form>

          <footer className="mt-10 border-t border-slate-800 pt-6 text-xs uppercase tracking-[0.3em] text-slate-600">
            Gateway-controlled access • ai.bakhmaro.co
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Login;
