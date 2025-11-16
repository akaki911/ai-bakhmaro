import { useEffect, useRef, useCallback } from 'react';
import { storage } from './storage';
import { useDevConsole } from '../../contexts/useDevConsole';
import type { LogEntry } from '../../contexts/DevConsoleContext.types';

export interface ConnectionStatus {
  status: 'connected' | 'connecting' | 'disconnected' | 'degraded';
  lastReconnectAt?: number;
}

const MAX_BUFFER_SIZE = 100000;

// Debounce utility for repetitive logs (available if needed)
// const useDebounce = (value: any, delay: number) => {
//   const [debouncedValue, setDebouncedValue] = useState(value);
//   useEffect(() => {
//     const handler = setTimeout(() => setDebouncedValue(value), delay);
//     return () => clearTimeout(handler);
//   }, [value, delay]);
//   return debouncedValue;
// };

export const useConsoleStream = (filters?: any) => {
  // ✅ Use context instead of local state for persistence
  const {
    logs,
    setLogs,
    connectionStatus,
    setConnectionStatus,
    bufferSize,
    setBufferSize,
    droppedPercentage,
    setDroppedPercentage,
    isLoadingFromCache,
    setIsLoadingFromCache,
    isMockMode,
    setIsMockMode
  } = useDevConsole();

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttempts = useRef(0);
  const totalReceived = useRef(0);
  const totalDropped = useRef(0);
  const pollingCleanupRef = useRef<(() => void) | null>(null);

  // ✅ Single connection guard for StrictMode
  const connectedRef = useRef(false);
  const shouldStayConnectedRef = useRef(true);

  // Note: Debouncing available via useDebounce utility if needed

  // ✅ Disconnect function - defined first to avoid TDZ
  const disconnect = useCallback((stayConnected = false) => {
    shouldStayConnectedRef.current = stayConnected;
    if (pollingCleanupRef.current) {
      pollingCleanupRef.current();
      pollingCleanupRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    connectedRef.current = false;
    setConnectionStatus('disconnected');
    setIsMockMode(false);
    setIsLoadingFromCache(false);
  }, [setConnectionStatus, setIsLoadingFromCache, setIsMockMode]);

  const connectRef = useRef<(forceRefresh?: boolean) => void>(() => {});

  const setupLiveConnection = useCallback(() => {

    try {
      // Build URL with filter parameters
      const url = new URL('/api/dev/console/stream', window.location.origin);
      if (filters?.source && filters.source !== 'all') {
        url.searchParams.set('source', filters.source);
      }
      if (filters?.level && filters.level !== 'all') {
        url.searchParams.set('level', filters.level);
      }
      if (filters?.text) {
        url.searchParams.set('text', filters.text);
      }

      const eventSource = new EventSource(url.toString(), {
        withCredentials: true
      });

      eventSource.onopen = () => {
        if (pollingCleanupRef.current) {
          pollingCleanupRef.current();
          pollingCleanupRef.current = null;
        }
        console.log('✅ DevConsole v2 SSE connected');
        setConnectionStatus('connected');
        setIsMockMode(false);
        setIsLoadingFromCache(false);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle different message types from SSE
          if (data.type === 'connection' || data.type === 'heartbeat') {
            console.log('🔗 DevConsole SSE:', data.message || data.type);
            return;
          }

          // Transform backend format to LogEntry format
          const logEntry: LogEntry = {
            ts: data.ts || Date.now(),
            source: data.source || 'backend',
            level: data.level || 'info',
            message: data.message || '',
            meta: data.meta || {},
            id: data.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };

          totalReceived.current++;

          // Apply basic client-side filtering before adding to buffer
          let shouldAdd = true;
          if (filters?.source && filters.source !== 'all' && logEntry.source !== filters.source) {
            shouldAdd = false;
          }
          if (filters?.level && filters.level !== 'all' && logEntry.level !== filters.level) {
            shouldAdd = false;
          }

          if (shouldAdd) {
            setLogs(prevLogs => {
              const newLogs = [...prevLogs, logEntry];

              // Rolling buffer management
              if (newLogs.length > MAX_BUFFER_SIZE) {
                const excess = newLogs.length - MAX_BUFFER_SIZE;
                totalDropped.current += excess;
                const trimmedLogs = newLogs.slice(excess);

                // Update dropped percentage
                const droppedPercent = (totalDropped.current / totalReceived.current) * 100;
                setDroppedPercentage(droppedPercent);
                setBufferSize(trimmedLogs.length);

                // Cache the trimmed logs
                storage.setCachedData('LOGS', trimmedLogs);
                return trimmedLogs;
              }

              setBufferSize(newLogs.length);
              // Cache the updated logs
              storage.setCachedData('LOGS', newLogs);
              return newLogs;
            });
          }

        } catch (error) {
          console.error('❌ Failed to parse log entry:', error, 'Raw data:', event.data);
        }
      };

      eventSource.onerror = (error) => {
        // Only log non-MIME type errors
        const eventSource = error.target as EventSource;
        if (!eventSource?.url?.includes('application/json')) {
          console.error('❌ DevConsole stream error:', error);
        }
        setConnectionStatus('disconnected');
        connectedRef.current = false;

        // Attempt reconnection after delay
        setTimeout(() => {
          if (shouldStayConnectedRef.current) {
            console.log('🔄 Attempting DevConsole reconnection...');
            // Use connect with forceRefresh=true to ensure a fresh connection attempt
            connectRef.current(true);
          }
        }, 5000);
      };

      eventSourceRef.current = eventSource;

    } catch (error) {
      console.error('❌ Failed to create EventSource:', error);
      setConnectionStatus('disconnected');
      connectedRef.current = false;

      // Fallback to polling
      if (pollingCleanupRef.current) {
        pollingCleanupRef.current();
      }
      pollingCleanupRef.current = startPollingFallback();
    }
  }, [filters, connect, startPollingFallback]);

  const forceReload = useCallback(() => {
    console.log('🔄 Force reloading logs from server...');
    storage.clearCache('LOGS');
    disconnect(true);
    connect(true);
  }, [connect, disconnect]);

  const startPollingFallback = useCallback(() => {
    console.log('🔄 Starting polling fallback for DevConsole');

    let pollInterval: NodeJS.Timeout | null = null;
    let consecutiveErrors = 0;
    const MAX_ERRORS = 3;

    setConnectionStatus('degraded');
    setIsMockMode(false);
    setIsLoadingFromCache(false);

    const poll = async () => {
      try {
        const response = await fetch('/api/dev/console/tail?limit=100', {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();

          // Handle both old and new response formats
          const logsArray = data.logs || data.entries || [];
          const newLogs = logsArray.map((log: any, index: number) => ({
            ...log,
            id: log.id || `poll-${Date.now()}-${index}`
          }));

          setLogs(newLogs);
          setConnectionStatus('degraded');
          setIsMockMode(false);
          setIsLoadingFromCache(false);
          setBufferSize(newLogs.length);
          storage.setCachedData('LOGS', newLogs);
          consecutiveErrors = 0; // Reset error counter on success

          console.log('✅ DevConsole polling successful, received', newLogs.length, 'logs');
        } else {
          consecutiveErrors++;
          console.warn(`⚠️ Polling failed (${consecutiveErrors}/${MAX_ERRORS}):`, response.status);

          if (consecutiveErrors >= MAX_ERRORS) {
            const cachedLogs = storage.getCachedData<LogEntry[]>('LOGS', []);

            if (cachedLogs.length > 0) {
              setLogs(cachedLogs);
              setBufferSize(cachedLogs.length);
              setIsLoadingFromCache(true);
              setIsMockMode(true);
            } else {
              setIsLoadingFromCache(false);
              setIsMockMode(false);
            }
            setConnectionStatus('disconnected');
          }
        }
      } catch (error) {
        consecutiveErrors++;
        console.error(`❌ Polling fallback failed (${consecutiveErrors}/${MAX_ERRORS}):`, error);

        if (consecutiveErrors >= MAX_ERRORS) {
          const cachedLogs = storage.getCachedData<LogEntry[]>('LOGS', []);

          if (cachedLogs.length > 0) {
            setLogs(cachedLogs);
            setConnectionStatus('disconnected');
            setIsMockMode(true);
            setIsLoadingFromCache(true);
            setBufferSize(cachedLogs.length);
          } else {
            setIsLoadingFromCache(false);
            setIsMockMode(false);
          }
          setConnectionStatus('disconnected');
        }
      }
    };

    // Initial poll
    poll();

    // Set up interval polling (every 5 seconds to reduce load) - INCREASED to 60 seconds to prevent spam
    pollInterval = setInterval(poll, 60000);

    // Return cleanup function
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };
  }, [setBufferSize, setConnectionStatus, setIsLoadingFromCache, setIsMockMode, setLogs]);



  const reconnect = useCallback(() => {
    setConnectionStatus('connecting');

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Progressive retry with exponential backoff
    const retryDelay = Math.min(1000 * Math.pow(2, Math.min(retryCountRef.current, 4)), 10000);

    setTimeout(() => {
      console.log(`🔄 Reconnecting to console stream (attempt ${retryCountRef.current + 1})`);
      connect(true); // Pass true to force a refresh
      retryCountRef.current++;
    }, retryDelay);
  }, [connect]); // Depend on connect, not connectToStream

  const retryCountRef = useRef(0);

  // Reset retry count on successful connection
  useEffect(() => {
    if (connectionStatus === 'connected') {
      retryCountRef.current = 0;
    }
  }, [connectionStatus]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setBufferSize(0);
    totalReceived.current = 0;
    totalDropped.current = 0;
    setDroppedPercentage(0);
    storage.clearCache('LOGS');
  }, [setLogs, setBufferSize, setDroppedPercentage]);

  useEffect(() => {
    connect();

    return () => {
      disconnect(false);
    };
  }, [connect, disconnect]);

  // Separate effect for filter changes to avoid clearing cache
  useEffect(() => {
    if (eventSourceRef.current) {
      // Only reconnect if we have an active connection
      reconnect();
    } else {
      // If no active connection, try to establish one with new filters
      connect();
    }
  }, [filters, reconnect, connect]); // Added connect as a dependency

  return {
    logs,
    connectionStatus,
    bufferSize,
    droppedPercentage,
    isLoadingFromCache,
    isMockMode,
    reconnect,
    clearLogs,
    forceReload
  };
};