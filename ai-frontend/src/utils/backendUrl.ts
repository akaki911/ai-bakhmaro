import { getBackendBaseURL, isDirectBackendDebugEnabled } from '@/lib/env';

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

let cachedBackendBaseURL: string | null = null;

const resolveBackendBaseUrl = (): string => {
  if (cachedBackendBaseURL) {
    return cachedBackendBaseURL;
  }

  try {
    const resolved = getBackendBaseURL();
    if (resolved) {
      cachedBackendBaseURL = resolved;
    }
    return resolved;
  } catch (error) {
    console.warn('⚠️ [BackendURL] Failed to resolve backend base URL, falling back to relative paths.', error);
    return '';
  }
};

const normaliseApiPath = (path: string): string => {
  if (!path) {
    return path;
  }

  if (path.startsWith('/')) {
    return path;
  }

  return `/${path}`;
};

const resolveDirectBackendUrl = (path: string): string | undefined => {
  const backendBaseURL = resolveBackendBaseUrl();
  if (!backendBaseURL) {
    return undefined;
  }

  const normalizedBase = backendBaseURL.replace(/\/+$/, '');
  const normalizedPath = normaliseApiPath(path);

  if (!normalizedBase) {
    return normalizedPath;
  }

  if (normalizedBase.startsWith('/') && normalizedPath.startsWith(`${normalizedBase}/`)) {
    return normalizedPath;
  }

  return `${normalizedBase}${normalizedPath}`;
};

export interface BackendUrlResolution {
  sameOrigin: string;
  direct?: string;
}

const createBackendUrlResolution = (path: string): BackendUrlResolution => {
  if (!path) {
    return { sameOrigin: path };
  }

  if (ABSOLUTE_URL_PATTERN.test(path)) {
    return { sameOrigin: path, direct: path };
  }

  const sameOrigin = normaliseApiPath(path);
  const direct = resolveDirectBackendUrl(sameOrigin);

  return { sameOrigin, direct };
};

export interface ResolveBackendUrlOptions {
  /** When true, prefer the direct backend URL if debugging is enabled. */
  direct?: boolean;
  /** Force usage of the direct backend URL regardless of debug flag state. */
  forceDirect?: boolean;
}

/**
 * Resolve an API path against the configured backend base URL, if any.
 */
export function resolveBackendUrl(path: string, options?: ResolveBackendUrlOptions): string {
  const resolution = createBackendUrlResolution(path);
  const debugEnabled = isDirectBackendDebugEnabled();

  const preferDirect = options?.direct ?? true;
  const shouldUseDirect =
    !!resolution.direct && (options?.forceDirect === true || (debugEnabled && preferDirect));

  if (shouldUseDirect && resolution.direct) {
    return resolution.direct;
  }

  return resolution.sameOrigin;
}

/**
 * Resolve an array of API paths against the backend base URL.
 */
export function resolveBackendUrls(paths: string[], options?: ResolveBackendUrlOptions): string[] {
  return paths.map(path => resolveBackendUrl(path, options));
}

/**
 * Provide detailed backend URL resolution information for diagnostics.
 */
export function describeBackendUrl(path: string): BackendUrlResolution {
  return createBackendUrlResolution(path);
}

export function describeBackendUrls(paths: string[]): BackendUrlResolution[] {
  return paths.map(createBackendUrlResolution);
}
