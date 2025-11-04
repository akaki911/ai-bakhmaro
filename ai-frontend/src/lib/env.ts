
// src/lib/env.ts

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

const HOST_BACKEND_OVERRIDES = new Map<string, string>([
  ['ai.bakhmaro.co', 'https://backend.ai.bakhmaro.co'],
  ['ai-bakhmaro.web.app', 'https://backend.ai.bakhmaro.co'],
  ['ai-bakhmaro.firebaseapp.com', 'https://backend.ai.bakhmaro.co'],
]);

const normalizeHostname = (value: string | undefined | null): string | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim().toLowerCase();
  return trimmed === '' ? undefined : trimmed;
};

const resolveBackendOverrideForHost = (hostname: string | undefined | null): string | undefined => {
  const normalizedHost = normalizeHostname(hostname);
  if (!normalizedHost) {
    return undefined;
  }

  const override = HOST_BACKEND_OVERRIDES.get(normalizedHost);
  if (!override) {
    return undefined;
  }

  return stripTrailingSlashes(override);
};

const pickFirstNonEmpty = (values: Array<string | undefined | null>): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      return stripTrailingSlashes(value.trim());
    }
  }
  return '';
};

const isAbsoluteUrl = (value: string | undefined): value is string =>
  typeof value === 'string' && /^https?:\/\//i.test(value.trim());

const normalizeCandidate = (value: string | undefined): string | undefined => {
  if (!value || typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : stripTrailingSlashes(trimmed);
};

const readRuntimeBackendBase = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  const globalWindow = window as Window & {
    __AI_BACKEND_URL__?: string;
    __BACKEND_BASE_URL__?: string;
    __API_BASE_URL__?: string;
    __APP_CONFIG__?: { backendUrl?: string; backend?: { url?: string } };
  };

  const runtimeCandidates: Array<string | undefined | null> = [
    globalWindow.__AI_BACKEND_URL__,
    globalWindow.__BACKEND_BASE_URL__,
    globalWindow.__API_BASE_URL__,
    globalWindow.__APP_CONFIG__?.backendUrl,
    globalWindow.__APP_CONFIG__?.backend?.url,
  ];

  if (typeof document !== 'undefined') {
    const metaNames = ['backend-base-url', 'ai-backend-url', 'gateway-backend-url'];
    for (const name of metaNames) {
      const meta = document.querySelector(`meta[name="${name}"]`);
      const content = meta?.getAttribute('content');
      if (content) {
        runtimeCandidates.push(content);
      }
    }

    const elementSources = [document.documentElement, document.body].filter(Boolean) as Element[];
    const dataAttributes = ['data-backend-base', 'data-backend-base-url', 'data-backend'];
    for (const element of elementSources) {
      for (const attr of dataAttributes) {
        const value = element.getAttribute(attr);
        if (value) {
          runtimeCandidates.push(value);
        }
      }
    }
  }

  const resolved = pickFirstNonEmpty(runtimeCandidates);
  if (resolved) {
    console.info('ℹ️ [BackendURL] Using runtime-provided backend base URL:', resolved);
  }
  return resolved;
};

const readProcessEnv = (key: string): string | undefined => {
  if (typeof process === 'undefined' || typeof process.env === 'undefined') {
    return undefined;
  }
  const value = process.env[key];
  return value && value.trim() !== '' ? value.trim() : undefined;
};

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalized);
  }

  return false;
};

/**
 * Resolve the primary backend URL for browser requests.
 *
 * Priority: explicit Vite envs → process envs → runtime injected config → dev default → relative origin.
 */
export function getBackendBaseURL(): string {
  const env = import.meta.env as Record<string, string | boolean | undefined> | undefined;

  const envCandidates: Array<string | undefined> = [];
  const envRelativeFallbacks: Array<string | undefined> = [];
  if (env) {
    const envValues: Array<string | undefined> = [
      typeof env.VITE_BACKEND_URL === 'string' ? env.VITE_BACKEND_URL : undefined,
      typeof env.VITE_API_BASE === 'string' ? env.VITE_API_BASE : undefined,
      typeof env.VITE_API_URL === 'string' ? env.VITE_API_URL : undefined,
      typeof env.VITE_GATEWAY_URL === 'string' ? env.VITE_GATEWAY_URL : undefined,
      typeof env.VITE_API_PROXY_BASE === 'string' ? env.VITE_API_PROXY_BASE : undefined,
    ];

    for (const candidate of envValues) {
      const normalized = normalizeCandidate(candidate);
      if (!normalized) {
        continue;
      }

      if (isAbsoluteUrl(normalized)) {
        envCandidates.push(normalized);
      } else {
        envRelativeFallbacks.push(normalized);
      }
    }
  }

  const processValues = [
    readProcessEnv('VITE_BACKEND_URL'),
    readProcessEnv('VITE_API_BASE'),
    readProcessEnv('VITE_API_URL'),
    readProcessEnv('VITE_GATEWAY_URL'),
    readProcessEnv('VITE_API_PROXY_BASE'),
    readProcessEnv('BACKEND_BASE_URL'),
  ];

  const processCandidates: Array<string | undefined> = [];
  const processRelativeFallbacks: Array<string | undefined> = [];
  for (const candidate of processValues) {
    const normalized = normalizeCandidate(candidate);
    if (!normalized) {
      continue;
    }

    if (isAbsoluteUrl(normalized)) {
      processCandidates.push(normalized);
    } else {
      processRelativeFallbacks.push(normalized);
    }
  }

  const configured = pickFirstNonEmpty([...envCandidates, ...processCandidates]);
  if (configured) {
    return configured;
  }

  const runtimeConfigured = readRuntimeBackendBase();
  if (runtimeConfigured) {
    return runtimeConfigured;
  }

  const hostOverride =
    typeof window !== 'undefined'
      ? resolveBackendOverrideForHost(window.location?.hostname ?? undefined)
      : undefined;

  if (hostOverride) {
    console.info('ℹ️ [BackendURL] Using hostname override for backend base URL:', hostOverride);
    return hostOverride;
  }

  const relativeConfigured = pickFirstNonEmpty([...envRelativeFallbacks, ...processRelativeFallbacks]);
  if (relativeConfigured) {
    console.warn(
      '⚠️ [BackendURL] Using relative backend base path. Configure VITE_BACKEND_URL for direct backend access.',
      relativeConfigured,
    );
    return relativeConfigured;
  }

  return '';
}

/**
 * Flag indicating whether cross-origin direct backend calls are authorised for debugging.
 *
 * The flag defaults to false unless explicitly enabled via Vite/Process envs or a runtime hint.
 */
export function isDirectBackendDebugEnabled(): boolean {
  const env = import.meta.env as Record<string, string | boolean | undefined> | undefined;

  if (env) {
    const envValue =
      env.VITE_DEBUG_DIRECT_BACKEND ??
      env.VITE_DIRECT_BACKEND_DEBUG ??
      env.VITE_ENABLE_DIRECT_BACKEND_DEBUG ??
      env.VITE_ALLOW_DIRECT_BACKEND_DEBUG;

    if (typeof envValue !== 'undefined') {
      return parseBoolean(envValue);
    }
  }

  const processValue =
    readProcessEnv('VITE_DEBUG_DIRECT_BACKEND') ??
    readProcessEnv('DEBUG_DIRECT_BACKEND') ??
    readProcessEnv('ENABLE_DIRECT_BACKEND_DEBUG');

  if (typeof processValue !== 'undefined') {
    return parseBoolean(processValue);
  }

  if (typeof window !== 'undefined') {
    const globalWindow = window as Window & { __DEBUG_DIRECT_BACKEND__?: unknown };
    if (typeof globalWindow.__DEBUG_DIRECT_BACKEND__ !== 'undefined') {
      return Boolean(globalWindow.__DEBUG_DIRECT_BACKEND__);
    }
  }

  return false;
}

export function shouldPreferDirectBackendRequests(globalWindow?: Window): boolean {
  const hostname =
    globalWindow?.location?.hostname ??
    (typeof window !== 'undefined' ? window.location?.hostname : undefined);

  return !!resolveBackendOverrideForHost(hostname);
}

/**
 * Resolve the AI service base URL for direct-to-microservice fallbacks.
 *
 * Priority: `VITE_AI_SERVICE_URL` → `VITE_API_URL` (legacy) → dev default → relative.
 */
export function getAiServiceBaseURL(): string {
  const env = import.meta.env;
  const configuredAi = env?.VITE_AI_SERVICE_URL?.trim();
  const legacyApi = env?.VITE_API_URL?.trim();

  if (configuredAi) {
    return stripTrailingSlashes(configuredAi);
  }

  if (legacyApi) {
    return stripTrailingSlashes(legacyApi);
  }

  return '';
}

// Backwards compatibility for older imports.
export function getApiBaseURL(): string {
  return getAiServiceBaseURL();
}
