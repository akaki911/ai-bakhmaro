const stripTrailingSlashes = (value) => value.replace(/\/+$/, '');

const ensureLeadingSlash = (value) => (value.startsWith('/') ? value : `/${value}`);

const stripPrefix = (value, prefixes = []) => {
  for (const prefix of prefixes) {
    if (value.startsWith(prefix)) {
      return value.slice(prefix.length);
    }
  }
  return value;
};

const normalizeBase = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return trimmed === '' ? '' : stripTrailingSlashes(trimmed);
};

const buildUrlWithBase = (base, path = '', prefixes = []) => {
  const normalizedBase = normalizeBase(base);
  if (!normalizedBase) {
    return path;
  }

  const rawPath = stripPrefix(path, prefixes);
  if (!rawPath) {
    return normalizedBase;
  }

  return `${normalizedBase}${ensureLeadingSlash(rawPath)}`;
};

const normalizeCandidate = (value) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : stripTrailingSlashes(trimmed);
};

const isAbsoluteUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value);

const HOST_BACKEND_OVERRIDES = new Map([
  ['ai.bakhmaro.co', 'https://backend.ai.bakhmaro.co'],
  ['ai-bakhmaro.web.app', 'https://backend.ai.bakhmaro.co'],
  ['ai-bakhmaro.firebaseapp.com', 'https://backend.ai.bakhmaro.co'],
]);

const resolveBackendOverrideForHost = (hostname) => {
  if (typeof hostname !== 'string') {
    return undefined;
  }

  const normalized = hostname.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  const override = HOST_BACKEND_OVERRIDES.get(normalized);
  return override ? stripTrailingSlashes(override) : undefined;
};

const readImportMetaCandidates = (keys) => {
  const env = typeof import.meta !== 'undefined' && import.meta ? import.meta.env ?? {} : {};
  return keys
    .map((key) => {
      const value = env?.[key];
      return typeof value === 'string' ? value.trim() : undefined;
    })
    .filter(Boolean);
};

const readProcessEnvCandidates = (keys) => {
  if (typeof process === 'undefined' || typeof process.env === 'undefined') {
    return [];
  }

  return keys
    .map((key) => {
      const value = process.env[key];
      return typeof value === 'string' ? value.trim() : undefined;
    })
    .filter(Boolean);
};

const readRuntimeCandidates = () => {
  if (typeof window === 'undefined') {
    return [];
  }

  const globalWindow = window;
  const results = [
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
        results.push(content);
      }
    }

    const elementSources = [document.documentElement, document.body].filter(Boolean);
    const dataAttributes = ['data-backend-base', 'data-backend-base-url', 'data-backend'];
    for (const element of elementSources) {
      for (const attr of dataAttributes) {
        const value = element.getAttribute?.(attr);
        if (value) {
          results.push(value);
        }
      }
    }
  }

  return results
    .map((value) => (typeof value === 'string' ? value.trim() : undefined))
    .filter(Boolean);
};

const pickFirstAbsolute = (candidates) => {
  for (const candidate of candidates) {
    if (isAbsoluteUrl(candidate)) {
      return stripTrailingSlashes(candidate);
    }
  }
  return undefined;
};

const pickFirstRelative = (candidates) => {
  for (const candidate of candidates) {
    if (!isAbsoluteUrl(candidate)) {
      const normalized = normalizeCandidate(candidate);
      if (normalized) {
        return normalized;
      }
    }
  }
  return undefined;
};

const resolveBackendBase = () => {
  const candidateKeys = [
    'VITE_API_BASE',
    'VITE_BACKEND_URL',
    'VITE_API_URL',
    'VITE_GATEWAY_URL',
    'VITE_API_PROXY_BASE',
    'BACKEND_BASE_URL',
  ];

  const envCandidates = readImportMetaCandidates(candidateKeys);
  const processCandidates = readProcessEnvCandidates(candidateKeys);
  const runtimeCandidates = readRuntimeCandidates();

  const override = resolveBackendOverrideForHost(
    typeof window !== 'undefined' ? window.location?.hostname : undefined,
  );

  const absolute =
    pickFirstAbsolute(envCandidates) ||
    pickFirstAbsolute(processCandidates) ||
    pickFirstAbsolute(runtimeCandidates) ||
    override;

  if (absolute) {
    return absolute;
  }

  const relative =
    pickFirstRelative(envCandidates) ||
    pickFirstRelative(processCandidates) ||
    pickFirstRelative(runtimeCandidates);

  return relative || '';
};

const getEnvValue = (key) => import.meta?.env?.[key]?.trim?.() ?? '';

export const getApiBaseRaw = () => resolveBackendBase();

export const buildApiUrlRaw = (path = '') => buildUrlWithBase(getApiBaseRaw(), path, ['/api']);

export const getAiBaseRaw = () => normalizeBase(getEnvValue('VITE_AI_BASE'));

export const buildAiUrlRaw = (path = '') =>
  buildUrlWithBase(getAiBaseRaw(), path, ['/api/ai', '/ai']);

export const getAuthBaseRaw = () => normalizeBase(getEnvValue('VITE_AUTH_BASE'));

export const buildAuthUrlRaw = (path = '') =>
  buildUrlWithBase(getAuthBaseRaw(), path, ['/api/admin/auth', '/admin/auth']);

export const getFilesBaseRaw = () => normalizeBase(getEnvValue('VITE_FILES_BASE'));

export const buildFilesUrlRaw = (path = '') =>
  buildUrlWithBase(getFilesBaseRaw(), path, ['/api/files', '/files']);

export const getConfigBaseRaw = () => normalizeBase(getEnvValue('VITE_CONFIG_BASE'));

export const buildConfigUrlRaw = (path = '') =>
  buildUrlWithBase(getConfigBaseRaw(), path, ['/api/config', '/config']);
