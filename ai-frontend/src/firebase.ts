const firebaseAppModule = await import('firebase/app');

const { initializeApp, getApps, getApp } = firebaseAppModule;

import {
  browserLocalPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
} from '@/lib/firebase/auth';
import type { Auth } from '@/lib/firebase/auth';
import { getFirestore } from '@/lib/firebase/firestore';
import { getStorage } from '@/lib/firebase/storage';
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

type EnvKey =
  | 'VITE_FIREBASE_API_KEY'
  | 'VITE_FIREBASE_AUTH_DOMAIN'
  | 'VITE_FIREBASE_PROJECT_ID'
  | 'VITE_FIREBASE_STORAGE_BUCKET'
  | 'VITE_FIREBASE_MESSAGING_SENDER_ID'
  | 'VITE_FIREBASE_APP_ID'
  | 'VITE_FIREBASE_MEASUREMENT_ID';

const FALLBACK_CONFIG: Partial<Record<EnvKey, string>> = {
  VITE_FIREBASE_API_KEY: 'MISSING_VITE_FIREBASE_API_KEY',
  VITE_FIREBASE_AUTH_DOMAIN: 'MISSING_VITE_FIREBASE_AUTH_DOMAIN',
  VITE_FIREBASE_PROJECT_ID: 'MISSING_VITE_FIREBASE_PROJECT_ID',
  VITE_FIREBASE_STORAGE_BUCKET: 'MISSING_VITE_FIREBASE_STORAGE_BUCKET',
  VITE_FIREBASE_MESSAGING_SENDER_ID: 'MISSING_VITE_FIREBASE_MESSAGING_SENDER_ID',
  VITE_FIREBASE_APP_ID: 'MISSING_VITE_FIREBASE_APP_ID',
  VITE_FIREBASE_MEASUREMENT_ID: 'MISSING_VITE_FIREBASE_MEASUREMENT_ID',
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

    // Placeholders intentionally do not enable Firebase connectivity.
    return undefined;
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

const runtimeMode =
  (typeof import.meta !== 'undefined' && import.meta.env?.MODE) ||
  (typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined) ||
  'production';

const isProdLike = runtimeMode === 'production' || import.meta.env?.PROD === true;
const isTestLike = runtimeMode === 'test' || import.meta.env?.TEST === true;
if (fallbackUsage.size > 0 && !isTestLike) {
  const fallbackKeys = Array.from(fallbackUsage);
  const guidance =
    'Firebase environment variables are required in production. ' +
    'Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, ' +
    'VITE_FIREBASE_APP_ID, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, ' +
    'and VITE_FIREBASE_MEASUREMENT_ID.';

  if (isProdLike) {
    console.error('❌ Firebase configuration error (fallback placeholders detected for keys):', fallbackKeys);
    console.error(guidance);
  } else if (import.meta.env?.DEV) {
    console.warn('⚠️ Firebase environment variables missing; running with placeholder configuration for keys:', fallbackKeys);
    console.warn(guidance);
  }
}

const hasRequiredConfig = missingKeys.length === 0;

if (!hasRequiredConfig) {
  const diagnosticMessage =
    'Missing required Firebase environment variables. Please set the following keys in your environment configuration: ' +
    missingKeys.join(', ');

  if (isProdLike && !isTestLike) {
    console.error('❌ Firebase configuration error:', diagnosticMessage);
    throw new Error(diagnosticMessage);
  }

  console.warn('⚠️ Firebase disabled — proceeding without Firebase services.');
}

const createDisabledProxy = <T extends object>(label: string, base: Record<PropertyKey, unknown> = {}): T =>
  new Proxy(base, {
    get(target, prop, receiver) {
      if (prop === Symbol.toStringTag) {
        return 'FirebaseDisabled';
      }

      if (Reflect.has(target, prop)) {
        return Reflect.get(target, prop, receiver);
      }

      throw new Error(
        `Firebase is disabled (${label}). Configure the required VITE_FIREBASE_* environment variables to enable this feature.`,
      );
    },
    apply() {
      throw new Error(
        `Firebase is disabled (${label}). Configure the required VITE_FIREBASE_* environment variables to enable this feature.`,
      );
    },
  }) as T;

let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let storageInstance: FirebaseStorage;

if (hasRequiredConfig) {
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

  app = getApps().length ? getApp() : initializeApp(resolvedConfig);

  try {
    authInstance = getAuth(app);
  } catch {
    authInstance = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  }

  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);
} else {
  app = createDisabledProxy<FirebaseApp>('app', {
    name: 'firebase-disabled',
    automaticDataCollectionEnabled: false,
    options: {},
  });

  authInstance = createDisabledProxy<Auth>('auth', {
    app,
    currentUser: null,
    languageCode: null,
    tenantId: null,
  });

  dbInstance = createDisabledProxy<Firestore>('firestore', {
    app,
    type: 'firestore',
  });

  storageInstance = createDisabledProxy<FirebaseStorage>('storage', {
    app,
  });
}

export const firebaseEnabled = hasRequiredConfig;
export const auth: Auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;

export default app;
