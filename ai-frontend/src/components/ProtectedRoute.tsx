import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserRole } from '../contexts/AuthContext';
import { useAuth } from '../contexts/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredRole?: UserRole;
  requireAuth?: boolean;
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  requiredRole,
  requireAuth = true,
  fallbackPath = '/login',
}) => {
  const { user, isAuthenticated, isLoading, authInitialized } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">ავტენტიკაციის შემოწმება...</p>
      </div>
    );
  }

  if (requireAuth && !authInitialized) {
    return null;
  }

  if (requireAuth && (!isAuthenticated || !user)) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  if (user?.role === 'SUPER_ADMIN') {
    return <>{children}</>;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
