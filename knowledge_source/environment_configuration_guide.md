# Environment Configuration Guide (Source: docs/environment.md)

# Environment Configuration

AI Space relies on Firebase runtime config (`firebase functions:config:set`) and `.env` files for local development. This document catalogues the required keys, their scopes, and rotation policies.

## Core Variables

| Key | Scope | Description | Rotation |
| --- | --- | --- | --- |
| `super.admin.uid` | Functions | Firebase UID of the Super Admin approver. | Rotate only if ownership changes |
| `service.jwt.secret` | Functions | Symmetric key used to sign service-to-service tokens. | Quarterly |
| `web.authn.rp_id` | Hosting + Auth | Relying Party ID for WebAuthn operations. | When domain changes |
| `vite_gurulo_api_base` | Hosting | API base URL injected into the AI console. | On environment rewire |
| `knowledge.vault.bucket` | Functions | Google Cloud Storage bucket for knowledge embeddings. | Annually |
| `telemetry.dataset` | Functions | BigQuery dataset name for telemetry exports. | As needed |
| `integration.gmail.credentials` | Functions | Encrypted Gmail API credentials. | Quarterly |
| `ops.runbook.repo` | Functions | Git repo URL housing runbook markdowns. | When repository moves |
| `eval.vertex.project` | Functions | Vertex AI project ID for evaluation workloads. | On project migration |

## Local Development

- Copy `.env.example` to `.env.local` and populate values referenced by `ai-frontend` and server emulators.
- Use `firebase emulators:start` with `--import ./emulator-data` to load seed roles and module fixtures.
- Local secrets should mimic the structure above but may use sandbox credentials.

## Runtime Config Management

1. Update `config/<env>.env.json` with the new values.
2. Apply with `firebase functions:config:set $(cat config/<env>.env.json | jq -r 'to_entries|map("\(.key)=\(.value)")|.[]')`.
3. Commit the sanitized manifest (without sensitive values) to version control.
4. Record rotation in the Operations Toolkit including approval token and timestamp.

## Verification

- Run `firebase functions:config:get` to ensure expected keys exist.
- Execute the Access Management diagnostic script `pnpm -w run check:auth` to confirm Super Admin mapping.
- Trigger Integration Hub smoke tests (`pnpm -w run check:integrations`) after rotating connector secrets.

For more on security posture review [`security.md`](security.md). Deployment workflows referencing these variables are documented in [`deployment.md`](deployment.md).
