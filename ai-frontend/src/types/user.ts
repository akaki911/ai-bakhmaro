export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive?: boolean;
  phoneNumber?: string;
  personalId?: string;
  createdAt: Date;
  updatedAt: Date;
  agreedToTerms?: boolean;
  termsAgreedAt?: Date;
  notes?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phoneNumber?: string;
  personalId?: string;
  agreedToTerms?: boolean;
  termsAgreedAt?: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'ACCESS';

export type AuditResource = 'user' | 'ai_workspace' | 'system_setting';

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: AuditAction;
  resourceType: AuditResource;
  resourceId: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
}
