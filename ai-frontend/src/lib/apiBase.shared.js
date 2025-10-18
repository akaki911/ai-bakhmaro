const API_PATH = '/api';

const stripTrailingSlashes = (value) => value.replace(/\/+$/, '');

export const getApiBaseRaw = () => {
  const configuredBase = import.meta?.env?.VITE_API_BASE?.trim?.();

  if (configuredBase) {
    return stripTrailingSlashes(configuredBase);
  }

  if (typeof window !== 'undefined' && window.location) {
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
