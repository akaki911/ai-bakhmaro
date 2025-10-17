import admin from 'firebase-admin';
import { getEnv } from './env';

const env = getEnv();

const initialiseApp = () => {
  if (admin.apps.length > 0) {
    return;
  }

  try {
    if (env.FIREBASE_SERVICE_ACCOUNT) {
      const credentials = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
        projectId: env.FIREBASE_PROJECT_ID,
      });
      return;
    }

    if (env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: env.FIREBASE_PROJECT_ID,
      });
      return;
    }
  } catch (error) {
    console.warn('⚠️  Falling back to default Firebase admin initialization:', error);
  }

  admin.initializeApp({
    projectId: env.FIREBASE_PROJECT_ID,
  });
};

initialiseApp();

export const firestore = admin.firestore();
export { admin };
