# Operations Playbook (Source: docs/operations.md)

# Operations & Monitoring

The Operations Toolkit module provides a unified console for monitoring AI Space health, coordinating incidents, and recording approvals. This runbook supplements the tooling with daily, weekly, and incident-specific tasks.

## Daily Rituals

- Review Telemetry Center dashboard for latency regressions across Prompt Studio and Workflow Builder.
- Check the Integration Hub queue depth; any backlog beyond 100 messages triggers a pager alert.
- Confirm Access Management audit log rotation executed overnight (automated via Cloud Scheduler).

## Weekly Tasks

- Export Super Admin approval ledger to BigQuery and share summary metrics with the Security Office.
- Rotate Integration Hub sandbox credentials and validate webhook deliveries.
- Run Evaluation Lab regression pack `eval-weekly` and archive the results in Knowledge Vault.

## Incident Response

1. **Triage** – Use the console incident panel to assess scope, impacted modules, and latest deployments.
2. **Stabilise** – Apply runbooks stored in the `ops.runbook.repo` repository referenced in environment config.
3. **Communicate** – Broadcast updates via Integration Hub webhooks and status pages.
4. **Document** – Log incident timeline, root cause, and corrective actions in Operations Toolkit.

## Tooling Integrations

- BigQuery scheduled queries feed Telemetry Center anomaly detection cards.
- PagerDuty hooks into Cloud Monitoring alerts for SLA breaches.
- GitHub Actions emit deployment statuses consumed by the release timeline widget.

## Access & Permissions

- Operations Toolkit requires Operator or higher role.
- Incident creation automatically pings the Super Admin for awareness.
- Editing runbooks demands Super Admin approval and is executed via pull requests in the runbook repository.

Refer to [`modules.md`](modules.md) for module ownership and [`security.md`](security.md) for role definitions.
