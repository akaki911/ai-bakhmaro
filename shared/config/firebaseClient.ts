export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

export const GURULO_FIREBASE_PUBLIC_CONFIG: FirebaseClientConfig = Object.freeze({
  apiKey: 'AIzaSyBPkVGW4VsM55GlEB6koU3ZYkKmLATMGC8',
  authDomain: 'ai-bakhmaro.firebaseapp.com',
  projectId: 'ai-bakhmaro',
  storageBucket: 'ai-bakhmaro.appspot.com',
  messagingSenderId: '34250385727',
  appId: '1:34250385727:web:7ca8712e87287c0ff38b8a',
  measurementId: '__OPTIONAL_AI_SPACE_FIREBASE_MEASUREMENT_ID__',
});

export const getFirebasePublicConfig = (
  overrides: Partial<FirebaseClientConfig> = {},
): FirebaseClientConfig => ({
  ...GURULO_FIREBASE_PUBLIC_CONFIG,
  ...overrides,
});
