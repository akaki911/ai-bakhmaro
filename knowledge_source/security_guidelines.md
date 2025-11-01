# Security Guidelines (Source: docs/security.md)

# Security & Access Control

Security in Gurulo AI Space is codified around a single Super Admin authority and WebAuthn-first authentication. This document outlines the guarantees, technical controls, and review rituals that keep the workspace hardened.

## Super Admin Workflow

- `SUPER_ADMIN_UID` identifies the canonical approver for guarded actions (deployments, schema updates, connector scopes).
- All privileged requests include a signed approval token stored in Firestore under `policy/approvals/<requestId>`.
- Approvals are mirrored to Cloud Storage for immutable retention and piped to BigQuery for auditing.
- If the Super Admin is unavailable, the Operations Toolkit provides an escalation policy but cannot bypass approval recording.

## WebAuthn Authentication

- Users must register passkey credentials through Firebase Authentication; password-based sign-in is disabled in production.
- Relying Party ID is `ai.gurulo.app` (configurable via `WEB_AUTHN_RP_ID`).
- Attestation is validated on-device and persisted in Firestore with hardware metadata.
- Every session refresh re-validates WebAuthn assertions; tokens expire after 30 minutes of inactivity.

## Role Model

| Role | Capabilities |
| --- | --- |
| Super Admin | Approve guarded workflows, rotate secrets, manage environment configs. |
| Operator | Trigger deployments, run evaluation suites, access telemetry dashboards. |
| Builder | Manage prompts, workflows, integrations within assigned scopes. |
| Viewer | Read-only access to dashboards and knowledge artifacts. |

Firestore security rules enforce least privilege: each module reads `roles/<userId>` and checks membership before allowing mutations.

## Secrets & Config Management

- Secrets live in Firebase Functions runtime config and Google Secret Manager. They are rotated quarterly or after incidents.
- Integration Hub connectors receive dedicated service accounts; tokens are never stored in plaintext.
- Console Shell never logs secrets; structured logging redacts matching patterns using Data Loss Prevention rules.

## Compliance & Monitoring

- Weekly audits export Super Admin approvals and WebAuthn registrations to BigQuery for compliance review.
- Telemetry Center monitors authentication anomalies (e.g., repeated assertion failures, revoked credentials).
- Incident reports must reference the approval token and WebAuthn credential ID involved in the breach.

For deployment safeguards, review [`deployment.md`](deployment.md). Runtime configuration expectations are recorded in [`environment.md`](environment.md).
