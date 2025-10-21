import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  type Auth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

type EnvKey =
  | 'VITE_FIREBASE_API_KEY'
  | 'VITE_FIREBASE_AUTH_DOMAIN'
  | 'VITE_FIREBASE_PROJECT_ID'
  | 'VITE_FIREBASE_STORAGE_BUCKET'
  | 'VITE_FIREBASE_MESSAGING_SENDER_ID'
  | 'VITE_FIREBASE_APP_ID'
  | 'VITE_FIREBASE_MEASUREMENT_ID';

const FALLBACK_CONFIG: Partial<Record<EnvKey, string>> = {
  VITE_FIREBASE_API_KEY: 'AIzaSyBH0-yeuoUIWOiO1ZXGDcuJ7_vP6BkugBw',
  VITE_FIREBASE_AUTH_DOMAIN: 'bakhmaro-cottages.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'bakhmaro-cottages',
  VITE_FIREBASE_STORAGE_BUCKET: 'bakhmaro-cottages.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '815060315119',
  VITE_FIREBASE_APP_ID: '1:815060315119:web:a1f33d920bcd52e536a41a',
  VITE_FIREBASE_MEASUREMENT_ID: 'G-NT97B9E4YL',
};

const fallbackUsage = new Set<EnvKey>();

const readEnv = (key: EnvKey): string | undefined => {
  const viteEnv = typeof import.meta !== 'undefined' && import.meta?.env ? import.meta.env[key] : undefined;
  if (viteEnv && String(viteEnv).trim() !== '') {
    return String(viteEnv);
  }

  if (typeof process !== 'undefined' && process?.env?.[key]) {
    const value = process.env[key];
    if (value && value.trim() !== '') {
      return value.trim();
    }
  }

  const fallbackValue = FALLBACK_CONFIG[key];
  if (fallbackValue) {
    fallbackUsage.add(key);
    return fallbackValue;
  }

  return undefined;
};

const firebaseConfig = {
  apiKey: readEnv('VITE_FIREBASE_API_KEY'),
  authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readEnv('VITE_FIREBASE_APP_ID'),
  measurementId: readEnv('VITE_FIREBASE_MEASUREMENT_ID'),
};

const requiredEntries: Array<[EnvKey, string | undefined]> = [
  ['VITE_FIREBASE_API_KEY', firebaseConfig.apiKey],
  ['VITE_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
  ['VITE_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
  ['VITE_FIREBASE_APP_ID', firebaseConfig.appId],
];

const missingKeys = requiredEntries.filter(([, value]) => !value).map(([key]) => key);

if (fallbackUsage.size > 0) {
  console.warn('⚠️ Firebase configuration fallback in use for keys:', Array.from(fallbackUsage));
}

if (missingKeys.length > 0) {
  const diagnosticMessage =
    'Missing required Firebase environment variables. Please set the following keys in your environment configuration: ' +
    missingKeys.join(', ');

  console.error('❌ Firebase configuration error:', diagnosticMessage);
  throw new Error(diagnosticMessage);
}

const resolvedConfig = {
  apiKey: firebaseConfig.apiKey!,
  authDomain: firebaseConfig.authDomain!,
  projectId: firebaseConfig.projectId!,
  storageBucket: firebaseConfig.storageBucket || `${firebaseConfig.projectId}.firebasestorage.app`,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId!,
  measurementId: firebaseConfig.measurementId,
};

console.debug('🔧 Firebase config resolved', {
  projectId: resolvedConfig.projectId,
  authDomain: resolvedConfig.authDomain,
  storageBucket: resolvedConfig.storageBucket,
  hasMessagingSenderId: Boolean(resolvedConfig.messagingSenderId),
  hasMeasurementId: Boolean(resolvedConfig.measurementId),
});

const app = getApps().length ? getApp() : initializeApp(resolvedConfig);

let authInstance: Auth;
try {
  authInstance = getAuth(app);
} catch {
  authInstance = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  });
}

export const auth: Auth = authInstance;
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
