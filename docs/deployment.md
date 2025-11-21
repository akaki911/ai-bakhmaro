# Deployment Guide

This guide covers the staged release process for Gurulo AI Space across development, staging, and production environments.

## Prerequisites

- Firebase CLI authenticated with the project service account.
- `.runtimeconfig.json` populated via `firebase functions:config:get > .runtimeconfig.json` for the target environment.
- Super Admin approval recorded in the Operations Toolkit, referencing the release ticket ID.
- `BACKEND_INTERNAL_URL` exported for the AI Service to target the internal Backend load balancer (production deployments **must**
  use the private network address, not a loopback host).

## Build Steps

1. `pnpm install` – ensures consistent lockfile resolution.
2. `pnpm build` – compiles the AI console and shared packages.
3. `pnpm test` – optional but recommended prior to staging promotions.

## In-App Deploy Runner

Super Admins can trigger Firebase updates directly from the **Deploy** tab in the admin console. The UI calls
`POST /api/ai/deploy/firebase`, streams every `pnpm`/`firebase` log line over SSE, and mirrors the steps from this guide:

1. `pnpm install --frozen-lockfile` (optional toggle in the UI).
2. `pnpm build`.
3. `firebase deploy --only hosting,functions --project <FIREBASE_PROJECT_ID>`.

Before using the Deploy tab:

- Configure `FIREBASE_SERVICE_ACCOUNT_KEY`, `FIREBASE_PROJECT_ID`, and `FIREBASE_TOKEN` in secrets/env.
- Ensure the repo is up to date locally (Deploy tab uses the current workspace).
- Capture the streamed logs from the UI and attach them to the release ticket.

The Deploy tab does **not** replace the smoke tests or approval workflow – complete the checks below after every run.

## Deploy to Staging

```bash
firebase deploy --only hosting,functions --project gurulo-ai-space-staging
```

- Verify Hosting preview channel URL and run smoke tests listed below.
- Confirm Cloud Functions logs show successful cold starts and no permission errors.

## Promote to Production

```bash
firebase deploy --only hosting,functions --project gurulo-ai-space
```

- Production deploys must include the Super Admin approval token ID in the deployment notes.
- After deployment, trigger the Telemetry Center synthetic checks (`npm run check --workspace operations`) to validate module health.

## Smoke Tests

| Check | Command | Expected Result |
| --- | --- | --- |
| Hosting health | `curl -I https://ai.gurulo.app/` | `200 OK` with `x-served-by: firebasehosting` |
| API gateway | `curl -I https://ai.gurulo.app/api/health` | `200 OK` and build SHA header |
| Workflow execution | Trigger sample workflow from Console Shell | Job status `SUCCEEDED` in Task Orchestrator logs |
| WebAuthn login | Authenticate with passkey | New session recorded in Firestore audit log |

## Rollback Strategy

- Use `firebase hosting:channel:deploy <channel>` to revert to the last stable snapshot.
- Redeploy the previous Functions version via `firebase functions:rollback` when necessary.
- Document the rollback in Operations Toolkit with impact assessment and remediation tasks.

## Post-Deploy Checklist

1. Update the release timeline in Operations Toolkit.
2. Archive the Super Admin approval token with deployment metadata.
3. Review BigQuery export latency and adjust Telemetry Center alerts if anomalies persist.

For environment configuration details consult [`environment.md`](environment.md). Security prerequisites are enumerated in [`security.md`](security.md).
