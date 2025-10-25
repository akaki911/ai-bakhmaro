import { describeBackendUrl } from '@/utils/backendUrl';
import { shouldPreferDirectBackendRequests } from '@/lib/env';

const API_PATH_PATTERN = /^\/api(\/|$)/i;

const toUrlString = (value: string | URL): string => {
  if (value instanceof URL) {
    return value.toString();
  }

  return String(value);
};

const resolvePathForRewrite = (value: string, windowLike?: Window): string | null => {
  if (!value) {
    return null;
  }

  if (API_PATH_PATTERN.test(value)) {
    return value.startsWith('/') ? value : `/${value.replace(/^\/+/, '')}`;
  }

  try {
    const base = windowLike?.location?.origin;
    const parsed = base ? new URL(value, base) : new URL(value);

    if (windowLike?.location?.origin && parsed.origin !== windowLike.location.origin) {
      return null;
    }

    const composedPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return API_PATH_PATTERN.test(parsed.pathname) ? composedPath : null;
  } catch {
    return null;
  }
};

const ensureWithCredentials = (
  init: EventSourceInit | undefined,
  required: boolean,
): EventSourceInit | undefined => {
  if (!required) {
    return init;
  }

  if (!init) {
    return { withCredentials: true };
  }

  if (init.withCredentials) {
    return init;
  }

  return { ...init, withCredentials: true };
};

export const setupEventSource = (globalWindow?: Window) => {
  const windowLike = globalWindow ?? (typeof window !== 'undefined' ? window : undefined);
  const globalObject =
    typeof globalThis !== 'undefined' ? (globalThis as typeof globalThis & { EventSource?: typeof EventSource }) : undefined;

  const originalWindowEventSource = windowLike?.EventSource;
  const originalGlobalEventSource = globalObject?.EventSource;
  const OriginalEventSource = originalWindowEventSource ?? originalGlobalEventSource;

  if (!OriginalEventSource) {
    return () => {};
  }

  const PatchedEventSource = function (url: string | URL, eventSourceInitDict?: EventSourceInit) {
    let nextUrl: string | URL = url;
    let nextInit = eventSourceInitDict;

    try {
      const urlString = toUrlString(url);
      const apiPath = resolvePathForRewrite(urlString, windowLike);
      if (apiPath) {
        const resolution = describeBackendUrl(apiPath);
        const preferDirect = shouldPreferDirectBackendRequests(windowLike);

        if (preferDirect && resolution.direct) {
          nextUrl = resolution.direct;
          nextInit = ensureWithCredentials(eventSourceInitDict, true);
        } else {
          nextUrl = resolution.sameOrigin;
          nextInit = ensureWithCredentials(eventSourceInitDict, preferDirect);
        }
      }
    } catch (error) {
      console.warn('⚠️ [EventSource] Failed to rewrite backend EventSource URL. Using original.', error);
    }

    return new OriginalEventSource(nextUrl as string | URL, nextInit);
  } as unknown as typeof EventSource;

  PatchedEventSource.prototype = OriginalEventSource.prototype;

  if (windowLike) {
    windowLike.EventSource = PatchedEventSource;
  }
  if (globalObject) {
    globalObject.EventSource = PatchedEventSource;
  }

  return () => {
    if (windowLike) {
      if (originalWindowEventSource) {
        windowLike.EventSource = originalWindowEventSource;
      }
    }
    if (globalObject) {
      if (originalGlobalEventSource) {
        globalObject.EventSource = originalGlobalEventSource;
      }
    }
  };
};

export const __testables = {
  resolvePathForRewrite,
  ensureWithCredentials,
};
