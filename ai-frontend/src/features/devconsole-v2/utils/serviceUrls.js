import { getApiBaseRaw } from '../../../lib/apiBase.shared.js';

const FALLBACK_BASE = () => {
  const envBase = import.meta?.env?.VITE_APP_URL?.trim?.();
  if (envBase) {
    return envBase;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://ai.bakhmaro.co';
};

const createUrl = (value) => {
  try {
    return new URL(value);
  } catch {
    return new URL(value, `${FALLBACK_BASE()}/`);
  }
};

const resolveBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return createUrl(window.location.origin);
  }

  const apiBase = getApiBaseRaw();
  return createUrl(apiBase);
};

const isDefaultPort = (protocol, port) => {
  return (protocol === 'http:' && port === 80) || (protocol === 'https:' && port === 443);
};

const formatHostname = (hostname) => {
  return hostname.includes(':') ? `[${hostname}]` : hostname;
};

export const buildServiceOrigin = (servicePort) => {
  const baseUrl = resolveBaseUrl();

  const normalizedPort =
    typeof servicePort === 'number' && !Number.isNaN(servicePort)
      ? servicePort
      : baseUrl.port
      ? Number(baseUrl.port)
      : undefined;

  const hostname = formatHostname(baseUrl.hostname);

  if (normalizedPort && !isDefaultPort(baseUrl.protocol, normalizedPort)) {
    return `${baseUrl.protocol}//${hostname}:${normalizedPort}`;
  }

  return `${baseUrl.protocol}//${hostname}`;
};

export const buildServiceUrl = (servicePort, path = '') => {
  const origin = buildServiceOrigin(servicePort);

  if (!path) {
    return origin;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${normalizedPath}`;
};
