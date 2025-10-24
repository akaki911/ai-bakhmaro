export type Role = 'AI_ADMIN' | 'AI_DEVELOPER' | 'VIEWER';

export type Permission =
  | 'ai_developer_access'
  | 'view_ai_diagnostics'
  | 'view_gurulo_overview'
  | 'edit_gurulo_prompts'
  | 'manage_gurulo_users'
  | 'manage_gurulo_ui'
  | 'view_gurulo_analytics'
  | 'manage_gurulo_integrations';

export interface RolePermissions {
  role: Role;
  permissions: Permission[];
  isActive: boolean;
  updatedAt: Date;
}

export interface PermissionsContextType {
  role: Role;
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  isLoading: boolean;
  getAllRolePermissions: () => Promise<RolePermissions[]>;
  refreshPermissions: () => Promise<void>;
}
