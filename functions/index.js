const functions = require("firebase-functions");
const express = require("express");

let cachedApp = null;

const buildApp = () => {
  process.env.NODE_ENV = 'production';

  // Load environment variables from Firebase function configuration
  const appConfig = functions.config().app;
  if (appConfig) {
    process.env.SESSION_SECRET = appConfig.session_secret;
    process.env.ADMIN_SETUP_TOKEN = appConfig.admin_setup_token;
    process.env.AI_INTERNAL_TOKEN = appConfig.ai_internal_token;
  }

  // Standard Google Cloud env var for project ID
  if (!process.env.FIREBASE_PROJECT_ID) {
    process.env.FIREBASE_PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
  }
  // DO NOT set FIREBASE_SERVICE_ACCOUNT_KEY manually.
  // The Functions runtime provides this automatically.


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
