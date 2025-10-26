# Architecture Overview

Gurulo AI Space is deployed entirely on Firebase to maximise managed security and operational velocity. The platform combines static hosting, serverless execution, and event-driven automations while avoiding any bespoke infrastructure.

## Hosting & Routing

- **Firebase Hosting** serves the compiled AI console (`ai-frontend`) and exposes CDN-backed caching with automatic SSL.
- A rewrite rule maps `/api/**` and `/hooks/**` to Cloud Functions so that dynamic requests never leave the Firebase perimeter.
- Preview channels mirror production configuration and allow smoke-testing branches without impacting the canonical domain.

## Cloud Functions

| Function Group | Purpose | Key Dependencies |
| --- | --- | --- |
| `api-gateway` | Terminates HTTPS, validates WebAuthn session cookies, and proxies to internal feature modules. | Firebase Auth, Firestore, OpenAI/Bard providers |
| `workflow-runner` | Executes compiled automation graphs, tracks job state, and emits telemetry. | Cloud Tasks, Firestore, Cloud Storage |
| `integration-hooks` | Accepts inbound events from Slack, Gmail, HTTP webhooks, and transforms them into workflow triggers. | Secret Manager, Firestore |
| `evaluation-suite` | Runs regression scenarios and writes aggregate scores for the Evaluation Lab. | Vertex AI, Firestore |
| `telemetry-exporter` | Streams metrics and audit logs into BigQuery for long-term analytics. | BigQuery, Cloud Logging |

Functions share a thin Express router that verifies Super Admin approvals before applying privileged mutations.

## Data Stores

- **Firestore** holds prompt versions, workflow definitions, credential scopes, and Super Admin policy ledgers.
- **Cloud Storage** stores uploaded assets, evaluation datasets, and vector embeddings for the Knowledge Vault.
- **BigQuery** receives batched exports for dashboards and anomaly detection.

## Edge Integrations

- WebAuthn relies on Firebase Authentication with multi-device passkey support.
- Outbound webhooks and integrations originate from Cloud Functions with service accounts restricted through IAM roles.
- Real-time updates use Firebase Realtime Database fan-out channels for console notifications.

## Observability

- Cloud Logging captures structured events emitted by each module.
- Monitoring alerts are configured in Cloud Monitoring and aggregated in the Telemetry Center module.
- Incident response runbooks link to relevant dashboards and Cloud Trace spans.

For deployment flow and release policies see [`deployment.md`](deployment.md). Module responsibilities are catalogued in [`modules.md`](modules.md).
