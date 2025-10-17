// @ts-nocheck
import { Suspense, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import { AIModeProvider } from './contexts/AIModeContext';
import { AssistantModeProvider } from './contexts/AssistantModeContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FilePreviewProvider } from './contexts/FilePreviewProvider';
import { useAuth } from './contexts/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './Login';
import { DevConsolePage } from './features/devconsole/DevConsolePage';
import AIDeveloperPanel from './components/AIDeveloperPanel';
import MemoryPage from './pages/memory';
import ReplitInterface from './components/ReplitInterface';
import FilePreview from './components/FilePreview';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function FirebaseInitializer() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const { periodicCleanup, cleanupFirebaseCache } = await import('./utils/firebaseCleanup');
        await cleanupFirebaseCache();
        periodicCleanup();
        console.log('🔧 Firebase cleanup initialized');
        console.log('🧹 System cleaner initialized');
        console.log('🔧 App initialization complete - waiting for authentication');
      } catch (error) {
        console.error('❌ Failed to initialize app services:', error);
      }
    };

    initializeApp();
  }, []);

  return null;
}

function RootRedirect() {
  const { authInitialized, isAuthenticated } = useAuth();

  if (!authInitialized) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={isAuthenticated ? '/index.html' : '/login'} replace />;
}

function BrainRedirect() {
  return <Navigate to="/index.html?tab=autoImprove" replace />;
}

function ConsoleRedirect() {
  return <Navigate to="/index.html?tab=console" replace />;
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/index.html"
        element={(
          <ProtectedRoute>
            <Suspense fallback={<div className="p-6 text-gray-400">Loading AI Developer…</div>}>
              <AIDeveloperPanel />
            </Suspense>
          </ProtectedRoute>
        )}
      />

      <Route
        path="/ai/console"
        element={(
          <ProtectedRoute>
            <DevConsolePage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/ai/brain"
        element={(
          <ProtectedRoute>
            <BrainRedirect />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/ai/memory"
        element={(
          <ProtectedRoute>
            <Suspense fallback={<div className="p-6 text-gray-400">Loading AI Memory…</div>}>
              <MemoryPage />
            </Suspense>
          </ProtectedRoute>
        )}
      />
      <Route
        path="/ai/deploy"
        element={(
          <ProtectedRoute>
            <Suspense fallback={<div className="p-6 text-gray-400">Loading Deploy tools…</div>}>
              <ReplitInterface />
            </Suspense>
          </ProtectedRoute>
        )}
      />

      <Route
        path="/ai"
        element={(
          <ProtectedRoute>
            <ConsoleRedirect />
          </ProtectedRoute>
        )}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary fallback={<div className="p-4 text-red-500">Authentication Error - Please refresh the page</div>}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <AIModeProvider>
              <AssistantModeProvider>
                <PermissionsProvider>
                  <FilePreviewProvider>
                    <Router>
                      <AppRouter />
                    </Router>
                    <Toaster position="top-center" />
                    <FilePreview />
                    <FirebaseInitializer />
                  </FilePreviewProvider>
                </PermissionsProvider>
              </AssistantModeProvider>
            </AIModeProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
