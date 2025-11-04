import type { RateLimitConfig } from './rateLimitHandler';
import { rateLimitManager } from './rateLimitHandler';
import { fetchWithDirectAiFallback } from './aiFallback';
import { getAdminAuthHeaders } from './adminToken';
import { mergeHeaders } from './httpHeaders';
import { resolveServiceUrl } from '@/lib/serviceUrl';

interface RateLimitedFetchOptions extends RequestInit {
  /**
   * Unique key used by the rate limit manager to group requests.
   * Typically matches the SWR cache key prefix or API endpoint identifier.
   */
  key: string;
  /**
   * Optional overrides for the rate limiting configuration.
   */
  rateLimit?: Partial<RateLimitConfig>;
  /**
   * Milliseconds to keep the successful response in the shared cache.
   * Defaults to 0 to avoid masking fresh data for realtime feeds.
   */
  cacheTTL?: number;
  /**
   * Set to false to receive the raw Response object instead of parsed JSON.
   */
  parseJson?: boolean;
}

const parseRetryAfter = (headerValue: string | null): number | undefined => {
  if (!headerValue) {
    return undefined;
  }

  const seconds = Number(headerValue);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds) * 1000;
  }

  const retryDate = new Date(headerValue);
  const retryMs = retryDate.getTime() - Date.now();
  return Number.isFinite(retryMs) ? Math.max(0, retryMs) : undefined;
};

const attachRateLimitMetadata = (error: Error, response: Response) => {
  const enhanced = error as Error & {
    status?: number;
    headers?: Response['headers'];
    retryAfter?: number;
  };

  enhanced.status = response.status;
  enhanced.headers = response.headers;
  enhanced.retryAfter = parseRetryAfter(response.headers.get('Retry-After'));

  return enhanced;
};

export const rateLimitedJsonFetch = async <T = unknown>(
  url: string,
  { key, rateLimit, cacheTTL = 0, parseJson = true, ...init }: RateLimitedFetchOptions,
): Promise<T> => {
  const executeRequest = async () => {
    const requestInit: RequestInit = {
      ...init,
      headers: mergeHeaders({ Accept: 'application/json' }, getAdminAuthHeaders(), init.headers),
    };

    const targetUrl = resolveServiceUrl(url);
    const { response } = await fetchWithDirectAiFallback(targetUrl, requestInit);

    if (response.status === 429) {
      throw attachRateLimitMetadata(new Error('HTTP 429: Too Many Requests'), response);
    }

    if (!response.ok) {
      throw attachRateLimitMetadata(
        new Error(`HTTP ${response.status}: ${response.statusText || 'Request failed'}`),
        response,
      );
    }

    if (!parseJson) {
      return response as unknown as T;
    }

    return (await response.json()) as T;
  };

  if (!key) {
    return executeRequest();
  }

  return rateLimitManager.execute(key, executeRequest, rateLimit, cacheTTL);
};

export type { RateLimitedFetchOptions };
