const path = require('path');
const admin = require('firebase-admin');
const runtimeConfig = require('./config/runtimeConfig');
const { createDevFirestore } = require('./utils/devFirestoreStub');

const createDisabledAdminStub = () => {
  const message = 'Firebase Admin is disabled (fb_admin=disabled)';
  const thrower = () => {
    throw new Error(message);
  };

  return {
    disabled: true,
    apps: [],
    initializeApp: thrower,
    firestore: thrower,
    auth: thrower,
    credential: {
      cert: thrower,
    },
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

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });

      const sourceSuffix = source ? ` [${source}]` : '';
      console.log(`✅ Firebase Admin initialized successfully${sourceSuffix}`);
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
