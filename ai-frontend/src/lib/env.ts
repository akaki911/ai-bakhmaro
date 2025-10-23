
// src/lib/env.ts

const DEV_AI_DEFAULT = 'http://127.0.0.1:5001';
const DEV_BACKEND_DEFAULT = 'http://127.0.0.1:5002';

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

const pickFirstNonEmpty = (values: Array<string | undefined | null>): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      return stripTrailingSlashes(value.trim());
    }
  }
  return '';
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

/**
 * Resolve the primary backend URL for browser requests.
 *
 * Priority: explicit Vite envs → process envs → runtime injected config → dev default → relative origin.
 */
export function getBackendBaseURL(): string {
  const env = import.meta.env as Record<string, string | boolean | undefined> | undefined;

  const envCandidates: Array<string | undefined> = [];
  if (env) {
    envCandidates.push(
      typeof env.VITE_BACKEND_URL === 'string' ? env.VITE_BACKEND_URL : undefined,
      typeof env.VITE_API_BASE === 'string' ? env.VITE_API_BASE : undefined,
      typeof env.VITE_API_URL === 'string' ? env.VITE_API_URL : undefined,
      typeof env.VITE_GATEWAY_URL === 'string' ? env.VITE_GATEWAY_URL : undefined,
      typeof env.VITE_REMOTE_SITE_BASE === 'string' ? env.VITE_REMOTE_SITE_BASE : undefined,
    );
  }

  const processCandidates = [
    readProcessEnv('VITE_BACKEND_URL'),
    readProcessEnv('VITE_API_BASE'),
    readProcessEnv('VITE_API_URL'),
    readProcessEnv('VITE_GATEWAY_URL'),
    readProcessEnv('VITE_REMOTE_SITE_BASE'),
    readProcessEnv('BACKEND_BASE_URL'),
  ];

  const configured = pickFirstNonEmpty([...envCandidates, ...processCandidates]);
  if (configured) {
    return configured;
  }

  const runtimeConfigured = readRuntimeBackendBase();
  if (runtimeConfigured) {
    return runtimeConfigured;
  }

  if (env?.DEV) {
    return DEV_BACKEND_DEFAULT;
  }

  return '';
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

  if (env?.DEV) {
    return DEV_AI_DEFAULT;
  }

  return '';
}

// Backwards compatibility for older imports.
export function getApiBaseURL(): string {
  return getAiServiceBaseURL();
}
