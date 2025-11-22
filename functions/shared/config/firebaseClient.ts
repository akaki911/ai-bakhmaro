export const GURULO_FIREBASE_PUBLIC_CONFIG = Object.freeze({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
});

export const getFirebasePublicConfig = (overrides: Partial<typeof GURULO_FIREBASE_PUBLIC_CONFIG> = {}) => ({
  ...GURULO_FIREBASE_PUBLIC_CONFIG,
  ...overrides,
});
