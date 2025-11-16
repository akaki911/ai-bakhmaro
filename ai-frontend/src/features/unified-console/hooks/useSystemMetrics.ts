import { useEffect, useRef, useState } from 'react';
import { SystemMetrics } from '../types';

interface UseSystemMetricsOptions {
  pollIntervalMs?: number;
  maxBackoffMs?: number;
}

const DEFAULT_SERVICES: SystemMetrics['services'] = {
  frontend: { status: 'healthy', cpu: 0, memory: 0, errors: [] },
  backend: { status: 'healthy', cpu: 0, memory: 0, errors: [] },
  ai: { status: 'healthy', cpu: 0, memory: 0, errors: [] }
};

const normalizeMetrics = (raw: any): SystemMetrics => ({
  cpuUsage: raw?.cpuUsage ?? 0,
  memoryUsage: raw?.memoryUsage ?? 0,
  networkRequests: raw?.networkRequests ?? 0,
  errorRate: raw?.errorRate ?? 0,
  responseTime: raw?.responseTime ?? 0,
  uptime: raw?.uptime ?? '0m',
  activeConnections: raw?.activeConnections ?? 0,
  throughput: raw?.throughput ?? 0,
  latency: {
    p50: raw?.latency?.p50 ?? 0,
    p95: raw?.latency?.p95 ?? 0,
    p99: raw?.latency?.p99 ?? 0,
  },
  services: raw?.services ?? DEFAULT_SERVICES,
  timestamp: raw?.timestamp ?? Date.now(),
});

export const useSystemMetrics = ({
  pollIntervalMs = 5000,
  maxBackoffMs = 30000,
}: UseSystemMetricsOptions = {}) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const retryCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchMetricsRef = useRef<() => void>();

  useEffect(() => {
    let isMounted = true;

    const scheduleNextFetch = (delay: number) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(fetchMetrics, delay);
    };

    const fetchMetrics = async () => {
      if (!isMounted) return;

      setConnectionStatus((prev) => (prev === 'connected' ? prev : 'connecting'));
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch('/api/dev/metrics', { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (!isMounted) return;

        setMetrics(normalizeMetrics(data));
        setLastUpdated(new Date());
        setError(null);
        setIsLoading(false);
        setConnectionStatus('connected');
        retryCountRef.current = 0;
        scheduleNextFetch(pollIntervalMs);
      } catch (err: any) {
        if (!isMounted || err?.name === 'AbortError') return;

        const retries = retryCountRef.current + 1;
        retryCountRef.current = retries;
        const nextDelay = Math.min(pollIntervalMs * 2 ** retries, maxBackoffMs);

        setError(err?.message || 'Failed to load system metrics');
        setIsLoading(false);
        setConnectionStatus('disconnected');
        scheduleNextFetch(nextDelay);
      }
    };

    fetchMetricsRef.current = fetchMetrics;

    fetchMetrics();

    return () => {
      isMounted = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      abortControllerRef.current?.abort();
    };
  }, [maxBackoffMs, pollIntervalMs]);

  const refetch = () => {
    retryCountRef.current = 0;
    setIsLoading(true);
    setError(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    abortControllerRef.current?.abort();
    fetchMetricsRef.current?.();
  };

  return {
    metrics,
    error,
    isLoading,
    connectionStatus,
    lastUpdated,
    refetch,
  };
};
