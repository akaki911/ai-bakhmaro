import { useState, useRef } from 'react';
import { analyzeNetworkError } from './networkErrorDetection';

export interface RateLimitConfig {
  maxRequests: number;
  timeWindow: number; // milliseconds
  retryDelay: number;
}

interface RateLimitResponse {
  remaining?: number;
  reset?: number;
  retryAfter?: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 20, // Increased from 5 to 20 for WebAuthn testing
  timeWindow: 60000, // 1 minute
  retryDelay: 1000 // 1 second retry delaytryDelay: 15000 // SOL-311: შევამცირეთ delay 15 წამამდე
};

class RateLimitManager {
  private requestCounts = new Map<string, number[]>();
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private pendingRequests = new Map<string, Promise<any>>();
  private backoffDelays = new Map<string, number>();
  private pollingDisabled = new Map<string, boolean>();

  async execute<T>(
    key: string,
    apiCall: () => Promise<T>,
    config: Partial<RateLimitConfig> = {},
    cacheTTL: number = 30000
  ): Promise<T> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    // Check cache first
    const cached = this.getFromCache(key, cacheTTL);
    if (cached) {
      console.log(`🔄 Using cached data for ${key}`);
      return cached;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      if (import.meta.env.DEV && !key.includes('checkUserRole')) {
      console.log(`⏳ Request already pending for ${key}, waiting...`);
    }
      return this.pendingRequests.get(key)!;
    }

    // Check rate limit
    if (this.isRateLimited(key, finalConfig)) {
      console.warn(`🚫 Rate limited for ${key}, using cached data or throwing error`);
      const fallback = this.getFromCache(key, Infinity); // Get any cached data
      if (fallback) return fallback;
      throw new Error(`Rate limited for ${key}. Please wait ${finalConfig.retryDelay}ms`);
    }

    // Execute request
    const promise = this.executeWithTracking(key, apiCall, finalConfig, cacheTTL);
    this.pendingRequests.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  private async executeWithTracking<T>(
    key: string,
    apiCall: () => Promise<T>,
    config: RateLimitConfig,
    cacheTTL: number
  ): Promise<T> {
    this.trackRequest(key);

    try {
      const result = await apiCall();
      this.setCache(key, result, cacheTTL);

      // Reset backoff on success
      this.backoffDelays.delete(key);
      this.pollingDisabled.set(key, false);

      return result;
    } catch (error: any) {
      const rateLimitInfo = this.parseRateLimitError(error);

      if (rateLimitInfo.isRateLimit || rateLimitInfo.isNetworkError) {
        if (rateLimitInfo.isRateLimit) {
          console.error(`🚫 Rate limit hit for ${key}:`, error.message);
          console.log(`📊 Rate limit info:`, rateLimitInfo);
        } else {
          console.warn(`🌐 [NETWORK] ${key}: ${error?.message ?? 'Connection failure'}`);
        }

        const previousDelay = this.backoffDelays.get(key) || 0;
        const baseDelay = rateLimitInfo.isNetworkError ? Math.max(config.retryDelay, 5000) : config.retryDelay;
        const multiplier = rateLimitInfo.isNetworkError ? 1.5 : 2;
        const maxDelay = rateLimitInfo.isNetworkError ? 60000 : 120000;

        let delay = rateLimitInfo.retryAfter && rateLimitInfo.retryAfter > 0
          ? rateLimitInfo.retryAfter
          : previousDelay > 0
            ? Math.min(previousDelay * multiplier, maxDelay)
            : baseDelay;

        if (!Number.isFinite(delay) || delay <= 0) {
          delay = baseDelay;
        }

        this.backoffDelays.set(key, delay);
        this.pollingDisabled.set(key, true);

        console.warn(`⏰ [BACKOFF] ${key}: ${delay}ms delay, polling disabled`);

        setTimeout(() => {
          this.pollingDisabled.set(key, false);
          console.log(`✅ [BACKOFF] ${key}: Polling re-enabled`);
        }, delay);

        const waitDuration = rateLimitInfo.isNetworkError ? Math.min(delay, 5000) : delay;
        if (waitDuration > 0) {
          await new Promise(resolve => setTimeout(resolve, waitDuration));
        }
      }
      throw error;
    }
  }

  private parseRateLimitError(error: any): {
    isRateLimit: boolean;
    isNetworkError: boolean;
    retryAfter?: number;
    remaining?: number;
  } {
    const networkInfo = analyzeNetworkError(error);
    if (networkInfo.isNetworkError) {
      const retryAfter = typeof error?.retryAfter === 'number' ? error.retryAfter : undefined;
      return { isRateLimit: false, isNetworkError: true, retryAfter };
    }

    // Check for various rate limit indicators
    const message = error?.message || '';
    const isRateLimit =
      error?.status === 429 ||
      message.includes('429') ||
      message.includes('Too Many Requests') ||
      message.includes('rate limit') ||
      message.includes('Rate limited');

    if (!isRateLimit) {
      return { isRateLimit: false, isNetworkError: false };
    }

    // Parse retry-after header or GitHub rate limit info
    let retryAfter: number | undefined;
    let remaining: number | undefined;

    if (error.headers) {
      const retryAfterHeader = error.headers.get?.('Retry-After') || error.headers['retry-after'];
      const resetHeader = error.headers.get?.('X-RateLimit-Reset') || error.headers['x-ratelimit-reset'];
      const remainingHeader = error.headers.get?.('X-RateLimit-Remaining') || error.headers['x-ratelimit-remaining'];

      if (retryAfterHeader) {
        retryAfter = parseInt(retryAfterHeader) * 1000;
      } else if (resetHeader) {
        const resetTime = parseInt(resetHeader) * 1000;
        retryAfter = Math.max(resetTime - Date.now(), 60000); // Min 1 minute
      }

      if (remainingHeader) {
        remaining = Number(remainingHeader);
      }

      console.log(`📊 [Rate Limit Headers] Remaining: ${remainingHeader}, Reset: ${resetHeader}, Retry-After: ${retryAfterHeader}`);
    }

    return {
      isRateLimit: true,
      isNetworkError: false,
      retryAfter,
      remaining,
    };
  }

  private isRateLimited(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const requests = this.requestCounts.get(key) || [];

    // Clean old requests
    const validRequests = requests.filter(time => now - time < config.timeWindow);
    this.requestCounts.set(key, validRequests);

    return validRequests.length >= config.maxRequests;
  }

  private trackRequest(key: string): void {
    const now = Date.now();
    const requests = this.requestCounts.get(key) || [];
    requests.push(now);
    this.requestCounts.set(key, requests);
  }

  private getFromCache(key: string, maxAge: number): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > Math.min(cached.ttl, maxAge)) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  isPollingDisabled(key: string): boolean {
    return this.pollingDisabled.get(key) || false;
  }

  getBackoffDelay(key: string): number {
    return this.backoffDelays.get(key) || 0;
  }

  resetBackoff(key: string): void {
    this.backoffDelays.delete(key);
    this.pollingDisabled.set(key, false);
  }
}

export const rateLimitManager = new RateLimitManager();

export const useRateLimitedAPI = (key: string, config?: Partial<RateLimitConfig>) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const execute = async <T>(apiCall: () => Promise<T>, cacheTTL = 30000): Promise<T> => {
    setLoading(true);
    setError(null);

    try {
      const result = await rateLimitManager.execute(key, apiCall, config, cacheTTL);
      setData(result);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading, error, data };
};

export const handleAPIError = (error: any, context: string = '') => {
  console.error(`API Error ${context}:`, error);

  if (error.status === 429) {
    console.warn('Rate limit exceeded, implementing backoff strategy');
    return {
      shouldRetry: true,
      retryAfter: parseInt(error.headers?.['retry-after'] || '60') * 1000,
      error: 'Rate limit exceeded'
    };
  }

  if (error.status >= 500) {
    console.warn('Server error, will retry');
    return {
      shouldRetry: true,
      retryAfter: 5000,
      error: 'Server error'
    };
  }

  return {
    shouldRetry: false,
    error: error.message || 'Unknown error'
  };
};

// GitHub-specific error handling
export const handleGitHubAPIError = (error: any, operation: string = '') => {
  console.error(`GitHub API Error ${operation}:`, error);

  // GitHub rate limit handling
  if (error.status === 403 && error.headers?.['x-ratelimit-remaining'] === '0') {
    const resetTime = error.headers?.['x-ratelimit-reset'];
    const retryAfter = resetTime ? (parseInt(resetTime) * 1000 - Date.now()) : 3600000; // 1 hour fallback

    return {
      shouldRetry: true,
      retryAfter: Math.max(retryAfter, 60000), // At least 1 minute
      error: 'GitHub rate limit exceeded',
      isRateLimit: true
    };
  }

  // GitHub merge conflict handling
  if (error.status === 409) {
    return {
      shouldRetry: false,
      error: 'Merge conflict detected',
      isMergeConflict: true,
      requiresManualResolution: true
    };
  }

  // GitHub authentication issues
  if (error.status === 401) {
    return {
      shouldRetry: false,
      error: 'GitHub authentication failed',
      isAuthError: true,
      requiresReauth: true
    };
  }

  // GitHub not found (repository, PR, etc.)
  if (error.status === 404) {
    return {
      shouldRetry: false,
      error: 'GitHub resource not found',
      isNotFound: true
    };
  }

  return handleAPIError(error, `GitHub ${operation}`);
};