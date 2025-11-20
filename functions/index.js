const functions = require("firebase-functions");
const express = require("express");

let cachedApp = null;

const buildApp = () => {
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
