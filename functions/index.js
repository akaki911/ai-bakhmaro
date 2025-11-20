const functions = require("firebase-functions");
const express = require("express");

let cachedApp = null;

const buildApp = () => {
  // Force non-fatal "development" mode inside Cloud Functions bundle
  process.env.NODE_ENV = 'development';
  // Minimal env fallbacks for Cloud Functions runtime
  const fallbackSecret = 'cloud-functions-session-secret-64chars-cloud-functions-session-secret';
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = functions.config().app?.session_secret || fallbackSecret;
  }
  if (!process.env.ADMIN_SETUP_TOKEN) {
    process.env.ADMIN_SETUP_TOKEN = functions.config().app?.admin_setup_token || 'cloud-functions-admin-token';
  }
  if (!process.env.FIREBASE_PROJECT_ID) {
    process.env.FIREBASE_PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'ai-bakhmaro';
  }
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // Let backend skip Admin bootstrap when running inside Functions bundle without full service account
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = '';
  }

  const app = express();
  app.use(express.json());

  app.get("/", (req, res) => {
    res.status(200).send("OK");
  });

  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      service: "functions",
      timestamp: new Date().toISOString()
    });
  });

  // Lazy-load the backend Express app to avoid heavy initialization during deploy analysis
  // Use bundled backend copy inside functions source (see scripts/bundle-backend.js)
  const backendApp = require("./backend-dist/app");
  app.use("/", backendApp);
  return app;
};

exports.backendApi = functions.region("europe-west1").https.onRequest((req, res) => {
  if (!cachedApp) {
    cachedApp = buildApp();
  }
  return cachedApp(req, res);
});
