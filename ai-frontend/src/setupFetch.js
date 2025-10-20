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

const shouldForceOmitCredentialsFactory = (globalWindow) => (requestUrl) => {
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

const isSameOriginRequestFactory = (globalWindow) => (requestUrl) => {
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

export const setupGlobalFetch = (globalWindow) => {
  const globalObject = typeof globalThis !== 'undefined' ? globalThis : undefined;
  const windowLike = globalWindow ?? globalObject;
  const fetchOwner = globalWindow?.fetch ? globalWindow : globalObject;

  if (!fetchOwner?.fetch) {
    return () => {};
  }

  const originalFetch = fetchOwner.fetch.bind(fetchOwner);
  const shouldForceOmitCredentials = shouldForceOmitCredentialsFactory(windowLike);
  const isSameOriginRequest = isSameOriginRequestFactory(windowLike);

  const assignFetch = (implementation) => {
    if (globalWindow?.fetch) {
      globalWindow.fetch = implementation;
    }
    if (globalObject?.fetch) {
      globalObject.fetch = implementation;
    }
  };

  const patchedFetch = (input, init) => {
    const nextInit = { ...init };
    const requestUrl = extractRequestUrl(input);
    const existingCredentials = init?.credentials ?? (input instanceof Request ? input.credentials : undefined);

    let nextInput = input;

    if (shouldForceOmitCredentials(requestUrl)) {
      nextInit.credentials = 'omit';

      if (input instanceof Request) {
        nextInput = new Request(input, { ...nextInit });
      }
    } else if (!existingCredentials && isSameOriginRequest(requestUrl)) {
      nextInit.credentials = 'include';
    } else if (existingCredentials) {
      nextInit.credentials = existingCredentials;
    }

    return originalFetch(nextInput, nextInit);
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
};
