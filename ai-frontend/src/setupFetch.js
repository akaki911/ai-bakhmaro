import { resolveBackendUrl } from '@/utils/backendUrl';

const API_PATH_PATTERN = /^\/api(\/|$)/i;

/**
 * @param {RequestInfo | URL} input
 * @returns {string | undefined}
 */
const extractRequestUrl = (input) => {
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

/**
 * @param {Window | undefined} [globalWindow]
 * @returns {(requestUrl: string | undefined) => boolean}
 */
const shouldForceOmitCredentialsFactory = (globalWindow) => {
  return (requestUrl) => {
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

/**
 * @param {Window | undefined} [globalWindow]
 * @returns {(requestUrl: string | undefined) => boolean}
 */
const isSameOriginRequestFactory = (globalWindow) => {
  return (requestUrl) => {
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

/**
 * @param {string} url
 * @param {Window | undefined} [globalWindow]
 * @returns {string}
 */
const normaliseRelativeUrl = (url, globalWindow) => {
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

/**
 * @param {Request} request
 * @param {RequestInit | undefined} overrides
 * @returns {RequestInit}
 */
const mergeRequestInit = (request, overrides) => {
  const clone = request.clone();
  const headers = overrides?.headers ?? new Headers(clone.headers);

  /** @type {RequestInit} */
  const merged = {
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

/**
 * @typedef {Object} RewrittenRequest
 * @property {RequestInfo | URL} input
 * @property {RequestInit | undefined} init
 * @property {string | undefined} [requestUrl]
 * @property {RequestInfo | URL} [fallbackInput]
 */

/**
 * @param {RequestInfo | URL} input
 * @param {RequestInit | undefined} init
 * @param {Window | undefined} [globalWindow]
 * @returns {RewrittenRequest}
 */
const rewriteBackendRequest = (input, init, globalWindow) => {
  const requestUrl = extractRequestUrl(input);
  if (!requestUrl) {
    return { input, init, requestUrl };
  }

  const relativeUrl = normaliseRelativeUrl(requestUrl, globalWindow);
  if (!relativeUrl.startsWith('/') || !API_PATH_PATTERN.test(relativeUrl)) {
    return { input, init, requestUrl };
  }

  const resolved = resolveBackendUrl(relativeUrl);
  if (!resolved || resolved === relativeUrl) {
    return { input, init, requestUrl: requestUrl };
  }

  if (typeof input === 'string' || input instanceof URL) {
    return {
      input: resolved,
      init,
      requestUrl: resolved,
      fallbackInput: relativeUrl,
    };
  }

  if (input instanceof Request) {
    const mergedInit = mergeRequestInit(input, init);
    return {
      input: new Request(resolved, mergedInit),
      init: undefined,
      requestUrl: resolved,
    };
  }

  return {
    input: resolved,
    init,
    requestUrl: resolved,
    fallbackInput: relativeUrl,
  };
};

/**
 * @param {unknown} error
 * @returns {boolean}
 */
const isRecoverableNetworkError = (error) => {
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

/**
 * @param {Window | undefined} [globalWindow]
 * @returns {() => void}
 */
export const setupGlobalFetch = (globalWindow) => {
  const globalObject = typeof globalThis !== 'undefined' ? globalThis : undefined;
  /** @type {Window | undefined} */
  const windowLike =
    globalWindow ?? (typeof window !== 'undefined' ? window : undefined);
  /** @type {(typeof globalThis & { fetch?: typeof fetch }) | undefined} */
  const fetchableGlobal = globalObject;
  const fetchOwner =
    (globalWindow && typeof globalWindow.fetch === 'function' ? globalWindow : undefined) ??
    (fetchableGlobal && typeof fetchableGlobal.fetch === 'function' ? fetchableGlobal : undefined);

  if (!fetchOwner?.fetch) {
    return () => {};
  }

  const originalFetch = fetchOwner.fetch.bind(fetchOwner);
  const shouldForceOmitCredentials = shouldForceOmitCredentialsFactory(windowLike);
  const isSameOriginRequest = isSameOriginRequestFactory(windowLike);

  /**
   * @param {typeof fetch} implementation
   */
  const assignFetch = (implementation) => {
    if (globalWindow && 'fetch' in globalWindow) {
      globalWindow.fetch = implementation;
    }
    if (fetchableGlobal && 'fetch' in fetchableGlobal) {
      fetchableGlobal.fetch = implementation;
    }
  };

  /**
   * @type {typeof fetch}
   */
  const patchedFetch = (input, init) => {
    const rewritten = rewriteBackendRequest(input, init, windowLike);
    const nextInput = rewritten.input;
    /** @type {RequestInit} */
    const nextInit = { ...(rewritten.init ?? {}) };
    const requestUrl = extractRequestUrl(nextInput);
    const existingCredentials =
      nextInit.credentials ?? (nextInput instanceof Request ? nextInput.credentials : init?.credentials);

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

    const primaryPromise = originalFetch(nextInput, nextInit);
    const fallbackInput = rewritten.fallbackInput;

    if (!fallbackInput) {
      return primaryPromise;
    }

    return primaryPromise.catch((error) => {
      if (!isRecoverableNetworkError(error)) {
        throw error;
      }

      const fallbackUrl = extractRequestUrl(fallbackInput) ?? '(unknown url)';
      const originalUrl = rewritten.requestUrl ?? requestUrl ?? '(unknown url)';

      console.warn(
        `⚠️ [Fetch] Primary backend request failed (${originalUrl}). Retrying with same-origin fallback: ${fallbackUrl}`,
        error,
      );

      return originalFetch(fallbackInput, nextInit);
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
};
