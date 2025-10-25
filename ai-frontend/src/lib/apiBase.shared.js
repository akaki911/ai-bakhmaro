const API_PATH = '/api';

const stripTrailingSlashes = (value) => value.replace(/\/+$/, '');

const HOST_BACKEND_OVERRIDES = new Map([
  ['ai.bakhmaro.co', 'https://backend.ai.bakhmaro.co/api'],
  ['ai-bakhmaro.web.app', 'https://backend.ai.bakhmaro.co/api'],
  ['ai-bakhmaro.firebaseapp.com', 'https://backend.ai.bakhmaro.co/api'],
]);

const normalizeHostname = (value) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim().toLowerCase();
  return trimmed === '' ? undefined : trimmed;
};

const resolveHostOverride = (hostname) => {
  const normalized = normalizeHostname(hostname);
  if (!normalized) {
    return undefined;
  }

  const override = HOST_BACKEND_OVERRIDES.get(normalized);
  return override ? stripTrailingSlashes(override) : undefined;
};

export const getApiBaseRaw = () => {
  const configuredBase = import.meta?.env?.VITE_API_BASE?.trim?.();

  if (configuredBase) {
    return stripTrailingSlashes(configuredBase);
  }

  if (typeof window !== 'undefined' && window.location) {
    const override = resolveHostOverride(window.location.hostname);
    if (override) {
      console.info('ℹ️ [APIBase] Using hostname override for API base URL:', override);
      return override;
    }

    const origin = `${window.location.protocol}//${window.location.host}`;
    return `${stripTrailingSlashes(origin)}${API_PATH}`;
  }

  return API_PATH;
};

export const buildApiUrlRaw = (path) => {
  const base = getApiBaseRaw();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${stripTrailingSlashes(base)}${normalizedPath}`;
};
