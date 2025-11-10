import React, { useState, useEffect, useCallback } from 'react';
import { resolveServiceUrl } from '@/lib/serviceUrl';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, GitCommit, Upload, Download } from 'lucide-react';

interface GitMetrics {
  commits: {
    total: number;
    averageTime: number;
    rollingAverage: number;
    lastDuration: number;
  };
  pushes: {
    total: number;
    averageTime: number;
    rollingAverage: number;
    lastDuration: number;
  };
  pulls: {
    total: number;
    averageTime: number;
    rollingAverage: number;
    lastDuration: number;
  };
  overall: {
    totalOperations: number;
    latencyReduction: number;
    uptime: number;
  };
  trend?: {
    type: 'degradation' | 'improvement';
    percentChange: number;
    recentAvg: number;
    baselineAvg: number;
    warning: string;
  } | null;
}

export const GitPerformanceMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<GitMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      const endpoint = resolveServiceUrl('/api/github/metrics');
      const response = await fetch(endpoint, { credentials: 'include' });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status}`);
      }
      
      const data = await response.json();
      setMetrics(data.metrics);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
      console.error('Failed to fetch Git metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchMetrics]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (isLoading && !metrics) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-center text-red-600 dark:text-red-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-4">
      {/* Trend Alert Banner */}
      {metrics.trend && (
        <div className={`rounded-lg p-4 ${
          metrics.trend.type === 'degradation' 
            ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500' 
            : 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500'
        }`}>
          <div className="flex items-start space-x-3">
            {metrics.trend.type === 'degradation' ? (
              <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5" />
            ) : (
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-semibold ${
                metrics.trend.type === 'degradation' 
                  ? 'text-red-800 dark:text-red-300' 
                  : 'text-green-800 dark:text-green-300'
              }`}>
                {metrics.trend.type === 'degradation' ? 'პერფორმანსის დაკლება' : 'პერფორმანსის გაუმჯობესება'}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                {metrics.trend.warning}
              </p>
              <div className="flex space-x-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
                <span>ბოლო 5 ოპერაცია: {formatDuration(metrics.trend.recentAvg)}</span>
                <span>Baseline: {formatDuration(metrics.trend.baselineAvg)}</span>
                <span className={metrics.trend.type === 'degradation' ? 'text-red-600' : 'text-green-600'}>
                  {metrics.trend.percentChange > 0 ? '+' : ''}{metrics.trend.percentChange}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header with Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Git პერფორმანსის მეტრიკები
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>ავტო განახლება</span>
            </label>
            <button
              onClick={fetchMetrics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              განახლება
            </button>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">სულ ოპერაციები</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {metrics.overall.totalOperations}
                </p>
              </div>
              <Activity className="w-12 h-12 text-blue-600 dark:text-blue-400 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Latency Reduction</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {metrics.overall.latencyReduction}%
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-600 dark:text-green-400 opacity-50" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              vs API-based approach
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Uptime</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {formatUptime(metrics.overall.uptime)}
                </p>
              </div>
              <CheckCircle className="w-12 h-12 text-purple-600 dark:text-purple-400 opacity-50" />
            </div>
          </div>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Commits */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <GitCommit className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Commits</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">სულ:</span>
                <span className="font-medium text-gray-900 dark:text-white">{metrics.commits.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">საშუალო:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatDuration(metrics.commits.averageTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Rolling Avg:</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {formatDuration(metrics.commits.rollingAverage)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">ბოლო:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatDuration(metrics.commits.lastDuration)}
                </span>
              </div>
            </div>
          </div>

          {/* Pushes */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Upload className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Pushes</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">სულ:</span>
                <span className="font-medium text-gray-900 dark:text-white">{metrics.pushes.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">საშუალო:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatDuration(metrics.pushes.averageTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Rolling Avg:</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {formatDuration(metrics.pushes.rollingAverage)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">ბოლო:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatDuration(metrics.pushes.lastDuration)}
                </span>
              </div>
            </div>
          </div>

          {/* Pulls */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Pulls</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">სულ:</span>
                <span className="font-medium text-gray-900 dark:text-white">{metrics.pulls.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">საშუალო:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatDuration(metrics.pulls.averageTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Rolling Avg:</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {formatDuration(metrics.pulls.rollingAverage)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">ბოლო:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatDuration(metrics.pulls.lastDuration)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            📊 Rolling averages გამოთვლილია ბოლო 10 წარმატებული ოპერაციიდან (PostgreSQL)
            <br />
            ⚠️ Trend alerts იჩენს გაფრთხილებას თუ performance &gt;30% იცვლება
          </p>
        </div>
      </div>
    </div>
  );
};

export default GitPerformanceMetrics;
