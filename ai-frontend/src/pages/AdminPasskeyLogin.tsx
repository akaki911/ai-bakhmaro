import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ScanFace, KeyRound, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import {
  checkPasskeyAvailability,
  getWebAuthnErrorMessage,
  PasskeyEndpointResponseError
} from '../utils/webauthn_support';

type AuthStep = 'email' | 'passkey' | 'password';

const AdminPasskeyLogin: React.FC = () => {
  const navigate = useNavigate();
  const {
    login,
    loginWithPasskey,
    deviceRecognition,
    authInitialized,
    isAuthenticated,
    getAutoRouteTarget
  } = useAuth();

  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [passkeySupport, setPasskeySupport] = useState({
    supported: false,
    platformAuthenticator: false,
    conditionalUI: false
  });
  const [passkeyAttempted, setPasskeyAttempted] = useState(false);

  const recognizedDeviceSuffix = useMemo(() => {
    const deviceId = deviceRecognition?.currentDevice?.deviceId;
    return deviceId ? deviceId.slice(-6).toUpperCase() : null;
  }, [deviceRecognition]);

  useEffect(() => {
    document.title = 'AI დეველოპერ კონსოლზე შესვლა – ai.bakhmaro.co';
  }, []);

  useEffect(() => {
    if (!authInitialized) {
      return;
    }

    if (isAuthenticated) {
      const target = getAutoRouteTarget?.() ?? '/admin?tab=dashboard';
      navigate(target, { replace: true });
    }
  }, [authInitialized, getAutoRouteTarget, isAuthenticated, navigate]);

  useEffect(() => {
    const enforceHttps = () => {
      if (
        window.location.protocol !== 'https:' &&
        (window.location.hostname.includes('.replit.dev') ||
          window.location.hostname.includes('.janeway.replit.dev'))
      ) {
        const httpsUrl = window.location.href.replace('http:', 'https:');
        window.location.replace(httpsUrl);
      }
    };

    const fetchPasskeySupport = async () => {
      try {
        const support = await checkPasskeyAvailability();
        setPasskeySupport(support);
      } catch (error) {
        console.error('❌ [Admin Login] Passkey support detection failed:', error);
      }
    };

    enforceHttps();
    fetchPasskeySupport();
  }, []);

  const triggerPasskey = useCallback(async () => {
    setLoading(true);
    setStatusMessage('ბიომეტრიული მოთხოვნა იგზავნება...');
    setErrorMessage('');

    try {
      await loginWithPasskey();
      setStatusMessage('Passkey ავტორიზაცია წარმატებით დასრულდა.');
      setTimeout(() => navigate('/admin'), 600);
    } catch (error: any) {
      const friendly = getWebAuthnErrorMessage(error);
      setErrorMessage(friendly);
      setStatusMessage('');
      if (error instanceof PasskeyEndpointResponseError) {
        setStep('password');
        setPasskeyAttempted(false);
      }
    } finally {
      setLoading(false);
    }
  }, [loginWithPasskey, navigate]);

  useEffect(() => {
    if (step === 'passkey' && !passkeyAttempted) {
      setPasskeyAttempted(true);
      if (passkeySupport.supported) {
        triggerPasskey();
      } else {
        setErrorMessage('Passkey-ები არ არის მხარდაჭერილი ამ მოწყობილობაზე.');
      }
    }
  }, [passkeyAttempted, passkeySupport.supported, step, triggerPasskey]);

  const resetMessages = () => {
    setErrorMessage('');
    setStatusMessage('');
  };

  const handleEmailSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setErrorMessage('გთხოვთ შეიყვანოთ ელ. ფოსტა');
      return;
    }

    resetMessages();
    setPasskeyAttempted(false);
    setStep('passkey');
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!password.trim()) {
      setErrorMessage('გთხოვთ შეიყვანოთ პაროლი');
      return;
    }

    setLoading(true);
    resetMessages();

    try {
      await login(email, password, trustDevice);
      navigate('/admin');
    } catch (error: any) {
      setErrorMessage(error?.message || 'ავტორიზაცია ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    resetMessages();
    setStep('email');
    setPasskeyAttempted(false);
    setPassword('');
  };

  const handleFallback = () => {
    resetMessages();
    setStep('password');
  };

  const passkeyUnavailable = step === 'passkey' && !passkeySupport.supported;

  return (
    <div className="ai-gateway">
      <div className="ai-gateway__matrix" aria-hidden="true" />
      <div className="ai-gateway__particles" aria-hidden="true" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <div className="mb-10 flex items-center justify-between text-sm text-cyan-200/80">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-[0.8rem] font-medium">
              <ShieldCheck className="h-4 w-4" />
              <span>სუპერ ადმინი</span>
            </div>
            <button
              type="button"
              onClick={handleBackToEmail}
              className={`inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition ${
                step === 'email' ? 'pointer-events-none opacity-0' : 'hover:text-cyan-200'
              }`}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>სხვა მისამართი</span>
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-10 backdrop-blur-2xl shadow-[0_25px_80px_rgba(15,23,42,0.65)]">
            <header className="mb-10 space-y-4 text-center">
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                AI დეველოპერ კონსოლზე შესვლა
              </h1>
              <p className="text-sm text-slate-400">
                {step === 'email'
                  ? 'შეიყვანეთ სუპერ ადმინისტრატორის ელ. ფოსტა'
                  : `${email}`}
              </p>
            </header>

            {recognizedDeviceSuffix && (
              <div className="mb-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-3 text-sm text-cyan-100">
                მოწყობილობა აღიარებულია • იდენტიფიკატორი ‑ {recognizedDeviceSuffix}
              </div>
            )}

            {errorMessage && (
              <div className="mb-6 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-3 text-sm text-rose-100">
                {errorMessage}
              </div>
            )}

            {statusMessage && (
              <div className="mb-6 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm text-cyan-100">
                {statusMessage}
              </div>
            )}

            {step === 'email' && (
              <form className="space-y-6" onSubmit={handleEmailSubmit}>
                <div className="space-y-2 text-left">
                  <label htmlFor="admin-email" className="text-sm text-slate-200">
                    ელ. ფოსტა
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="glow-input w-full rounded-2xl px-4 py-3 text-base text-white placeholder-slate-500"
                    placeholder="super.admin@ai.bakhmaro.co"
                  />
                </div>

                <button
                  type="submit"
                  className="glow-button w-full rounded-2xl px-4 py-3 text-base font-semibold text-slate-950"
                >
                  {loading ? 'იგზავნება...' : 'გაგრძელება'}
                </button>
              </form>
            )}

            {step === 'passkey' && (
              <div className="space-y-8 text-center">
                <div className="flex flex-col items-center gap-3 text-slate-100">
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 p-3">
                    <ScanFace className="h-7 w-7 text-cyan-200" />
                  </span>
                  <div>
                    <p className="text-lg font-medium text-white">Passkey-თ ავტორიზაცია</p>
                    <p className="mt-1 text-sm text-slate-400">დაადასტურეთ წვდომა {email}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={triggerPasskey}
                  disabled={loading || passkeyUnavailable}
                  className={`glow-button w-full rounded-2xl px-4 py-3 text-base font-semibold ${
                    loading || passkeyUnavailable ? 'opacity-70' : ''
                  }`}
                >
                  {loading ? (
                    <span className="inline-flex items-center justify-center gap-3 text-slate-950">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                      ავტორიზაცია...
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-3 text-slate-950">
                      <ScanFace className="h-5 w-5" />
                      Passkey-თ ავტორიზაცია
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleFallback}
                  className="text-sm font-medium text-cyan-200 transition hover:text-cyan-100"
                >
                  პაროლით შესვლა
                </button>
              </div>
            )}

            {step === 'password' && (
              <form className="space-y-6" onSubmit={handlePasswordSubmit}>
                <div className="flex items-center justify-between text-left">
                  <div className="flex items-center gap-3 text-slate-200">
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 p-2">
                      <KeyRound className="h-4 w-4 text-cyan-200" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-white">პაროლით შესვლა</p>
                      <p className="text-xs text-slate-500">Passkey ავტორიზაცია ვერ მოხერხდა?</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('passkey');
                      setPasskeyAttempted(false);
                      resetMessages();
                    }}
                    className="text-xs font-medium text-cyan-200 transition hover:text-cyan-100"
                  >
                    Passkey-თ ავტორიზაცია
                  </button>
                </div>

                <div className="space-y-2 text-left">
                  <label htmlFor="admin-password" className="text-sm text-slate-200">
                    პაროლი
                  </label>
                  <input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="glow-input w-full rounded-2xl px-4 py-3 text-base text-white placeholder-slate-500"
                    placeholder="••••••••"
                  />
                </div>

                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={trustDevice}
                    onChange={(event) => setTrustDevice(event.target.checked)}
                    className="h-4 w-4 rounded border-cyan-400/40 bg-transparent text-cyan-300 focus:ring-0"
                  />
                  <span>ამ მოწყობილობის ნდობა</span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className={`glow-button w-full rounded-2xl px-4 py-3 text-base font-semibold text-slate-950 ${
                    loading ? 'opacity-70' : ''
                  }`}
                >
                  {loading ? 'ვერიფიკაცია...' : 'შესვლა'}
                </button>
              </form>
            )}
          </div>

          <footer className="mt-12 flex flex-col items-center gap-4 text-xs text-slate-500 sm:flex-row sm:justify-between">
            <span className="tracking-[0.3em] text-slate-400">AI.BAKHMARO.CO</span>
            <div className="flex items-center gap-6">
              <a href="/security-policy" className="transition hover:text-cyan-200">
                უსაფრთხოების პოლიტიკა
              </a>
              <a href="/terms" className="transition hover:text-cyan-200">
                მოხმარებლის წესები
              </a>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default AdminPasskeyLogin;

