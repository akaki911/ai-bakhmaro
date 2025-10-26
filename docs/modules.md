# Module Catalogue

The AI Space runtime is composed of ten modules. Each module has a single tech owner, a defined service level agreement (SLA), and an explicit upgrade pathway. The table below summarises the responsibilities and relationships.

| # | Module | Description | Owner | SLA |
| --- | --- | --- | --- | --- |
| 1 | Console Shell | React shell that frames navigation, announcements, and live notifications. | Frontend Guild | 99.9% UI uptime |
| 2 | Prompt Studio | Versioned prompt library with guardrails, rollout rings, and approval workflows. | AI Tooling Squad | 99.5% |
| 3 | Workflow Builder | Drag-and-drop graph editor that compiles automations for the Task Orchestrator. | Automation Squad | 99.0% |
| 4 | Task Orchestrator | Cloud Task-backed execution plane responsible for retries and SLA monitoring. | Automation Squad | 99.95% |
| 5 | Knowledge Vault | Document store with vector search, retention, and redaction policies. | Knowledge Team | 99.9% |
| 6 | Evaluation Lab | Scenario runner for regression evaluation and continuous benchmarking. | QA & Eval Guild | 99.5% |
| 7 | Integration Hub | Connector catalogue (Slack, Gmail, REST) with per-scope analytics and throttling. | Integrations Pod | 99.9% |
| 8 | Telemetry Center | Observability dashboards, alert routing, and BigQuery exports. | Platform Reliability | 99.9% |
| 9 | Access Management | Role lattice, policy enforcement, and Super Admin review queue. | Security Office | 99.99% |
| 10 | Operations Toolkit | Runbooks, deployment timeline, and incident collaboration utilities. | Operations Desk | 99.9% |

## Module Interfaces

- Modules communicate via Cloud Functions using signed JWTs. Access Management issues and rotates client credentials.
- Shared schemas live in Firestore collections prefixed with `module_<name>` to simplify access audits.
- Frontend bundles lazy-load module features based on feature flags defined in runtime config.

## Roadmap Alignment

- Prompt Studio and Workflow Builder share a future roadmap item to enable cross-module experiment buckets.
- Telemetry Center will ingest Evaluation Lab metrics to visualise win-rate over time.
- Operations Toolkit surfaces integration health incidents sourced from Integration Hub webhooks.

Refer to [`architecture.md`](architecture.md) for the underlying infrastructure and [`operations.md`](operations.md) for on-call responsibilities.
