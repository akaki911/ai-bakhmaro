import { resolveBackendUrl } from '@/utils/backendUrl';

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

const rewriteBackendRequest = (
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  globalWindow?: Window,
): { input: RequestInfo | URL; init: RequestInit | undefined } => {
  const requestUrl = extractRequestUrl(input);
  if (!requestUrl) {
    return { input, init };
  }

  const relativeUrl = normaliseRelativeUrl(requestUrl, globalWindow);
  if (!relativeUrl.startsWith('/') || !API_PATH_PATTERN.test(relativeUrl)) {
    return { input, init };
  }

  const resolved = resolveBackendUrl(relativeUrl);
  if (!resolved || resolved === relativeUrl) {
    return { input, init };
  }

  if (typeof input === 'string' || input instanceof URL) {
    return { input: resolved, init };
  }

  if (input instanceof Request) {
    const mergedInit = mergeRequestInit(input, init);
    return { input: new Request(resolved, mergedInit), init: undefined };
  }

  return { input: resolved, init };
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
    const rewritten = rewriteBackendRequest(input, init, windowLike);
    const nextInput = rewritten.input;
    const nextInit: RequestInit = { ...(rewritten.init ?? {}) };
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

    return originalFetch(nextInput as RequestInfo | URL, nextInit);
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
