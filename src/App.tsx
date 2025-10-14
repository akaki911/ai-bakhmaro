// @ts-nocheck
import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import { PermissionsProvider } from './contexts/PermissionsContext';
import { AssistantModeProvider } from './contexts/AssistantModeContext';
import { AIModeProvider } from './contexts/AIModeContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';


import Layout from './Layout';
import Login from './Login';
import AdminPasskeyLogin from './pages/AdminPasskeyLogin';
import AdminPasskeyQuickLogin from './pages/AdminPasskeyQuickLogin';
import ProviderLogin from './pages/ProviderLogin';
import CustomerLogin from './pages/CustomerLogin';
import RoleSelectionWithDebug from './components/RoleSelectionWithDebug';
import DeviceManagement from './pages/DeviceManagement';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import "./index.css";
import MainPage from "./MainPage";
import CottagePage from "./CottagePage";
import Javshnissia from "./Javshnissia";
import CalendarView from "./CalendarView";
import AdminCottages from "./AdminCottages";
import CottageForm from "./CottageForm";
import VehiclePage from "./VehiclePage";
import AdminVehicles from './AdminVehicles';
import VehicleForm from './VehicleForm';
import VehiclesList from './VehiclesList';
import AdminHorses from './AdminHorses';
import AdminSnowmobiles from './AdminSnowmobiles';
import AdminUsers from './AdminUsers';
import AdminCustomers from './AdminCustomers';
import AdminBankAccounts from './AdminBankAccounts';
import CustomerProfile from './CustomerProfile';
import AdminMyProfile from './AdminMyProfile';
import AdminHotels from "./AdminHotels";
import HotelForm from "./HotelForm";
import HotelPage from "./HotelPage";
import HotelsList from './HotelsList';
import CottagesList from './CottagesList';
import ProviderDetails from "./ProviderDetails";
import AdminProviderBookings from "./AdminProviderBookings";
import ProviderBookings from './ProviderBookings';
import RolePermissionsPage from './components/RolePermissionsPage';
import UserDashboard from './UserDashboard'; // Import UserDashboard component
import AdminCommission from './AdminCommission';
import AdminMessagingDashboard from './components/AdminMessagingDashboard';
import AIDeveloperPanel from './components/AIDeveloperPanel';
import { Toaster } from 'react-hot-toast';
import MainDashboard from './MainDashboard'; // Import AdminPanel component
import { DevConsolePage } from './features/devconsole/DevConsolePage';
import { TestingDashboard } from './features/browserTesting/TestingDashboard';
import { ConnectorManager } from './features/connectors/ConnectorManager';
import { SecretsAdminPanel } from './features/secrets/SecretsAdminPanel';
import { FilePreviewProvider } from './contexts/FilePreviewProvider';
import FilePreview from './components/FilePreview';
import { envFeatureFlag } from './lib/featureFlags';
import { useFeatureFlag } from './hooks/useFeatureFlag';
import GurulaManagementPage from './pages/GurulaManagementPage';

const GitHubOverviewPage = lazy(() => import('./components/GitHubManagement/GitHubManagementHub'));
const GitHubStubPage = lazy(() => import('./pages/GitHubStub'));

const browserTestingEnabled = envFeatureFlag('VITE_FEATURE_BROWSER_TESTING');
const connectorsEnabled = envFeatureFlag('VITE_FEATURE_CONNECTORS');
const secretsEnabled = envFeatureFlag('VITE_FEATURE_SECRETS');
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

// Component to initialize Firebase cleanup
function FirebaseInitializer() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize Firebase cleanup
        const { periodicCleanup, cleanupFirebaseCache } = await import('./utils/firebaseCleanup');
        await cleanupFirebaseCache();
        periodicCleanup();
        console.log('🔧 Firebase cleanup initialized');
        console.log('🧹 System cleaner initialized');

        // Note: Booking expiration service will be initialized after authentication in AuthContext
        console.log('🔧 App initialization complete - waiting for authentication');
      } catch (error) {
        console.error('❌ Failed to initialize app services:', error);
      }
    };

    initializeApp();
  }, []);

  return null;
}



// App component with context providers
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

// Router component that has access to auth and navigation context
function AppRouter() {
  const { isAuthenticated, authInitialized, user, getAutoRouteTarget } = useAuth();
  const navigate = useNavigate();
  const isGitHubEnabled = useFeatureFlag('GITHUB');

  // Auto-redirect SUPER_ADMIN to correct panel
  useEffect(() => {
    if (isAuthenticated && user?.role === 'SUPER_ADMIN' && authInitialized) {
      const currentPath = window.location.pathname;
      const targetPath = getAutoRouteTarget();

      // If SUPER_ADMIN is on wrong path, redirect
      if (currentPath === '/login/customer' || currentPath === '/login') {
        console.log('🔧 [APP] Auto-redirecting SUPER_ADMIN from', currentPath, 'to', targetPath);
        navigate(targetPath, { replace: true });
      }
    }
  }, [isAuthenticated, user, authInitialized, navigate, getAutoRouteTarget]);

  return (
    <>
      <Routes>
                    {/* Public გვერდები */}
                    <Route path="/" element={<MainPage />} />
                    <Route path="/login" element={<Login />} />

                    {/* SOL-431: Auto-routing login pages */}
                    <Route path="/login/admin-passkey" element={<AdminPasskeyQuickLogin />} />
                    <Route path="/login/provider" element={<ProviderLogin />} />
                    <Route path="/login/customer" element={<CustomerLogin />} />

                    {/* Legacy routes */}
                    <Route path="/admin/passkey-login" element={<AdminPasskeyLogin />} />
                    <Route path="/login/select-role" element={
                      <RoleSelectionWithDebug />
                    } />

                    {/* Legacy redirects */}
                    <Route path="/login/role-selection" element={<Navigate to="/login/customer" replace />} />
                    <Route path="/devices" element={
                      <ProtectedRoute>
                        <DeviceManagement />
                      </ProtectedRoute>
                    } />
                    <Route path="/cottages" element={<CottagesList />} />
                    <Route path="/cottage/:id" element={<CottagePage />} />
                    <Route path="/hotels" element={<HotelsList />} />
                    <Route path="/hotel/:id" element={<HotelPage />} />
                    <Route path="/vehicles" element={<VehiclesList />} />
                    <Route path="/vehicle/:id" element={<VehiclePage />} />
                    {/* კლიენტის პროფილი - ყველა ავტორიზებული მომხმარებლისთვის */}
                    <Route
                      path="/profile"
                      element={
                        <ProtectedRoute routeType="admin">
                          <UserDashboard />
                        </ProtectedRoute>
                      }
                    />

                    {/* SOL-431: Auto-routing target pages */}
                    <Route
                      path="/account"
                      element={
                        <ProtectedRoute requiredRole="CUSTOMER">
                          <UserDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/provider/dashboard"
                      element={
                        <ProtectedRoute requiredRole="PROVIDER">
                          <Layout>
                            <MainDashboard />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />

                    {/* Dashboard route that redirects to admin */}
                    <Route
                      path="/dashboard"
                      element={<Navigate to="/admin" replace />}
                    />

                    {/* Admin რეგიონი */}
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute requiredRole="SUPER_ADMIN" routeType="admin">
                          <Layout>
                            <MainDashboard />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/profile"
                      element={
                        <ProtectedRoute routeType="admin">
                          <Layout>
                            <AdminMyProfile />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/*"
                      element={
                        <ProtectedRoute requiredRole="SUPER_ADMIN" routeType="admin">
                          <Layout>
                            <MainDashboard />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />

                    {/* მომხმარებლების მართვა - სუპერ ადმინისთვის და პროვაიდერ ადმინისთვის */}
                    <Route
                      path="/admin/users"
                      element={
                        <ProtectedRoute requiredRole="SUPER_ADMIN">
                          <Layout>
                            <AdminUsers />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/providers/:providerId"
                      element={
                        <ProtectedRoute requiredRole="SUPER_ADMIN">
                          <Layout>
                            <ProviderDetails />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />


                    <Route
                      path="/admin/provider-bookings"
                      element={
                        <ProtectedRoute requiredRole="SUPER_ADMIN">
                          <Layout>
                            <AdminProviderBookings />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/roles"
                      element={
                        <ProtectedRoute requiredRole="SUPER_ADMIN">
                          <Layout>
                            <RolePermissionsPage />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />

                    {/* ჯავშნების მენიუ */}
                    <Route
                      path="/admin/javshnissia"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <Javshnissia />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/calendar"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <CalendarView />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />


                    {/* კოტეჯების CRUD */}
                    <Route
                      path="/admin/cottages"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <AdminCottages />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/cottages/new"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <CottageForm />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/cottages/edit/:id"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <CottageForm />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/cottages/:id"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <CottageForm />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />

                    {/* ავტომობილების CRUD */}
                    <Route
                      path="/admin/vehicles"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <AdminVehicles />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/vehicles/new"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <VehicleForm />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/vehicles/:id"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <VehicleForm />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />

                      {/* ცხენების CRUD */}
                       <Route
                        path="/admin/horses"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <AdminHorses />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />

                      {/* თოვლმავლების CRUD */}
                      <Route
                        path="/admin/snowmobiles"
                        element={
                          <ProtectedRoute>
                            <Layout>
                              <AdminSnowmobiles />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />

                    {/* სასტუმროების CRUD */}
                    <Route
                      path="/admin/hotels"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <AdminHotels />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/hotels/new"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <HotelForm />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/hotels/:id"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <HotelForm />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                     <Route
                      path="/admin/my-bookings"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <ProviderBookings />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                       <Route
                      path="/admin/customers"
                      element={
                        <ProtectedRoute requiredRole="SUPER_ADMIN">
                          <Layout>
                            <AdminCustomers />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                     <Route
                      path="/admin/bank-accounts"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <AdminBankAccounts />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                       <Route
                      path="/admin/commission"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <AdminCommission />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/messaging"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <AdminMessagingDashboard />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    {browserTestingEnabled && (
                      <>
                        <Route
                          path="/admin/browser-testing"
                          element={
                            <ProtectedRoute requiredRole="SUPER_ADMIN">
                              <Layout>
                                <TestingDashboard />
                              </Layout>
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/browser-testing/runs"
                          element={
                            <ProtectedRoute requiredRole="SUPER_ADMIN">
                              <Layout>
                                <TestingDashboard />
                              </Layout>
                            </ProtectedRoute>
                          }
                        />
                      </>
                    )}
                    <Route
                      path="/admin/github"
                      element={
                        <ProtectedRoute requiredRole="SUPER_ADMIN">
                          <Layout>
                            <Suspense
                              fallback={
                                <div className="p-8 text-sm text-gray-400">Loading GitHub workspace…</div>
                              }
                            >
                              {isGitHubEnabled ? (
                                <GitHubOverviewPage />
                              ) : (
                                <GitHubStubPage mode="page" />
                              )}
                            </Suspense>
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    {connectorsEnabled && (
                      <Route
                        path="/admin/connectors"
                        element={
                          <ProtectedRoute requiredRole="SUPER_ADMIN">
                            <Layout>
                              <ConnectorManager />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                    )}
                    {secretsEnabled && (
                      <Route
                        path="/admin/secrets"
                        element={
                          <ProtectedRoute requiredRole="SUPER_ADMIN">
                            <Layout>
                              <SecretsAdminPanel />
                            </Layout>
                          </ProtectedRoute>
                        }
                      />
                    )}
                    {/* AI Developer Panel Routes */}
                    <Route
                      path="/admin/ai"
                      element={
                        <ProtectedRoute requiredRole="SUPER_ADMIN">
                          <Layout>
                            <AIDeveloperPanel />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/ai-developer"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <AIDeveloperPanel />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/ai-developer/gurula"
                      element={
                        <ProtectedRoute requiredRole="SUPER_ADMIN">
                          <Layout>
                            <GurulaManagementPage />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/admin/ai-developer/console" element={
                      <div className="h-screen">
                        <DevConsolePage />
                      </div>
                    } />
                    {/* Super Admin Only - Auto-Improve Review (redirects to AI Developer Panel) */}
                    <Route
                      path="/admin/ai/auto-improve"
                      element={<Navigate to="/admin/ai" replace />}
                    />

                        <Route path="/customer/:customerId" element={<CustomerProfile />} />
      </Routes>
      <Toaster position="top-center" />
      {/* Global File Preview Component */}
      <FilePreview />
      {/*<SystemStatusWidget />*/}
      <FirebaseInitializer />
    </>
  );
}

export default App;