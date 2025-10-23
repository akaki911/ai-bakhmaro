import { getBackendBaseURL } from '@/lib/env';

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

const backendBaseURL = (() => {
  try {
    return getBackendBaseURL();
  } catch (error) {
    console.warn('⚠️ [BackendURL] Failed to resolve backend base URL, falling back to relative paths.', error);
    return '';
  }
})();

/**
 * Resolve an API path against the configured backend base URL, if any.
 */
export function resolveBackendUrl(path: string): string {
  if (!path) {
    return path;
  }

  if (ABSOLUTE_URL_PATTERN.test(path)) {
    return path;
  }

  if (!backendBaseURL) {
    return path;
  }

  const normalizedBase = backendBaseURL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Resolve an array of API paths against the backend base URL.
 */
export function resolveBackendUrls(paths: string[]): string[] {
  return paths.map(resolveBackendUrl);
}
