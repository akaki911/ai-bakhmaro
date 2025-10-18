const API_PATH = '/api';

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

/**
 * Resolve the API base URL used by Dev Console features.
 *
 * Priority: `VITE_API_BASE` → same-origin `/api` prefix.
 */
export const getApiBase = (): string => {
  const configuredBase = import.meta.env?.VITE_API_BASE?.trim();

  if (configuredBase) {
    return stripTrailingSlashes(configuredBase);
  }

  if (typeof window !== 'undefined' && window.location) {
    const origin = `${window.location.protocol}//${window.location.host}`;
    return `${stripTrailingSlashes(origin)}${API_PATH}`;
  }

  return API_PATH;
};

export const buildApiUrl = (path: string): string => {
  const base = getApiBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${stripTrailingSlashes(base)}${normalizedPath}`;
};
