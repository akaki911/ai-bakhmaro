import React, { useEffect, useMemo, useState } from 'react';
import { Zap, Activity, Server, AlertCircle, Clock } from 'lucide-react';
import { SystemMetrics } from '../types';

interface MetricHistory {
  cpu: number[];
  memory: number[];
  requests: number[];
  responseTime: number[];
  throughput: number[];
}

interface LiveMetricsProps {
  metrics: SystemMetrics | null;
  isLoading: boolean;
  error?: string | null;
  isConnected: boolean;
  onRetry?: () => void;
  lastUpdated?: Date | null;
}

const DEFAULT_METRICS: SystemMetrics = {
  cpuUsage: 0,
  memoryUsage: 0,
  networkRequests: 0,
  responseTime: 0,
  throughput: 0,
  latency: { p50: 0, p95: 0, p99: 0 },
  activeConnections: 0,
  errorRate: 0,
  uptime: '0m',
  services: {
    frontend: { status: 'healthy', cpu: 0, memory: 0, errors: [] },
    backend: { status: 'healthy', cpu: 0, memory: 0, errors: [] },
    ai: { status: 'healthy', cpu: 0, memory: 0, errors: [] },
  },
};

export const LiveMetrics: React.FC<LiveMetricsProps> = ({
  metrics,
  isLoading,
  error,
  isConnected,
  onRetry,
  lastUpdated,
}) => {
  const activeMetrics = useMemo(() => metrics ?? DEFAULT_METRICS, [metrics]);
  const [metricHistory, setMetricHistory] = useState<MetricHistory>({
    cpu: Array(20).fill(activeMetrics.cpuUsage),
    memory: Array(20).fill(activeMetrics.memoryUsage),
    requests: Array(20).fill(activeMetrics.networkRequests),
    responseTime: Array(20).fill(activeMetrics.responseTime),
    throughput: Array(20).fill(activeMetrics.throughput),
  });

  useEffect(() => {
    if (!metrics) return;

    setMetricHistory((prev) => ({
      cpu: [...prev.cpu.slice(-19), metrics.cpuUsage],
      memory: [...prev.memory.slice(-19), metrics.memoryUsage],
      requests: [...prev.requests.slice(-19), metrics.networkRequests],
      responseTime: [...prev.responseTime.slice(-19), metrics.responseTime],
      throughput: [...prev.throughput.slice(-19), metrics.throughput],
    }));
  }, [metrics]);

  const renderMiniChart = (history: number[], color: string = 'blue') => (
    <div className="flex items-end space-x-px h-8 mt-1">
      {history.map((value, index) => {
        const max = Math.max(...history);
        const min = Math.min(...history);
        const range = max - min;
        const scaledValue = range === 0 ? 50 : ((value - min) / range) * 100;
        return (
          <div
            key={index}
            className={`w-1 rounded-sm bg-${color}-400 transition-all duration-200`}
            style={{ height: `${Math.max(scaledValue, 2)}%` }}
          />
        );
      })}
    </div>
  );

  const renderLiveChart = (history: number[], color: string, label: string, unit: string) => (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {history[history.length - 1]?.toFixed(1)}{unit}
        </span>
      </div>
      <div className="relative h-20">
        <svg width="100%" height="100%" className="overflow-visible">
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={`rgb(59, 130, 246)`} stopOpacity="0.5" />
              <stop offset="100%" stopColor={`rgb(59, 130, 246)`} stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <polyline
            fill="none"
            stroke={color === 'blue' ? 'rgb(59, 130, 246)' : 'rgb(34, 197, 94)'}
            strokeWidth="2"
            points={history
              .map((value, index) => {
                const x = (index / (history.length - 1)) * 100;
                const y = 100 - (value / 100) * 80;
                return `${x},${y}`;
              })
              .join(' ')}
          />
          <polygon
            fill={`url(#gradient-${color})`}
            points={`0,100 ${history
              .map((value, index) => {
                const x = (index / (history.length - 1)) * 100;
                const y = 100 - (value / 100) * 80;
                return `${x},${y}`;
              })
              .join(' ')} 100,100`}
          />
        </svg>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>60s ago</span>
        <span>now</span>
      </div>
    </div>
  );

  const connectionColor = isLoading ? 'bg-yellow-400' : isConnected ? 'bg-green-400' : 'bg-red-400';
  const connectionLabel = isLoading ? 'Loading...' : isConnected ? 'Live' : 'Offline';
  const connectionBannerClass = isLoading
    ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
    : isConnected
      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400';

  return (
    <div className="h-full flex flex-col border-t border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
      <div className="p-3 border-b border-gray-300 dark:border-gray-600 flex justify-between items-center">
        <h3 className="text-sm font-semibold">DevConsole v2 - Live Metrics</h3>
        <div className="flex items-center space-x-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${connectionColor}`}></div>
          <span className={isConnected ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{connectionLabel}</span>
          {lastUpdated && (
            <div className="flex items-center space-x-1 text-gray-500">
              <Clock size={12} />
              <span>Updated {lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-3 space-y-4 overflow-y-auto">
        <div
          className={`p-2 rounded-lg text-center text-xs font-medium ${connectionBannerClass}`}
        >
          {error ? (
            <div className="flex items-center justify-center space-x-2">
              <AlertCircle size={14} />
              <span>{error}</span>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <span className="animate-pulse">Fetching latest metrics…</span>
            </div>
          ) : (
            <span>{isConnected ? '🟢 Real-time Data Active' : '🔴 Data Stream Offline'}</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                <Activity size={12} className="mr-1 text-blue-500" />
                CPU
              </span>
              <span className={`text-xs font-bold ${activeMetrics.cpuUsage > 70 ? 'text-red-500' : 'text-green-500'}`}>
                {activeMetrics.cpuUsage.toFixed(1)}%
              </span>
            </div>
            {renderMiniChart(metricHistory.cpu, 'purple')}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                <Server size={12} className="mr-1 text-green-500" />
                Memory
              </span>
              <span className={`text-xs font-bold ${activeMetrics.memoryUsage > 80 ? 'text-red-500' : 'text-green-500'}`}>
                {activeMetrics.memoryUsage.toFixed(1)}%
              </span>
            </div>
            {renderMiniChart(metricHistory.memory, 'blue')}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center">
            <Zap size={12} className="mr-1 text-yellow-500" />
            Network & Performance
          </h4>

          <div className="grid grid-cols-1 gap-2">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">Requests/min</span>
                <span className="text-xs font-bold text-green-600">{activeMetrics.networkRequests}</span>
              </div>
              {renderMiniChart(metricHistory.requests, 'green')}
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">Response Time</span>
                <span className="text-xs font-bold text-yellow-600">{activeMetrics.responseTime.toFixed(0)}ms</span>
              </div>
              {renderMiniChart(metricHistory.responseTime, 'yellow')}
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">Throughput</span>
                <span className="text-xs font-bold text-cyan-600">{activeMetrics.throughput} KB/s</span>
              </div>
              {renderMiniChart(metricHistory.throughput, 'cyan')}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Latency Distribution</h4>

          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between gap-2">
              <div className="flex-1 text-center min-w-0">
                <div
                  className="font-mono text-green-400 mb-1 overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{ fontSize: 'clamp(12px, 2vw, 18px)' }}
                  title={`${activeMetrics.latency.p50.toFixed(2)}ms`}
                >
                  {activeMetrics.latency.p50.toFixed(2)}ms
                </div>
                <div className="text-xs text-gray-500">p50</div>
              </div>

              <div className="flex-1 text-center min-w-0">
                <div
                  className="font-mono text-yellow-400 mb-1 overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{ fontSize: 'clamp(12px, 2vw, 18px)' }}
                  title={`${activeMetrics.latency.p95.toFixed(2)}ms`}
                >
                  {activeMetrics.latency.p95.toFixed(2)}ms
                </div>
                <div className="text-xs text-gray-500">p95</div>
              </div>

              <div className="flex-1 text-center min-w-0">
                <div
                  className="font-mono text-red-400 mb-1 overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{ fontSize: 'clamp(12px, 2vw, 18px)' }}
                  title={`${activeMetrics.latency.p99.toFixed(2)}ms`}
                >
                  {activeMetrics.latency.p99.toFixed(2)}ms
                </div>
                <div className="text-xs text-gray-500">p99</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">System Status</h4>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Active Connections</span>
              <span className="font-medium text-blue-600">{activeMetrics.activeConnections}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Error Rate</span>
              <span className={`font-medium ${activeMetrics.errorRate > 2 ? 'text-red-600' : 'text-green-600'}`}>
                {activeMetrics.errorRate.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Uptime</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{activeMetrics.uptime}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
