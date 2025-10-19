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
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './Login';
import AIDeveloperPanel from './components/AIDeveloperPanel';
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

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin?tab=dashboard" replace />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/admin"
        element={(
          <ProtectedRoute requiredRole="SUPER_ADMIN">
            <Suspense fallback={<div className="p-6 text-gray-400">Loading AI Developer…</div>}>
              <AIDeveloperPanel />
            </Suspense>
          </ProtectedRoute>
        )}
      />

      <Route path="*" element={<Navigate to="/admin?tab=dashboard" replace />} />
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
