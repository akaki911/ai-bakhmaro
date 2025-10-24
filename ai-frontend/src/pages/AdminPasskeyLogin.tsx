import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ScanFace,
  KeyRound,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  RefreshCw,
  BadgeCheck,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import {
  checkPasskeyAvailability,
  getWebAuthnErrorMessage,
  PasskeyEndpointResponseError
} from '../utils/webauthn_support';

type AuthStep = 'email' | 'passkey' | 'password';
type StepStatus = 'loading' | 'ok' | 'warning' | 'error';

const AdminPasskeyLogin: React.FC = () => {
  const navigate = useNavigate();
  const {
    login,
    loginWithPasskey,
    deviceRecognition,
    authInitialized,
    isAuthenticated,
    getAutoRouteTarget,
    routeAdvice,
    retryPreflightChecks
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
  const [retryingPreflight, setRetryingPreflight] = useState(false);
  const [passkeySupportChecked, setPasskeySupportChecked] = useState(false);

  const preflightChecks = useMemo(() => {
    const steps: Array<{ key: string; label: string; status: StepStatus; detail: string }> = [];
    const routeReason = routeAdvice?.reason ?? '';

    const sessionStatus: StepStatus = !authInitialized || retryingPreflight
      ? 'loading'
      : isAuthenticated
        ? 'ok'
        : 'warning';
    const sessionDetail = sessionStatus === 'ok'
      ? 'სესია უკვე აქტიურია.'
      : !authInitialized || retryingPreflight
        ? 'სესიის სტატუსი მოწმდება.'
        : 'საჭიროა ადმინისტრატორის ავტორიზაცია.';
    steps.push({ key: 'session', label: 'სესიების ვალიდაცია', status: sessionStatus, detail: sessionDetail });

    let policyStatus: StepStatus = !authInitialized || retryingPreflight ? 'loading' : 'ok';
    let policyDetail = !authInitialized || retryingPreflight
      ? 'წვდომის პოლიტიკის შემოწმება მიმდინარეობს.'
      : 'პოლიტიკა მზადაა ავტორიზაციისთვის.';

    if (!authInitialized || retryingPreflight) {
      // keep loading state
    } else if (['Route advice fetch failed', 'Route advice fetch error'].includes(routeReason)) {
      policyStatus = 'error';
      policyDetail = 'სერვერთან კავშირი ვერ ხერხდება. სცადეთ ხელახლა ან გამოიყენეთ პაროლის რეჟიმი.';
    } else if (routeReason === 'non_json_route_advice') {
      policyStatus = 'warning';
      policyDetail = 'დაიბრუნა მოულოდნელი პასუხი, გამოყენებულია უსაფრთხო ფოლბექი.';
    } else if (routeAdvice?.target && routeAdvice.target !== '/login') {
      policyDetail = 'პოლიტიკა უკვე უბრუნებს ავტორიზებულ როუტს.';
    }

    steps.push({ key: 'policy', label: 'წვდომის პოლიტიკა', status: policyStatus, detail: policyDetail });

    let deviceStatus: StepStatus;
    let deviceDetail: string;

    if (!authInitialized || retryingPreflight) {
      deviceStatus = 'loading';
      deviceDetail = 'მოწყობილობის იდენტიფიკაცია მიმდინარეობს.';
    } else if (deviceRecognition?.isRecognizedDevice) {
      const trusted = deviceRecognition?.currentDevice?.trusted === true;
      deviceStatus = trusted ? 'ok' : 'warning';
      deviceDetail = trusted
        ? 'ნდობადი მოწყობილობა დაფიქსირდა.'
        : 'მოწყობილობა ამოცნობილია, მაგრამ ნდობა საჭიროებს დადასტურებას.';
    } else {
      deviceStatus = 'warning';
      deviceDetail = 'ახალი მოწყობილობა — საჭირო იქნება დამატებითი ვერიფიკაცია.';
    }

    steps.push({ key: 'device', label: 'მოწყობილობის ვერიფიკაცია', status: deviceStatus, detail: deviceDetail });

    return steps;
  }, [authInitialized, deviceRecognition, isAuthenticated, retryingPreflight, routeAdvice]);

  const statusStyles: Record<StepStatus, string> = {
    loading: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-100',
    ok: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
    warning: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
    error: 'border-rose-500/40 bg-rose-500/10 text-rose-100'
  };

  const detailStyles: Record<StepStatus, string> = {
    loading: 'text-cyan-50/90',
    ok: 'text-emerald-50/90',
    warning: 'text-amber-50/90',
    error: 'text-rose-50/90'
  };

  const renderStatusIcon = (status: StepStatus) => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="h-4 w-4 text-emerald-200" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-200" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-rose-200" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />;
    }
  };

  const recognizedDeviceSuffix = useMemo(() => {
    const deviceId = deviceRecognition?.currentDevice?.deviceId;
    return deviceId ? deviceId.slice(-6).toUpperCase() : null;
  }, [deviceRecognition]);

  const preflightBanner = useMemo(() => {
    if (!authInitialized) {
      return {
        variant: 'info' as const,
        message: 'ვამოწმებთ სესიას და მოწყობილობის ნდობას...',
        showSpinner: true,
        showRetry: false
      };
    }

    const reason = routeAdvice?.reason ?? '';

    if (['Route advice fetch failed', 'Route advice fetch error'].includes(reason)) {
      return {
        variant: 'error' as const,
        message: 'სერვერთან კავშირი ვერ მოხერხდა. სცადეთ ხელახლა ან გამოიყენეთ პაროლის რეჟიმი.',
        showRetry: true
      };
    }

    if (reason === 'non_json_route_advice') {
      return {
        variant: 'warning' as const,
        message: 'სესიის შემოწმება დააბრუნა მოულოდნელი პასუხი. გამოყენებულია უსაფრთხო ფოლბექი.',
        showRetry: true
      };
    }

    if (routeAdvice?.authenticated && routeAdvice.role && routeAdvice.role !== 'SUPER_ADMIN') {
      const target = routeAdvice.target && routeAdvice.target !== '/login' ? routeAdvice.target : undefined;
      return {
        variant: 'warning' as const,
        message: 'თქვენ არ ხართ ავტორიზებული ადმინისტრაციულ პანელში. გამოიყენეთ მომხმარებლის პორტალი.',
        ctaHref: target,
        ctaLabel: target ? 'გადასვლა მომხმარებლის პორტალზე' : undefined,
        showRetry: false
      };
    }

    return null;
  }, [authInitialized, routeAdvice]);

  const passkeySupportDetails = useMemo(
    () => [
      {
        label: 'Passkey მხარდაჭერა',
        enabled: passkeySupport.supported,
        description: passkeySupport.supported
          ? 'ბრაუზერი მხარს უჭერს Passkey ავტორიზაციას.'
          : 'ბრაუზერი ამ დროს ვერ ამუშავებს Passkey ავტორიზაციას.'
      },
      {
        label: 'პლატფორმური ავტენტიკატორი',
        enabled: passkeySupport.platformAuthenticator,
        description: passkeySupport.platformAuthenticator
          ? 'მოწყობილობაში ჩაშენებული ავტენტიკატორი მზადაა.'
          : 'პლატფორმური ავტენტიკატორი მიუწვდომელია ამ მოწყობილობაზე.'
      },
      {
        label: 'Passkey სწრაფი გამოხმაურება',
        enabled: passkeySupport.conditionalUI,
        description: passkeySupport.conditionalUI
          ? 'ბრაუზერი უჭერს მხარს Conditional UI-ს.'
          : 'Conditional UI მიუწვდომელია; გამოჩნდება სტანდარტული ფანჯარა.'
      }
    ],
    [passkeySupport]
  );

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
      } finally {
        setPasskeySupportChecked(true);
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
    if (step !== 'passkey' || passkeyAttempted) {
      return;
    }

    if (!passkeySupportChecked) {
      return;
    }

    if (!passkeySupport.supported) {
      setErrorMessage('');
      setStatusMessage('ეს მოწყობილობა Passkey-ს არ უჭერს მხარს. გაგრძელება პაროლით.');
      setStep('password');
      return;
    }

    setPasskeyAttempted(true);
    triggerPasskey();
  }, [
    passkeyAttempted,
    passkeySupportChecked,
    passkeySupport.supported,
    step,
    triggerPasskey
  ]);

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
    if (!passkeySupportChecked) {
      setStep('passkey');
      return;
    }

    if (passkeySupport.supported) {
      setStep('passkey');
    } else {
      setStatusMessage('ეს მოწყობილობა Passkey-ს არ უჭერს მხარს. გაგრძელება პაროლით.');
      setStep('password');
    }
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

  const handleRetryPreflight = useCallback(async () => {
    if (!retryPreflightChecks) {
      return;
    }

    setRetryingPreflight(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      await retryPreflightChecks();
      setStatusMessage('სესიის შემოწმება განახლდა. სცადეთ ავტორიზაცია ხელახლა.');
    } catch (error: any) {
      const reason = String(error?.message ?? '').toLowerCase();
      const friendly = reason.includes('route advice')
        ? 'სერვერთან კავშირი ჯერ კიდევ ვერ ხერხდება. შეამოწმეთ ქსელი ან სცადეთ მოგვიანებით.'
        : 'სესიის განახლება ვერ მოხერხდა. სცადეთ პაროლის რეჟიმი.';
      setErrorMessage(friendly);
    } finally {
      setRetryingPreflight(false);
    }
  }, [retryPreflightChecks]);

  const passkeyUnavailable = step === 'passkey' && passkeySupportChecked && !passkeySupport.supported;

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

            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              {preflightChecks.map((stepState) => (
                <div
                  key={stepState.key}
                  className={`rounded-2xl border px-4 py-4 transition-colors ${statusStyles[stepState.status]}`}
                >
                  <div className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em]">
                    {renderStatusIcon(stepState.status)}
                    <span>{stepState.label}</span>
                  </div>
                  <p className={`mt-3 text-xs leading-5 ${detailStyles[stepState.status]}`}>
                    {stepState.detail}
                  </p>
                </div>
              ))}
            </div>

            {preflightBanner && (
              <div
                className={`mb-6 rounded-2xl border px-5 py-4 text-sm ${
                  preflightBanner.variant === 'error'
                    ? 'border-rose-500/50 bg-rose-500/10 text-rose-100'
                    : preflightBanner.variant === 'warning'
                      ? 'border-amber-400/40 bg-amber-500/10 text-amber-100'
                      : 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    {preflightBanner.variant === 'info' ? (
                      <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-cyan-200" />
                    ) : (
                      <AlertTriangle
                        className={`mt-0.5 h-5 w-5 ${
                          preflightBanner.variant === 'error' ? 'text-rose-200' : 'text-amber-200'
                        }`}
                      />
                    )}
                    <div className="space-y-2">
                      <p className="text-sm leading-5">{preflightBanner.message}</p>
                      {preflightBanner.ctaHref && (
                        <a
                          href={preflightBanner.ctaHref}
                          className="inline-flex items-center gap-2 text-xs font-medium text-white/90 transition hover:text-cyan-100"
                        >
                          <span>{preflightBanner.ctaLabel ?? 'გაგრძელება'}</span>
                        </a>
                      )}
                    </div>
                  </div>
                  {preflightBanner.showRetry && (
                    <button
                      type="button"
                      onClick={handleRetryPreflight}
                      disabled={retryingPreflight}
                      className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
                    >
                      {retryingPreflight ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          განახლება...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          სცადე თავიდან
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {recognizedDeviceSuffix && (
              <div className="mb-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-3 text-sm text-cyan-100">
                მოწყობილობა აღიარებულია • იდენტიფიკატორი ‑ {recognizedDeviceSuffix}
              </div>
            )}

            {passkeySupportChecked && (
              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                {passkeySupportDetails.map((detail) => (
                  <div
                    key={detail.label}
                    className={`rounded-2xl border px-4 py-3 text-left ${
                      detail.enabled
                        ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                        : 'border-slate-500/40 bg-slate-900/40 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {detail.enabled ? (
                        <BadgeCheck className="h-4 w-4 text-emerald-300" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-slate-300" />
                      )}
                      <span>{detail.label}</span>
                    </div>
                    <p
                      className={`mt-2 text-xs leading-5 ${
                        detail.enabled ? 'text-emerald-100/80' : 'text-slate-400'
                      }`}
                    >
                      {detail.description}
                    </p>
                  </div>
                ))}
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
                  {(!passkeySupportChecked || passkeySupport.supported) && (
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
                  )}
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

