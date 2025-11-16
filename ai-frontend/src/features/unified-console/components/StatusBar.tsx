import React from 'react';
import { Wifi, WifiOff, AlertCircle, CheckCircle, Activity, Database, Clock, AlertTriangle } from 'lucide-react';

interface StatusBarProps {
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'degraded';
  activeService?: string;
  errorCount?: number;
  warningCount?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  uptime?: string;
  isLoading?: boolean;
  error?: string | null;
  lastUpdated?: Date | null;
  isMockMode?: boolean;
  onRetry?: () => void;
  onErrorClick?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  connectionStatus,
  activeService = 'None',
  errorCount = 0,
  warningCount = 0,
  cpuUsage = 0,
  memoryUsage = 0,
  uptime = '0m',
  isLoading = false,
  error,
  lastUpdated,
  isMockMode = false,
  onRetry,
  onErrorClick
}) => {
  const getConnectionColor = () => {
    if (isLoading) return 'text-yellow-500';
    if (error) return 'text-red-500';
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-500';
      case 'degraded':
        return 'text-amber-500';
      case 'connecting':
        return 'text-yellow-500';
      case 'disconnected':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getConnectionIcon = () => {
    if (isLoading) {
      return <Clock size={14} className="text-yellow-500" />;
    }

    if (error || connectionStatus === 'disconnected') {
      return <WifiOff size={14} className="text-red-500" />;
    }

    if (connectionStatus === 'degraded') {
      return <AlertTriangle size={14} className="text-amber-500" />;
    }

    if (connectionStatus === 'connecting') {
      return <Wifi size={14} className="text-yellow-500" />;
    }

    return <Wifi size={14} className="text-green-500" />;
  };

  const connectionLabel = isLoading
    ? 'Loading metrics...'
    : error
      ? 'Metrics unavailable'
      : connectionStatus === 'connected'
        ? 'Live'
        : connectionStatus === 'degraded'
          ? 'Degraded (polling)'
          : connectionStatus === 'connecting'
            ? 'Connecting...'
            : 'Offline';

  return (
    <div className="h-6 flex items-center justify-between px-4 bg-gray-100 dark:bg-gray-900 border-t border-gray-300 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          {getConnectionIcon()}
          <span className={getConnectionColor()}>
            {connectionLabel}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <Database size={14} className="text-blue-500" />
          <span>Service: <span className="font-medium">{activeService}</span></span>
        </div>

        <div className="flex items-center space-x-1">
          <Activity size={14} className="text-purple-500" />
          <span>CPU: <span className="font-medium">{cpuUsage.toFixed(1)}%</span></span>
        </div>

        <div className="flex items-center space-x-1">
          <Activity size={14} className="text-orange-500" />
          <span>RAM: <span className="font-medium">{memoryUsage.toFixed(1)}%</span></span>
        </div>

        <div className="flex items-center space-x-1">
          <Clock size={14} className="text-cyan-500" />
          <span>Uptime: <span className="font-medium">{uptime}</span></span>
        </div>

        {lastUpdated && (
          <div className="flex items-center space-x-1 text-gray-500">
            <Clock size={14} />
            <span>Updated {lastUpdated.toLocaleTimeString()}</span>
          </div>
        )}

        {isMockMode && (
          <div className="flex items-center space-x-2 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700">
            <AlertTriangle size={12} />
            <span className="font-medium">Cached logs (offline)</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {error && (
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <AlertCircle size={14} />
            <span className="font-medium">{error}</span>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {errorCount > 0 && (
          <button
            onClick={onErrorClick}
            className="flex items-center space-x-1 hover:text-red-500 transition-colors cursor-pointer"
          >
            <AlertCircle size={14} className="text-red-500" />
            <span className="font-medium">{errorCount} {errorCount === 1 ? 'Error' : 'Errors'}</span>
          </button>
        )}

        {warningCount > 0 && (
          <div className="flex items-center space-x-1 text-yellow-600 dark:text-yellow-400">
            <AlertCircle size={14} />
            <span className="font-medium">{warningCount} {warningCount === 1 ? 'Warning' : 'Warnings'}</span>
          </div>
        )}

        {errorCount === 0 && warningCount === 0 && (
          <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
            <CheckCircle size={14} />
            <span>All systems operational</span>
          </div>
        )}
      </div>
    </div>
  );
};
