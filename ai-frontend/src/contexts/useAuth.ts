import { useContext } from 'react';
import { AuthContext } from './AuthContextObject';

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('❌ [AUTH] useAuth must be used within an AuthProvider');
    console.error('❌ [AUTH] Make sure App is wrapped with AuthProvider');

    // Return a fallback context to prevent app crashes
    return {
      user: null,
      isLoading: false, // Changed 'loading' to 'isLoading' to match the context type
      error: null,
      login: async () => ({ success: false, error: 'AuthProvider not found' }),
      logout: async () => {},
      isAuthenticated: false,
      clearError: () => {},
      refreshUser: async () => {}, // Assuming 'refreshUser' is a placeholder for 'refreshUserRole'
      // Added missing properties from AuthContextType to the fallback
      authInitialized: false,
      deviceRecognition: {
        isRecognizedDevice: false,
        currentDevice: undefined,
        suggestedAuthMethod: 'standard'
      },
      deviceTrust: false,
      registerCurrentDevice: async () => {},
      setDeviceTrust: async () => {},
      getAutoRouteTarget: () => '/login/customer',
      shouldShowRoleSelection: () => false,
      routeAdvice: {
        role: null,
        deviceTrust: false,
        target: '/login/customer',
        reason: 'AuthProvider not found',
        authenticated: false
      },
      // Compatibility properties
      id: null,
      email: null,
      role: 'CUSTOMER',
      isAuthReady: false,
      personalId: undefined,
      firebaseUid: undefined,
      userRole: 'CUSTOMER',
      updateUserRole: () => {},
      checkUserRole: async () => {},
      register: async () => {},
      resetPassword: async () => {},
      loginWithPasskey: async () => {},
      registerPasskey: async () => {},
      generateFallbackCode: async () => {},
      verifyFallbackCode: async () => {},
      registerFromBookingForm: async () => ({ id: '', email: '', role: 'CUSTOMER', authMethod: 'firebase' }),
      loginWithPhoneAndPassword: async () => {},
      checkUserExists: async () => false,
      updateUserPreferences: async () => {},
    };
  }
  return context;
}
