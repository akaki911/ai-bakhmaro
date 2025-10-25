import { describeBackendUrl } from '@/utils/backendUrl';
import { isDirectBackendDebugEnabled } from '@/lib/env';

const API_PATH_PATTERN = /^\/api(\/|$)/i;

const extractRequestUrl = (input: RequestInfo | URL): string | undefined => {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  if (input instanceof Request) {
    return input.url;
  }

  try {
    return String(input);
  } catch {
    return undefined;
  }
};

const shouldForceOmitCredentialsFactory = (globalWindow?: Window) => {
  return (requestUrl: string | undefined): boolean => {
    if (!requestUrl) {
      return false;
    }

    try {
      const baseOrigin = globalWindow?.location?.origin;
      const parsedUrl = baseOrigin ? new URL(requestUrl, baseOrigin) : new URL(requestUrl);
      const hostname = parsedUrl.hostname.toLowerCase();

      return hostname === 'securetoken.googleapis.com' || hostname.endsWith('.googleapis.com');
    } catch {
      return false;
    }
  };
};

const isSameOriginRequestFactory = (globalWindow?: Window) => {
  return (requestUrl: string | undefined): boolean => {
    if (!requestUrl) {
      return true;
    }

    if (requestUrl.startsWith('/') && !requestUrl.startsWith('//')) {
      return true;
    }

    const currentOrigin = globalWindow?.location?.origin;
    if (!currentOrigin) {
      return false;
    }

    try {
      const parsedUrl = new URL(requestUrl, currentOrigin);
      return parsedUrl.origin === currentOrigin;
    } catch {
      return false;
    }
  };
};

const normaliseRelativeUrl = (url: string, globalWindow?: Window): string => {
  if (url.startsWith('/') && !url.startsWith('//')) {
    return url;
  }

  const baseOrigin = globalWindow?.location?.origin;
  if (!baseOrigin) {
    return url;
  }

  try {
    const parsed = new URL(url, baseOrigin);
    if (parsed.origin === baseOrigin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return url;
  } catch {
    return url;
  }
};

const mergeRequestInit = (request: Request, overrides?: RequestInit): RequestInit => {
  const clone = request.clone();
  const headers = overrides?.headers ?? new Headers(clone.headers);

  const merged: RequestInit = {
    method: overrides?.method ?? clone.method,
    headers,
    body: overrides?.body ?? (clone.body ?? null),
    cache: overrides?.cache ?? clone.cache,
    credentials: overrides?.credentials ?? clone.credentials,
    integrity: overrides?.integrity ?? clone.integrity,
    keepalive: overrides?.keepalive ?? clone.keepalive,
    mode: overrides?.mode ?? clone.mode,
    redirect: overrides?.redirect ?? clone.redirect,
    referrer: overrides?.referrer ?? clone.referrer,
    referrerPolicy: overrides?.referrerPolicy ?? clone.referrerPolicy,
    signal: overrides?.signal ?? clone.signal,
  };

  return merged;
};

export type BackendFlagConfig = {
  preferDirectBackend?: boolean;
  directBackend?: boolean;
  diagnostics?: boolean;
  allowDirectBackend?: boolean;
};

export type BackendAwareRequestInit = RequestInit & {
  backend?: BackendFlagConfig;
};

const readBackendPreference = (config?: BackendFlagConfig): boolean => {
  if (!config) {
    return false;
  }

  return (
    config.preferDirectBackend === true ||
    config.directBackend === true ||
    config.diagnostics === true ||
    config.allowDirectBackend === true
  );
};

const extractBackendMetadata = (
  init?: RequestInit,
): { sanitizedInit: RequestInit | undefined; preferDirect: boolean } => {
  if (!init) {
    return { sanitizedInit: undefined, preferDirect: false };
  }

  const backendAware = init as BackendAwareRequestInit;
  const preferDirect = readBackendPreference(backendAware.backend);
  const { backend: _backend, ...rest } = backendAware;

  return { sanitizedInit: rest, preferDirect };
};

const extractBackendPreferenceFromInput = (input: RequestInfo | URL): boolean => {
  if (input instanceof Request) {
    const possible = input as Request & { backend?: BackendFlagConfig };
    if (possible.backend) {
      return readBackendPreference(possible.backend);
    }
  }

  return false;
};

const cloneRequestForUrl = (
  request: Request,
  init: RequestInit | undefined,
  targetUrl: string,
): Request => {
  const mergedInit = mergeRequestInit(request, init);
  const { sanitizedInit } = extractBackendMetadata(mergedInit);
  return new Request(targetUrl, sanitizedInit ?? mergedInit);
};

type RewrittenRequest = {
  input: RequestInfo | URL;
  init: RequestInit | undefined;
  /** Final request URL string for logging purposes. */
  requestUrl?: string;
  sameOriginUrl?: string;
  directBackendUrl?: string;
  /**
   * Optional fallback request that should be attempted if the primary network request
   * fails with a recoverable network error (e.g. DNS resolution failure).
   */
  fallbackInput?: RequestInfo | URL;
};

const rewriteBackendRequest = (
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  globalWindow?: Window,
): RewrittenRequest => {
  const requestUrl = extractRequestUrl(input);
  if (!requestUrl) {
    return { input, init, requestUrl };
  }

  const relativeUrl = normaliseRelativeUrl(requestUrl, globalWindow);
  if (!relativeUrl.startsWith('/') || !API_PATH_PATTERN.test(relativeUrl)) {
    return { input, init, requestUrl };
  }

  const resolution = describeBackendUrl(relativeUrl);
  const sameOriginUrl = resolution.sameOrigin;
  const directBackendUrl = resolution.direct;

  let nextInput = input;
  let nextInit = init;

  if (sameOriginUrl && requestUrl !== sameOriginUrl) {
    if (typeof input === 'string' || input instanceof URL) {
      nextInput = sameOriginUrl;
    } else if (input instanceof Request) {
      nextInput = cloneRequestForUrl(input, init, sameOriginUrl);
      nextInit = undefined;
    } else {
      nextInput = sameOriginUrl;
    }
  }

  let fallbackInput: RequestInfo | URL | undefined;
  if (directBackendUrl && directBackendUrl !== sameOriginUrl) {
    if (typeof input === 'string' || input instanceof URL) {
      fallbackInput = directBackendUrl;
    } else if (input instanceof Request) {
      fallbackInput = cloneRequestForUrl(input, init, directBackendUrl);
    } else {
      fallbackInput = directBackendUrl;
    }
  }

  return {
    input: nextInput,
    init: nextInit,
    requestUrl: extractRequestUrl(nextInput) ?? sameOriginUrl ?? requestUrl,
    sameOriginUrl,
    directBackendUrl,
    fallbackInput,
  };
};

const isRecoverableNetworkError = (error: unknown): boolean => {
  if (!error) {
    return false;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  if (message) {
    const normalized = message.toLowerCase();
    if (
      normalized.includes('failed to fetch') ||
      normalized.includes('networkerror') ||
      normalized.includes('network error') ||
      normalized.includes('err_name_not_resolved') ||
      normalized.includes('name not resolved') ||
      normalized.includes('dns')
    ) {
      return true;
    }
  }

  return error instanceof TypeError;
};

export const setupGlobalFetch = (globalWindow?: Window) => {
  const globalObject = typeof globalThis !== 'undefined' ? globalThis : undefined;
  const windowLike = globalWindow ?? (globalObject as Window | undefined);
  const fetchOwner = globalWindow?.fetch ? globalWindow : (globalObject as typeof globalThis & { fetch?: typeof fetch });

  if (!fetchOwner?.fetch) {
    return () => {};
  }

  const originalFetch = fetchOwner.fetch.bind(fetchOwner);
  const shouldForceOmitCredentials = shouldForceOmitCredentialsFactory(windowLike);
  const isSameOriginRequest = isSameOriginRequestFactory(windowLike);

  const assignFetch = (implementation: typeof fetch) => {
    if (globalWindow && 'fetch' in globalWindow) {
      globalWindow.fetch = implementation;
    }
    if (globalObject && 'fetch' in globalObject) {
      (globalObject as typeof globalThis & { fetch: typeof fetch }).fetch = implementation;
    }
  };

  const patchedFetch: typeof fetch = (input, init) => {
    const { sanitizedInit, preferDirect: initPreferDirect } = extractBackendMetadata(init);
    const preferDirect = initPreferDirect || extractBackendPreferenceFromInput(input);

    const rewritten = rewriteBackendRequest(input, sanitizedInit, windowLike);
    const nextInput = rewritten.input;
    const nextInit: RequestInit = { ...(rewritten.init ?? {}) };
    const requestUrl = extractRequestUrl(nextInput);
    const existingCredentials =
      nextInit.credentials ?? (nextInput instanceof Request ? nextInput.credentials : sanitizedInit?.credentials);

    if (shouldForceOmitCredentials(requestUrl)) {
      nextInit.credentials = 'omit';

      if (nextInput instanceof Request) {
        return originalFetch(new Request(nextInput, nextInit));
      }
    } else if (!existingCredentials && isSameOriginRequest(requestUrl)) {
      nextInit.credentials = 'include';
    } else if (existingCredentials) {
      nextInit.credentials = existingCredentials;
    }

    const primaryPromise = originalFetch(nextInput as RequestInfo | URL, nextInit);
    const fallbackInput = rewritten.fallbackInput;
    const debugEnabled = isDirectBackendDebugEnabled();
    const allowDirectRetry = !!fallbackInput && (debugEnabled || preferDirect);

    if (!allowDirectRetry) {
      if (preferDirect && fallbackInput && !debugEnabled) {
        console.info(
          'ℹ️ [Fetch] Direct backend request requested but debug flag is disabled. Skipping direct retry.',
          {
            request: rewritten.requestUrl ?? requestUrl,
            direct: rewritten.directBackendUrl,
          },
        );
      }
      return primaryPromise;
    }

    return primaryPromise.catch((error) => {
      if (!isRecoverableNetworkError(error)) {
        throw error;
      }

      const fallbackUrl = extractRequestUrl(fallbackInput) ?? '(unknown url)';
      const originalUrl = rewritten.requestUrl ?? requestUrl ?? '(unknown url)';

      console.warn(
        `⚠️ [Fetch] Same-origin backend request failed (${originalUrl}). Retrying with direct backend: ${fallbackUrl}`,
        error,
      );

      return originalFetch(fallbackInput as RequestInfo | URL, nextInit);
    });
  };

  assignFetch(patchedFetch);

  return () => {
    assignFetch(originalFetch);
  };
};

export const __testables = {
  extractRequestUrl,
  shouldForceOmitCredentialsFactory,
  isSameOriginRequestFactory,
  normaliseRelativeUrl,
  rewriteBackendRequest,
  extractBackendMetadata,
};
