const functions = require("firebase-functions");
const express = require("express");
const app = express();
app.use(express.json());
const backendApp = require("../backend/app");

app.use("/api", backendApp);
exports.api = functions.region("europe-west1").https.onRequest(app);
