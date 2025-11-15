// @ts-nocheck
import { Suspense, lazy, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { FEATURE_FLAGS } from './config/features';
import './index.css';

const Login = lazy(() => import('./Login'));
const AIDashboardShell = lazy(() => import('./components/AIDashboardShell'));
const MailShell = lazy(() => import('./components/MailShell'));

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

const RouteFallback = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-[#050914] text-slate-200">
    <div className="mb-6 h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/30 border-t-transparent" />
    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">{title}</p>
    {subtitle ? <p className="mt-3 max-w-xs text-center text-sm text-slate-400">{subtitle}</p> : null}
  </div>
);

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin?tab=dashboard" replace />} />
      <Route
        path="/login"
        element={(
          <Suspense
            fallback={
              <RouteFallback
                title="უსაფრთხო შესვლა"
                subtitle="ავტენტიკაციის მოდული იტვირთება და სესიის სტატუსი მოწმდება."
              />
            }
          >
            <Login />
          </Suspense>
        )}
      />

      <Route
        path="/admin"
        element={(
          <ProtectedRoute requiredRole="SUPER_ADMIN">
            <Suspense
              fallback={
                <RouteFallback
                  title="AI Developer პანელი"
                  subtitle="დეშბორდი, ფაილები და GitHub ოპერაციები მზადდება."
                />
              }
            >
              <AIDashboardShell />
            </Suspense>
          </ProtectedRoute>
        )}
      />

      <Route
        path="/mail"
        element={
          FEATURE_FLAGS.enableMailDemo ? (
            <ProtectedRoute requiredRole="USER">
              <Suspense
                fallback={
                  <RouteFallback title="Mail Demo იტვირთება" subtitle="ფოსტისა და AI ასისტენტის მოდული მზადდება." />
                }
              >
                <MailShell />
              </Suspense>
            </ProtectedRoute>
          ) : (
            <Navigate to="/admin?tab=dashboard" replace />
          )
        }
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
            <Router>
              <AppRouter />
            </Router>
            <Toaster position="top-center" />
            <FirebaseInitializer />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
