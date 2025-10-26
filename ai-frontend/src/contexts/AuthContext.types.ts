export type UserRole = 'CUSTOMER' | 'PROVIDER' | 'PROVIDER_ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  uid?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  personalId?: string;
  displayName?: string;
  phoneNumber?: string;
  profileData?: any;
  authMethod?: 'firebase' | 'webauthn' | 'fallback';
  offline?: boolean;
  preferences?: {
    language?: 'ka' | 'en';
    [key: string]: unknown;
  };
}

export interface RegistrationMetadata extends Partial<Pick<User, 'firstName' | 'lastName' | 'phoneNumber' | 'personalId' | 'displayName'>> {
  [key: string]: unknown;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, trustDevice?: boolean) => Promise<void>;
  register: (email: string, password: string, role?: UserRole, additionalData?: RegistrationMetadata) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginWithPasskey: (trustDevice?: boolean) => Promise<void>;
  registerPasskey: () => Promise<void>;
  generateFallbackCode: (reason: string) => Promise<void>;
  verifyFallbackCode: (fallbackCode: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserRole: () => Promise<void>;
  loginWithPhoneAndPassword: (phone: string, password: string) => Promise<void>;
  checkUserExists: (phoneOrEmail: string, personalId?: string) => Promise<boolean>;
  authInitialized: boolean;
  deviceRecognition: {
    isRecognizedDevice: boolean;
    currentDevice?: {
      registeredRole: UserRole;
      deviceId: string;
      lastUsed: Date;
      trusted?: boolean;
    };
    suggestedAuthMethod: 'passkey' | 'email' | 'standard';
  };
  deviceTrust: boolean;
  registerCurrentDevice: (role: UserRole, trustDevice?: boolean) => Promise<void>;
  setDeviceTrust: (deviceId: string, trusted: boolean) => Promise<void>;
  getAutoRouteTarget: () => string;
  shouldShowRoleSelection: () => boolean;
  routeAdvice: {
    role: UserRole | null;
    deviceTrust: boolean;
    target: string;
    reason: string;
    authenticated: boolean;
  };
  retryPreflightChecks: () => Promise<void>;
  updateUserPreferences: (preferences: Partial<NonNullable<User['preferences']>>) => Promise<void> | void;
}
