## Overview

This repository hosts the **Bakhmaro AI** workspace. It contains a React/Vite frontend, an Express-based backend gateway, and supporting automation scripts used to manage the AI assistant, memory synchronisation, and observability pipelines.

The project is now maintained directly from GitHub (no Replit integration). All scripts remain standard `npm` commands so the stack can run locally with Node.js 18+ as well.

## Prerequisites

Before running the project make sure you have:

- Node.js `>=18 <=22` (matches the engines requirement in `package.json`).
- `npm` (ships with Node.js) for installing dependencies and running scripts.
- Optional: Docker and Prometheus/Jaeger if you want to forward telemetry externally.

Clone the repository and install dependencies once:

```bash
npm install
```

## Quick start

The workspace exposes scripts for running the frontend and backend either together or independently.

### Start the full stack

```bash
npm run dev
```

This command:

1. Runs `scripts/port-cleanup.sh` to free the core development ports (`3000`, `5000`, `5001`, `5002`).
2. Launches the backend on port `5002` and the Vite dev server on port `3000` using `concurrently`.

### Run services individually

```bash
# Backend only (Express API + proxy)
npm run dev:backend

# Frontend only (Vite dev server)
npm run dev:frontend
```

### Build and type-check

```bash
npm run lint
npm run type-check
npm run build
```

The `build` command performs a TypeScript project build followed by a production Vite bundle.

## Logging & observability

The backend ships with an OpenTelemetry-powered middleware located at `backend/middleware/telemetry_middleware.js`. A structured logger is attached to each request and now supports both JSON and human-friendly output formats.

- Set `LOG_FORMAT=json` to emit strict JSON (useful for log shippers).
- The default `pretty` mode prints entries as single-line messages while still masking sensitive fields such as tokens, secrets, and session identifiers.
- Sensitive keys are automatically masked, so application code no longer needs to emit manual `[redacted]` placeholders.

Prometheus metrics are exposed on port `9092` by default, and traces are exported to Jaeger using the endpoint from `JAEGER_ENDPOINT`.

## Port diagnostics & recovery

Use the dedicated helper to inspect local development ports and gracefully stop conflicting processes before starting the dev stack:

```bash
npm run diagnose:ports
```

The script checks ports `3000`, `5000`, `5001`, and `5002` using Linux `/proc` socket metadata, reports conflicting PIDs/commands, and attempts a graceful shutdown (SIGTERM/SIGKILL) before revalidating that the ports are free.

## Troubleshooting Git workflows

If `git pull` stops with the message `You have divergent branches and need to specify how to reconcile them`, follow [docs/git-pull-divergent-branches.md](docs/git-pull-divergent-branches.md) for resolution steps tailored to this repository.
