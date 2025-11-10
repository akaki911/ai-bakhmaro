import React from 'react';
import { Play, Square, Trash2, Settings, RefreshCw, Command, Terminal, Code, Database } from 'lucide-react';

interface QuickActionsToolbarProps {
  onRun?: () => void;
  onStop?: () => void;
  onClear?: () => void;
  onSettings?: () => void;
  onRefresh?: () => void;
  onCommandPalette?: () => void;
  isRunning?: boolean;
  className?: string;
}

export const QuickActionsToolbar: React.FC<QuickActionsToolbarProps> = ({
  onRun,
  onStop,
  onClear,
  onSettings,
  onRefresh,
  onCommandPalette,
  isRunning = false,
  className = ''
}) => {
  return (
    <div className={`flex items-center space-x-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 ${className}`}>
      <div className="flex items-center space-x-1">
        {!isRunning && onRun && (
          <button
            onClick={onRun}
            className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium transition-colors"
            title="Run (Ctrl+Enter)"
          >
            <Play size={14} />
            <span>Run</span>
          </button>
        )}

        {isRunning && onStop && (
          <button
            onClick={onStop}
            className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-medium transition-colors"
            title="Stop"
          >
            <Square size={14} />
            <span>Stop</span>
          </button>
        )}

        {onClear && (
          <button
            onClick={onClear}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm transition-colors"
            title="Clear (Ctrl+K)"
          >
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        )}
      </div>

      <div className="flex-1"></div>

      <div className="flex items-center space-x-1">
        {onCommandPalette && (
          <button
            onClick={onCommandPalette}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm transition-colors"
            title="Command Palette (Cmd+K / Ctrl+K)"
          >
            <Command size={14} />
            <span className="hidden md:inline">Commands</span>
          </button>
        )}

        {onSettings && (
          <button
            onClick={onSettings}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded transition-colors"
            title="Settings"
          >
            <Settings size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
