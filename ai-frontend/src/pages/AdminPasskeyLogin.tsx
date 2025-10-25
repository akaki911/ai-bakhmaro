import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startAuthentication } from '@simplewebauthn/browser';
import { Chrome, Fingerprint, Github, Loader2 } from 'lucide-react';

import { useAuth } from '../contexts/useAuth';
import { ensureWebAuthnReady, getWebAuthnErrorMessage } from '../utils/webauthn_support';
import { isDirectBackendDebugEnabled } from '../lib/env';
import type { BackendAwareRequestInit } from '../setupFetch';

const PASSKEY_OPTIONS_ENDPOINT = '/api/admin/webauthn/login-options';
const PASSKEY_VERIFY_ENDPOINT = '/api/admin/webauthn/login-verify';

const createBackendPostInit = (payload: unknown): RequestInit => {
  const baseInit: BackendAwareRequestInit = {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload ?? {}),
  };

  if (isDirectBackendDebugEnabled()) {
    baseInit.backend = { ...(baseInit.backend ?? {}), preferDirectBackend: true };
  }

  return baseInit;
};

const oauthProviders = [
  { name: 'Google', Icon: Chrome },
  { name: 'GitHub', Icon: Github },
];

const AdminPasskeyLogin: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const { login, authInitialized, isAuthenticated, getAutoRouteTarget } = auth;
  const refreshUserRole = 'refreshUserRole' in auth ? auth.refreshUserRole : undefined;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [banner, setBanner] = useState<{ tone: 'error' | 'success'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  useEffect(() => {
    document.title = 'შესვლა – ai.bakhmaro.co';
  }, []);

  useEffect(() => {
    if (!authInitialized || !isAuthenticated) {
      return;
    }

    const target = getAutoRouteTarget?.() ?? '/admin?tab=dashboard';
    navigate(target, { replace: true });
  }, [authInitialized, getAutoRouteTarget, isAuthenticated, navigate]);

  const handleEmailPasswordLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    if (!email.trim() || !password.trim()) {
      setFormError('გთხოვთ შეიყვანოთ ელ. ფოსტა და პაროლი.');
      return;
    }

    setFormError('');
    setBanner(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password, false);
      const target = getAutoRouteTarget?.() ?? '/admin?tab=dashboard';
      navigate(target, { replace: true });
    } catch (error: any) {
      console.warn('Email/password login failed:', error);
      setFormError(error?.message || 'ავტორიზაცია ვერ მოხერხდა. სცადეთ ხელახლა.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasskeyLogin = async () => {
    if (passkeyLoading) {
      return;
    }

    setBanner(null);
    setFormError('');
    setPasskeyLoading(true);

    try {
      await ensureWebAuthnReady();

      const optionsResponse = await fetch(PASSKEY_OPTIONS_ENDPOINT, createBackendPostInit({})).catch((error) => {
        console.warn('Passkey options fetch failed:', error);
        throw new Error('passkey-options-network');
      });

      if (!optionsResponse.ok) {
        console.warn('Passkey options response not ok:', optionsResponse.status);
        throw new Error('passkey-options-network');
      }

      const optionsPayload = await optionsResponse
        .json()
        .catch((error) => {
          console.warn('Passkey options JSON parse failed:', error);
          throw new Error('passkey-options-invalid');
        });

      const publicKeyOptions = optionsPayload?.publicKey ?? optionsPayload?.options;
      if (!publicKeyOptions || typeof publicKeyOptions !== 'object') {
        throw new Error('passkey-options-invalid');
      }

      const credential = await startAuthentication({
        optionsJSON: publicKeyOptions,
      });

      const verifyResponse = await fetch(
        PASSKEY_VERIFY_ENDPOINT,
        createBackendPostInit({ credential }),
      ).catch((error) => {
        console.warn('Passkey verify fetch failed:', error);
        throw new Error('passkey-verify-network');
      });

      if (!verifyResponse.ok) {
        console.warn('Passkey verify response not ok:', verifyResponse.status);
        throw new Error('passkey-verify-network');
      }

      const verification = await verifyResponse
        .json()
        .catch((error) => {
          console.warn('Passkey verify JSON parse failed:', error);
          throw new Error('passkey-verify-invalid');
        });

      if (!verification?.success) {
        const serverMessage = typeof verification?.error === 'string' ? verification.error : undefined;
        throw new Error(serverMessage || 'passkey-verify-failed');
      }

      await refreshUserRole?.();
      const target = getAutoRouteTarget?.() ?? '/admin?tab=dashboard';
      navigate(target, { replace: true });
    } catch (error: any) {
      console.warn('Passkey login failed:', error);

      const errorCode = error?.message;
      if (
        errorCode === 'passkey-options-network' ||
        errorCode === 'passkey-options-invalid' ||
        errorCode === 'passkey-verify-network' ||
        errorCode === 'passkey-verify-invalid' ||
        error?.name === 'TypeError'
      ) {
        setBanner({ tone: 'error', message: 'Passkey სერვერი მიუწვდომელია. სცადეთ მოგვიანებით.' });
        return;
      }

      setBanner({ tone: 'error', message: getWebAuthnErrorMessage(error) });
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#6E00FF] via-[#3B0066] to-[#0F0624] px-4 py-10 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl transition md:p-8 dark:bg-black/20">
          <div className="space-y-8">
            <header className="space-y-3 text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">ai.bakhmaro.co · გურულო</p>
              <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">შესვლა</h1>
              <p className="text-sm text-white/70">შესვლა AI დეველოპერ კონსოლში</p>
            </header>

            {banner ? (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  banner.tone === 'error'
                    ? 'border-rose-400/40 bg-rose-500/20 text-rose-100'
                    : 'border-emerald-400/40 bg-emerald-500/20 text-emerald-50'
                }`}
              >
                {banner.message}
              </div>
            ) : null}

            <form className="space-y-5" onSubmit={handleEmailPasswordLogin}>
              <div className="space-y-1 text-left">
                <label htmlFor="login-email" className="text-sm font-medium text-white/80">
                  ელ. ფოსტა
                </label>
                <input
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/80 px-4 py-3 text-sm text-slate-900 placeholder-white/60 shadow-inner focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#7B1DFF] dark:bg-white/10 dark:text-white dark:placeholder-white/30"
                  placeholder="admin@ai.bakhmaro.co"
                />
              </div>

              <div className="space-y-1 text-left">
                <label htmlFor="login-password" className="text-sm font-medium text-white/80">
                  პაროლი
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/80 px-4 py-3 text-sm text-slate-900 placeholder-white/60 shadow-inner focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#7B1DFF] dark:bg-white/10 dark:text-white dark:placeholder-white/30"
                  placeholder="••••••••"
                />
              </div>

              {formError ? (
                <div className="rounded-xl border border-rose-400/30 bg-rose-500/20 px-4 py-2 text-sm text-rose-100">
                  {formError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#6E00FF] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0F0624]/40 transition hover:bg-[#5C00E6] focus:outline-none focus:ring-2 focus:ring-[#7B1DFF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    მიმდინარეობს...
                  </>
                ) : (
                  'შესვლა'
                )}
              </button>
            </form>

            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/50">
              <span className="h-px flex-1 bg-white/20" />
              <span>ან</span>
              <span className="h-px flex-1 bg-white/20" />
            </div>

            <div className="flex justify-center gap-3">
              {oauthProviders.map(({ name, Icon }) => (
                <button
                  key={name}
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/80 transition hover:bg-white/20"
                  aria-label={`${name} OAuth`}
                  disabled
                >
                  <Icon className="h-5 w-5" />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handlePasskeyLogin}
              disabled={passkeyLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {passkeyLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  ავტორიზაცია...
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4" />
                  Use Passkey
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPasskeyLogin;

