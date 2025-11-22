const path = require('path');
const admin = require('firebase-admin');
const runtimeConfig = require('./config/runtimeConfig');
const { createDevFirestore } = require('./utils/devFirestoreStub');

const createDisabledAdminStub = () => {
  const message = 'Firebase Admin is disabled (fb_admin=disabled)';
  const noop = () => {};
  const mockCollection = () => ({
    doc: () => ({
      collection: () => mockCollection(),
      get: async () => ({ exists: false, empty: true, data: () => ({}) }),
      set: async () => {},
      delete: async () => {},
    }),
    get: async () => ({ empty: true }),
    where: () => mockCollection(),
    limit: () => mockCollection(),
    orderBy: () => mockCollection(),
  });
  const mockFirestore = () => ({
    __isMockFirestore: true,
    collection: mockCollection,
    doc: () => ({ collection: mockCollection, get: async () => ({ exists: false, empty: true, data: () => ({}) }), set: async () => {}, delete: async () => {} }),
    batch: () => ({ update: noop, commit: async () => {} }),
  });
  const mockAuth = () => ({
    getUser: async () => null,
    verifyIdToken: async () => null,
    createCustomToken: async () => null,
  });
  const mockCredential = () => ({
    cert: noop,
    applicationDefault: noop,
  });

  return {
    disabled: true,
    apps: [],
    initializeApp: noop,
    firestore: mockFirestore,
    auth: mockAuth,
    credential: mockCredential(),
  };
};

if (!runtimeConfig.integrations.firebase.enabled) {
  console.warn('⚠️ [Firebase] Skipping Firebase Admin bootstrap — fb_admin=disabled');
  module.exports = createDisabledAdminStub();
} else {
  // Initialize Firebase Admin only once
  if (!admin.apps.length) {
    try {
      const { credential: serviceAccount, stringValue, source } = runtimeConfig.firebaseAccount;

      if (!serviceAccount) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is missing or invalid');
      }

      // Ensure other modules can reuse the resolved JSON string
      if (stringValue) {
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY = stringValue;
      }

      const projectId = serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID;

      if (!projectId) {
        throw new Error(
          'FIREBASE_PROJECT_ID environment variable is required when project_id is not present in the service account JSON.',
        );
      }

      const sourceSuffix = source ? ` [${source}]` : '';
      const tryInitialize = (credentialFactory, label) => {
        try {
          admin.initializeApp({
            credential: credentialFactory(),
            projectId,
          });
          console.log(`✅ Firebase Admin initialized${sourceSuffix} via ${label}`);
          return true;
        } catch (initError) {
          console.error(`❌ Firebase Admin init failed via ${label}:`, initError.message);
          return false;
        }
      };

      // First attempt: explicit service account JSON
      let initialized = tryInitialize(() => admin.credential.cert(serviceAccount), 'service account');

      // Fallback: application default credentials (useful on Cloud Functions or gcloud-authenticated hosts)
      if (!initialized) {
        initialized = tryInitialize(() => admin.credential.applicationDefault(), 'applicationDefault');
      }

      // Final fallback for local/non-production: disable Admin instead of crashing deployment analysis
      if (!initialized) {
        if (runtimeConfig.env.isProduction) {
          throw new Error('Firebase Admin initialization failed in production environment');
        }

        console.warn('⚠️ [Firebase] Switching to disabled Admin stub for non-production (init failures above).');
        module.exports = createDisabledAdminStub();
        return module.exports;
      }
    } catch (error) {
      console.error('❌ Firebase Admin initialization failed:', error.message);
      throw error;
    }
  }

  const shouldUseStub =
    process.env.FIREBASE_USE_LOCAL_STUB !== 'false' && process.env.NODE_ENV !== 'production';

  if (shouldUseStub) {
    const storagePath = process.env.FIREBASE_STUB_STORAGE_PATH
      ? path.resolve(process.env.FIREBASE_STUB_STORAGE_PATH)
      : path.join(__dirname, 'tmp', 'firestore-dev.json');

    const firestoreInstance = createDevFirestore({ storagePath });
    const firestoreFactory = () => firestoreInstance;

    const buildTimestampWrapper = (input) => {
      const date = input instanceof Date ? input : new Date(input);
      return {
        toDate: () => date,
        toMillis: () => date.getTime(),
        toISOString: () => date.toISOString(),
        valueOf: () => date.getTime(),
      };
    };

    firestoreFactory.FieldValue = {
      serverTimestamp: () => new Date(),
    };

    firestoreFactory.Timestamp = {
      fromDate: (input) => buildTimestampWrapper(input),
      now: () => buildTimestampWrapper(new Date()),
    };

    admin.firestore = firestoreFactory;
    process.env.FIREBASE_ADMIN_USING_STUB = 'true';
    Object.defineProperty(admin, '__devFirestoreInstance', {
      value: firestoreInstance,
      configurable: true,
      enumerable: false,
      writable: true,
    });
    console.warn(`⚠️ [Firebase] Using development Firestore stub at ${storagePath}`);

    const verificationInstance = firestoreFactory();
    if (verificationInstance?.__isDevFirestoreStub) {
      console.log('🧪 [Firebase] Development Firestore stub verified');
    }

    console.log(
      `🧪 [Firebase] Dev stub instance cached: ${admin.__devFirestoreInstance ? 'yes' : 'no'}`
    );
  }

  // Export the initialized admin instance
  module.exports = admin;
}