'use strict';

const GURULO_FIREBASE_PUBLIC_CONFIG = Object.freeze({
  apiKey: 'AIzaSyBPkVGW4VsM55GlEB6koU3ZYkKmLATMGC8',
  authDomain: 'ai-bakhmaro.firebaseapp.com',
  projectId: 'ai-bakhmaro',
  storageBucket: 'ai-bakhmaro.appspot.com',
  messagingSenderId: '34250385727',
  appId: '1:34250385727:web:7ca8712e87287c0ff38b8a',
  measurementId: '__OPTIONAL_AI_SPACE_FIREBASE_MEASUREMENT_ID__',
});

const getFirebasePublicConfig = (overrides = {}) => ({
  ...GURULO_FIREBASE_PUBLIC_CONFIG,
  ...overrides,
});

module.exports = {
  GURULO_FIREBASE_PUBLIC_CONFIG,
  getFirebasePublicConfig,
};
