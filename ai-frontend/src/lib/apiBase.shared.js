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

const getEnvValue = (key) => import.meta?.env?.[key]?.trim?.() ?? '';

export const getApiBaseRaw = () => normalizeBase(getEnvValue('VITE_API_BASE'));

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
