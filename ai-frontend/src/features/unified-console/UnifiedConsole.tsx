// @ts-nocheck
/**
 * UnifiedConsole - Unified Developer Console Component (Replit-Style)
 * 
 * A comprehensive developer console that combines all panels in one screen:
 * - Real-time log streaming with advanced filtering
 * - System metrics and performance monitoring
 * - Service health status and management
 * - AI rollout controls
 * - Multi-tab terminal interface
 * - Code execution environment
 * - Vector memory management
 * 
 * Replit-style UI with resizable split panels and dark theme
 */
import React, { useState, useEffect } from 'react';
import { useConsoleStream } from './useConsoleStream';
import { useConsoleStore } from './consoleStore';
import { ConsoleToolbar } from './components/ConsoleToolbar';
import { LogList } from './components/LogList';
import { ExportMenu } from './components/ExportMenu';
import { ShortcutsHelp } from './components/ShortcutsHelp';
import { LiveMetrics } from './components/LiveMetrics';
import { ServicePanel } from './components/ServicePanel';
import { ServicesView } from './components/ServicesView';
import { MultiTabTerminal } from './components/MultiTabTerminal';
import RealTimeErrorMonitor from './components/RealTimeErrorMonitor';
import { useRealTimeErrors } from './hooks/useRealTimeErrors';
import { Wifi, WifiOff, AlertTriangle, AlertCircle, HelpCircle, Activity, Database, TrendingUp, Server, Zap, Bell, Terminal, FileText, BarChart3, GitBranch, Code, Brain, Command } from 'lucide-react';
import { SystemMetrics } from './types';
import AIRolloutManager from '../../components/AIRolloutManager';
import { CodeExecutor } from './components/CodeExecutor';
import { VectorMemoryManager } from './components/VectorMemory/VectorMemoryManager';
import { ResizablePanel, ResizableHorizontalPanel } from './components/ResizablePanel';
import { StatusBar } from './components/StatusBar';
import { QuickActionsToolbar } from './components/QuickActionsToolbar';
import { useSystemMetrics } from './hooks/useSystemMetrics';

const EMPTY_METRICS: SystemMetrics = {
  cpuUsage: 0,
  memoryUsage: 0,
  networkRequests: 0,
  errorRate: 0,
  responseTime: 0,
  uptime: '0m',
  activeConnections: 0,
  throughput: 0,
  latency: { p50: 0, p95: 0, p99: 0 },
  services: {
    frontend: { status: 'healthy', cpu: 0, memory: 0, errors: [] },
    backend: { status: 'healthy', cpu: 0, memory: 0, errors: [] },
    ai: { status: 'healthy', cpu: 0, memory: 0, errors: [] },
  },
};

/**
 * Main Unified Console Component
 * Provides a comprehensive developer interface with real-time monitoring
 */
export const UnifiedConsole: React.FC = () => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showErrorMonitor, setShowErrorMonitor] = useState(false);
  const [language, setLanguage] = useState<'ka' | 'en'>('ka');
  const {
    metrics: systemMetrics,
    error: metricsError,
    isLoading: metricsLoading,
    connectionStatus: metricsConnectionStatus,
    lastUpdated: metricsLastUpdated,
    refetch: refetchMetrics,
  } = useSystemMetrics();

  const {
    filters,
    ui,
    toggleAutoscroll,
    bufferSize,
    droppedCount,
    setFilters
  } = useConsoleStore();
  const [activeTab, setActiveTab] = useState<'logs' | 'metrics' | 'services' | 'rollout' | 'terminal' | 'execute' | 'memory'>('logs');
  const [logPlacement, setLogPlacement] = useState<'main' | 'sidebar'>('main');

  const { logs, connectionStatus, reconnect, clearLogs, forceReload, isLoadingFromCache } = useConsoleStream(filters);

  const metricsSnapshot = systemMetrics ?? EMPTY_METRICS;

  // Auto-recovery for failed connections
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      const reconnectTimer = setTimeout(() => {
        console.log('🔄 Auto-reconnecting to console stream...');
        reconnect();
      }, 5000);

      return () => clearTimeout(reconnectTimer);
    }
  }, [connectionStatus, reconnect]);

  // Real-time error monitoring
  const {
    errorCount,
    isConnected: errorMonitorConnected,
    hasRecentErrors,
    criticalErrors
  } = useRealTimeErrors({ language, autoConnect: false }); // Connection managed by RealTimeErrorMonitor

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            document.getElementById('console-filter-input')?.focus();
            break;
          case 'p':
            e.preventDefault();
            toggleAutoscroll();
            break;
          case 'e':
            e.preventDefault();
            setShowExportMenu(true);
            break;
          case 'j':
            e.preventDefault();
            handleJumpToLatest();
            break;
        }
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ui.autoscroll, toggleAutoscroll]);

  // Filter logs based on current filters
  const filteredLogs = logs.filter(log => {
    if (filters.source !== 'all' && log.source !== filters.source) return false;
    if (filters.level !== 'all' && log.level !== filters.level) return false;
    if (filters.text && !log.message.toLowerCase().includes(filters.text.toLowerCase())) return false;
    if (filters.regex) {
      try {
        const regex = new RegExp(filters.regex, 'i');
        if (!regex.test(log.message)) return false;
      } catch {
        // Invalid regex, ignore filter
      }
    }
    return true;
  });

  const visibleLogs = filteredLogs;

  const handleJumpToLatest = () => {
    const latestLogElement = document.getElementById('log-list')?.lastElementChild;
    latestLogElement?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleToggleServices = () => {
    setShowServices(prev => !prev);
    if (showTerminal) setShowTerminal(false);
  };

  const handleToggleTerminal = () => {
    setShowTerminal(prev => !prev);
    if (showServices) setShowServices(false);
  };

  // Renamed forceReload to forceReconnect to match the change
  const forceReconnect = () => {
    reconnect();
  };

  const tabs = [
    { id: 'logs', label: 'Logs', icon: FileText },
    { id: 'execute', label: 'Execute', icon: Code },
    { id: 'memory', label: 'Memory', icon: Brain },
    { id: 'services', label: 'Services', icon: Server },
    { id: 'rollout', label: 'Rollout', icon: GitBranch },
  ];

  const [rightPanelTab, setRightPanelTab] = useState<'logs' | 'metrics' | 'services'>('logs');
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Command Palette keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleCommandPalette = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      
      // Escape to close Command Palette
      if (e.key === 'Escape' && showCommandPalette) {
        setShowCommandPalette(false);
      }
    };

    window.addEventListener('keydown', handleCommandPalette);
    return () => window.removeEventListener('keydown', handleCommandPalette);
  }, [showCommandPalette]);

  const handleDockLogsToMain = () => {
    setLogPlacement('main');
    setActiveTab('logs');
  };

  const handlePopOutLogs = () => {
    setLogPlacement('sidebar');
    setRightPanelTab('logs');
  };

  const renderLogsPanel = (placement: 'main' | 'sidebar') => (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-2">
        <ConsoleToolbar
          filters={filters}
          onFiltersChange={setFilters}
          onClear={clearLogs}
          onPause={toggleAutoscroll}
          onJumpToLatest={handleJumpToLatest}
          onExport={() => setShowExportMenu(true)}
          onReload={forceReconnect}
          onToggleServices={handleToggleServices}
          onToggleTerminal={handleToggleTerminal}
          isPaused={!ui.autoscroll}
          showServices={showServices}
          showTerminal={showTerminal}
        />

        <div className="flex items-center justify-end gap-2">
          {placement === 'sidebar' ? (
            <button
              onClick={handleDockLogsToMain}
              className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              📌 Dock logs in main tab
            </button>
          ) : (
            <button
              onClick={handlePopOutLogs}
              className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 shadow-sm transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-200 dark:hover:bg-blue-900"
            >
              🪟 Pop out to sidebar
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <LogList logs={visibleLogs} />
      </div>
    </div>
  );

  const renderTabContent = () => (
    <div className="h-full overflow-auto p-4">
      {activeTab === 'logs' && (
        logPlacement === 'main' ? (
          renderLogsPanel('main')
        ) : (
          <div className="flex h-full items-center justify-center text-center text-gray-600 dark:text-gray-300">
            <div className="space-y-3">
              <div className="text-3xl">🪟</div>
              <div className="text-lg font-semibold">Logs are popped out to the sidebar</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Keep other tools in the main workspace while the log feed stays live on the right.</p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handleDockLogsToMain}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                >
                  Dock logs back here
                </button>
                <button
                  onClick={() => setRightPanelTab('logs')}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Focus sidebar feed
                </button>
              </div>
            </div>
          </div>
        )
      )}
      {activeTab === 'execute' && <CodeExecutor language={language} />}
      {activeTab === 'memory' && <VectorMemoryManager language={language} />}
      {activeTab === 'services' && <ServicesView onBackToLogs={() => setActiveTab('logs')} />}
      {activeTab === 'rollout' && <AIRolloutManager />}
    </div>
  );

  return (
    <div className="unified-console flex flex-col h-full w-full bg-white dark:bg-gray-900">
      {/* Quick Actions Toolbar */}
      <QuickActionsToolbar
        onClear={clearLogs}
        onRefresh={forceReconnect}
        onCommandPalette={() => setShowCommandPalette(true)}
        onSettings={() => setShowShortcuts(true)}
        className="flex-shrink-0"
      />

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left Sidebar - Services & Metrics (Resizable & Collapsible) */}
        {showServices && (
          <ResizablePanel
            position="left"
            defaultWidth={280}
            minWidth={200}
            maxWidth={400}
            collapsible={true}
            className="hidden lg:flex flex-shrink-0"
          >
            <div className="flex-1 flex flex-col overflow-hidden">
              <ServicePanel />
              <div className="flex-1 min-h-0 overflow-auto">
                <LiveMetrics />
              </div>
            </div>
          </ResizablePanel>
        )}

        {/* Center Content - Main Workspace */}
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-900 w-full lg:w-auto">
          {/* Tab Header for Main Content */}
          <div className="flex items-center space-x-1 px-2 sm:px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 flex-shrink-0 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-t border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-white dark:bg-gray-900 border-blue-500 text-blue-600 dark:text-blue-400 font-medium'
                      : 'bg-transparent border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {Icon && <Icon size={16} className="flex-shrink-0" />}
                  <span className="text-xs sm:text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Split Main Content - Top (Current Tab) & Bottom (Terminal) */}
          <div className="flex-1 flex flex-col min-h-0">
            {showTerminal ? (
              <>
                {/* Top Half - Current Tab Content (Resizable) */}
                <ResizableHorizontalPanel
                  position="top"
                  defaultHeight={400}
                  minHeight={200}
                  maxHeight={800}
                  collapsible={false}
                  className="flex-shrink-0"
                >
                  {renderTabContent()}
                </ResizableHorizontalPanel>

                {/* Bottom Half - Terminal (Toggled Visibility) */}
                <div className="flex-1 min-h-0 border-t border-gray-300 dark:border-gray-700">
                  <div className="h-full flex flex-col">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center space-x-2">
                        <Terminal size={16} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Terminal</span>
                      </div>
                    </div>
                    <div className="flex-1 min-h-0">
                      <MultiTabTerminal />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 min-h-0">{renderTabContent()}</div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Logs/Metrics/Services (Resizable, Tabbed & Collapsible) */}
        <ResizablePanel
          position="right"
          defaultWidth={320}
          minWidth={250}
          maxWidth={500}
          collapsible={true}
          className="hidden md:flex flex-shrink-0"
        >
          <div className="flex flex-col h-full">
            {/* Right Panel Tabs */}
            <div className="flex items-center border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
              {['logs', 'metrics', 'services'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRightPanelTab(tab as 'logs' | 'metrics' | 'services')}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                    rightPanelTab === tab
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Right Panel Content */}
            <div className="flex-1 min-h-0 overflow-auto">
              {rightPanelTab === 'logs' && (
                <div className="p-3 h-full">
                  {logPlacement === 'sidebar' ? (
                    renderLogsPanel('sidebar')
                  ) : (
                    <div className="flex h-full items-center justify-center text-center text-gray-600 dark:text-gray-300">
                      <div className="space-y-3">
                        <div className="text-2xl">🧭</div>
                        <div className="text-lg font-semibold">Logs are docked in the main tab</div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Pop them out here to keep the stream visible without rendering the feed twice.
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={handlePopOutLogs}
                            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                          >
                            Pop out to sidebar
                          </button>
                          <button
                            onClick={() => setActiveTab('logs')}
                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                          >
                            Go to main log view
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {rightPanelTab === 'metrics' && (
                <LiveMetrics
                  metrics={systemMetrics}
                  isLoading={metricsLoading}
                  error={metricsError}
                  isConnected={metricsConnectionStatus === 'connected'}
                  onRetry={refetchMetrics}
                  lastUpdated={metricsLastUpdated}
                />
              )}
              {rightPanelTab === 'services' && (
                <div className="p-3">
                  <ServicePanel />
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>
      </div>

      {/* Status Bar at Bottom */}
      <StatusBar
        connectionStatus={metricsConnectionStatus}
        activeService="AI Service"
        errorCount={errorCount.critical + errorCount.error}
        warningCount={errorCount.warning}
        cpuUsage={metricsSnapshot.cpuUsage}
        memoryUsage={metricsSnapshot.memoryUsage}
        uptime={metricsSnapshot.uptime}
        isLoading={metricsLoading}
        error={metricsError}
        lastUpdated={metricsLastUpdated}
        onRetry={refetchMetrics}
        onErrorClick={() => setShowErrorMonitor(true)}
      />

      {/* Modals & Overlays */}
      {showExportMenu && (
        <ExportMenu 
          logs={filteredLogs}
          onClose={() => setShowExportMenu(false)}
        />
      )}

      {showShortcuts && (
        <ShortcutsHelp onClose={() => setShowShortcuts(false)} />
      )}

              {showCommandPalette && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="p-4 border-b border-gray-300 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <Command size={20} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100"
                  autoFocus
                />
              </div>
            </div>
            <div className="p-2 max-h-96 overflow-y-auto">
              <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2">Quick Actions</div>
              {[
                { label: 'Clear Console', action: clearLogs, icon: '🗑️' },
                { label: 'Refresh Logs', action: forceReconnect, icon: '🔄' },
                { label: 'Export Logs', action: () => setShowExportMenu(true), icon: '💾' },
                { label: 'Toggle Error Monitor', action: () => setShowErrorMonitor(!showErrorMonitor), icon: '⚠️' },
                { label: 'Keyboard Shortcuts', action: () => setShowShortcuts(true), icon: '⌨️' },
                {
                  label: showServices ? 'Hide Services Panel' : 'Show Services Panel',
                  action: handleToggleServices,
                  icon: '🖥️'
                },
                {
                  label: showTerminal ? 'Hide Terminal' : 'Show Terminal',
                  action: handleToggleTerminal,
                  icon: '💻'
                }
              ].map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    item.action();
                    setShowCommandPalette(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center space-x-3 text-sm"
                >
                  <span>{item.icon}</span>
                  <span className="text-gray-900 dark:text-gray-100">{item.label}</span>
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-gray-300 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
              <span>Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Esc</kbd> to close</span>
              <button
                onClick={() => setShowCommandPalette(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <RealTimeErrorMonitor
        isOpen={showErrorMonitor}
        onClose={() => setShowErrorMonitor(false)}
        language={language}
        onLanguageChange={setLanguage}
        position="topRight"
        showToasts={true}
      />
    </div>
  );
};