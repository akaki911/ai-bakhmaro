# Gurulo AI Space Platform

Gurulo AI Space is a Firebase-native automation workspace that unifies conversational AI, workflow orchestration, and knowledge governance for supercharged operations teams. This repository contains the configuration, frontend bundles, and Cloud Functions glue that power the managed AI environment.

## Architecture

The production stack is provisioned on **Firebase Hosting** with dynamic routes served through **Cloud Functions for Firebase**. High-level flow:

1. The Vite-built AI console is deployed as a static bundle to Firebase Hosting and cached at the CDN edge.
2. Hosting rewrites `/api/**` requests to a regional HTTPS Cloud Function that brokers LLM calls, automation jobs, and secure integrations.
3. Long-running automations dispatch background tasks to Cloud Tasks and persist state in Firestore. Event webhooks from partner tools enter through dedicated HTTPS Functions guarded by WebAuthn service tokens.
4. Operations telemetry, evaluation artifacts, and audit trails live in Firestore and Cloud Storage buckets scoped to the AI Space project.

The [`docs/architecture.md`](docs/architecture.md) page diagrams component responsibilities and the deployment topology in detail.

## Core Modules

Gurulo AI Space exposes ten modular surfaces that can be toggled per environment:

1. **Console Shell** – authenticated React dashboard with navigation, announcements, and status insights.
2. **Prompt Studio** – versioned prompt management with validation hooks and rollout controls.
3. **Workflow Builder** – visual node editor that compiles automation graphs executed by Cloud Functions.
4. **Task Orchestrator** – queue-backed engine that schedules function invocations and monitors retries.
5. **Knowledge Vault** – Firestore-backed document graph with semantic search and retention policies.
6. **Evaluation Lab** – scenario runner for regression tests, synthetic data playback, and scoring.
7. **Integration Hub** – managed connectors (Slack, Gmail, HTTP) with secret rotation and per-scope analytics.
8. **Telemetry Center** – observability dashboards for latency, cost, and quality metrics sourced from BigQuery exports.
9. **Access Management** – role lattice anchored by Super Admin approval and WebAuthn credential binding.
10. **Operations Toolkit** – guided runbooks, release timeline, and incident collaboration utilities.

Each module is described in [`docs/modules.md`](docs/modules.md) with ownership, SLAs, and implementation notes.

## Security Model

Security is anchored by a dedicated Super Admin identity that authorises privileged workflows and approves guarded releases. End users authenticate with passwordless WebAuthn credentials backed by Firebase Authentication. Key guarantees include:

- All privileged mutations require a Super Admin signed policy decision stored in Firestore and mirrored to Cloud Storage for retention.
- WebAuthn credentials are hardware-bound; fallback OTPs are disabled in production.
- Service-to-service calls are issued short-lived JWTs minted by Cloud Functions and validated on every edge request.
- Firestore security rules restrict module access to scoped roles defined in [`docs/security.md`](docs/security.md).

## Deployment Notes

Deployments promote from staging to production through Firebase Hosting channels:

1. Run `pnpm build` in the root to compile the AI frontend and package shared modules.
2. Execute `firebase deploy --only hosting,functions` with the appropriate `.env.production` file sourced via `.runtimeconfig.json`.
3. Verify the Functions logs for successful cold starts, and confirm Hosting channel activation.
4. Capture a change record in the Operations Toolkit with Super Admin approval linked to the deployment ID.

[`docs/deployment.md`](docs/deployment.md) enumerates the full release checklist, rollback strategy, and smoke tests.

## Environment Variables

Environment configuration is centralised in Firebase runtime config. The most critical keys are summarised below; refer to [`docs/environment.md`](docs/environment.md) for exhaustive tables.

| Variable | Scope | Purpose |
| --- | --- | --- |
| `VITE_GURULO_API_BASE` | Frontend | Base URL for proxied API calls from the AI console. |
| `SERVICE_JWT_SECRET` | Cloud Functions | Symmetric key for issuing short-lived service tokens. |
| `SUPER_ADMIN_UID` | Cloud Functions | Canonical UID that may approve guarded workflows. |
| `WEB_AUTHN_RP_ID` | Frontend + Auth | Relying Party identifier used during WebAuthn registration and assertion. |
| `TELEMETRY_DATASET` | Cloud Functions | BigQuery dataset ID for ingestion of metrics exported from Firestore triggers. |
| `KNOWLEDGE_VAULT_BUCKET` | Cloud Functions | Storage bucket storing vectorised knowledge artifacts. |

## Documentation Index

- [`docs/architecture.md`](docs/architecture.md) – hosting topology, component dependencies, and dataflow diagrams.
- [`docs/modules.md`](docs/modules.md) – full catalogue of the ten AI Space modules and their lifecycles.
- [`docs/security.md`](docs/security.md) – access control, WebAuthn policies, and secrets governance.
- [`docs/deployment.md`](docs/deployment.md) – staging, promotion, rollback, and incident readiness.
- [`docs/environment.md`](docs/environment.md) – runtime configuration keys, examples, and rotation guidance.
- [`docs/operations.md`](docs/operations.md) – monitoring hooks, on-call rituals, and response templates.
- [`docs/faq.md`](docs/faq.md) – quick answers for onboarding engineers and administrators.

The documentation and tooling in this repository are optimised for Gurulo AI Space. Any references to legacy booking or rental flows should be considered obsolete and reported as defects.
