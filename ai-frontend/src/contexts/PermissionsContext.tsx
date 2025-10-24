import React, { ReactNode, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { PermissionsContext } from './PermissionsContextObject';
import type { Permission, PermissionsContextType, Role, RolePermissions } from './PermissionsContext.types';
export type { Permission, PermissionsContextType, Role, RolePermissions } from './PermissionsContext.types';

const DEFAULT_PERMISSIONS: Record<Role, Permission[]> = {
  AI_ADMIN: [
    'ai_developer_access',
    'view_ai_diagnostics',
    'view_gurulo_overview',
    'edit_gurulo_prompts',
    'manage_gurulo_users',
    'manage_gurulo_ui',
    'view_gurulo_analytics',
    'manage_gurulo_integrations',
  ],
  AI_DEVELOPER: [
    'ai_developer_access',
    'view_ai_diagnostics',
    'view_gurulo_overview',
    'edit_gurulo_prompts',
    'view_gurulo_analytics',
  ],
  VIEWER: ['view_gurulo_overview'],
};

const ROLES: Role[] = ['AI_ADMIN', 'AI_DEVELOPER', 'VIEWER'];

interface PermissionsProviderProps {
  children: ReactNode;
}

const mapUserRoleToAiRole = (role?: string | null): Role => {
  if (role === 'SUPER_ADMIN') {
    return 'AI_ADMIN';
  }
  if (role === 'ADMIN') {
    return 'AI_DEVELOPER';
  }
  return 'VIEWER';
};

export const PermissionsProvider: React.FC<PermissionsProviderProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const role = useMemo(() => mapUserRoleToAiRole(user?.role), [user?.role]);
  const permissions = useMemo(() => DEFAULT_PERMISSIONS[role], [role]);

  const hasPermission = useCallback(
    (permission: Permission) => permissions.includes(permission),
    [permissions],
  );

  const hasAnyPermission = useCallback(
    (requested: Permission[]) => requested.some(hasPermission),
    [hasPermission],
  );

  const getAllRolePermissions = useCallback(async () => {
    return ROLES.map((role) => ({
      role,
      permissions: DEFAULT_PERMISSIONS[role],
      isActive: true,
      updatedAt: new Date(),
    } satisfies RolePermissions));
  }, []);

  const refreshPermissions = useCallback(async () => {
    // No-op: permissions are derived from the authenticated user's role.
  }, []);

  const contextValue: PermissionsContextType = {
    role,
    permissions,
    hasPermission,
    hasAnyPermission,
    isLoading,
    getAllRolePermissions,
    refreshPermissions,
  };

  return (
    <PermissionsContext.Provider value={contextValue}>
      {children}
    </PermissionsContext.Provider>
  );
};
