const functions = require("firebase-functions");
const express = require("express");
const app = express();
app.use(express.json());
const backendApp = require("../backend/app");

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

app.use("/api", backendApp);
exports.api = functions.region("europe-west1").https.onRequest(app);
