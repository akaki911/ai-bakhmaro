# FAQ Reference (Source: docs/faq.md)

# FAQ

## How does AI Space handle authentication?

Authentication is WebAuthn-only with Firebase Authentication acting as the identity service. See [`security.md`](security.md) for details on credential binding and session lifetimes.

## What is the recommended workflow for updating prompts?

Use Prompt Studio to create a draft version, assign reviewers, and request Super Admin approval if the change impacts guarded automations. Once approved, roll out via feature flags to a subset of users before full release.

## Can modules be disabled per environment?

Yes. Runtime config exposes `modules.enabled` arrays. The Console Shell reads this list to hide or disable modules in staging while keeping production intact.

## How are evaluation results stored?

Evaluation Lab writes scenario outcomes to Firestore under `evaluation/results` and archives raw artifacts in the Knowledge Vault bucket for reproducibility.

## Where do I find deployment history?

Operations Toolkit maintains the release timeline. Each entry links to the Firebase Hosting release ID and the Super Admin approval token used for promotion.

## Who do I contact for incident escalation?

Incidents automatically notify the Super Admin and the Platform Reliability on-call rotation. Contact information lives in Operations Toolkit and mirrors PagerDuty schedules.

For more context on architecture, refer to [`architecture.md`](architecture.md). Deployment guidance is located in [`deployment.md`](deployment.md).
