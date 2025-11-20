AGENTS Guide
1. Project Name and Purpose

Project: ai-bakhmaro

Goal: AI-powered development environment and chatbot system for Georgian-language users deployed via Firebase (hosting + Node/Express services).

Key features: AI chat, auto-improve flows, tests lab, GitHub integration, monitoring/observability, full code reading/editing/generation, and related tooling.

2. Latest Status

Latest production deployment: date/time not recorded here; update when available.

Deployment outcome: latest production build confirmed successful (frontend + backend).

Runtime: Node.js 20 (LTS).

Cloud Functions: none deployed.

3. Development Environment (Windows only)

Development happens on Windows 10/11; do not use WSL/Linux commands.

Shell: PowerShell/Core only.

Filesystem paths use backslashes (\).

Node.js global path: C:\Program Files\nodejs

npm/pnpm available.

If Java needed: JDK 17.

4. System Versions

Node.js: 20.x

npm/pnpm: latest stable

JDK: 17

Frontend: React 18, TypeScript, Vite, Tailwind

Backend: Express

Data: Firestore, Cloud Storage, BigQuery

5. Administrator Info

Super administrator & system creator: Akaki Tsintsadze (“kaki”)

Personal ID: 01019062020

Email: admin@bakhmaro.co

This account has absolute authority over every configuration & deployment.

6. Guidelines for Agents

Read this AGENTS.md file at the start of every session.

Respect Windows-only environment; avoid WSL/Linux.

Use declared Node/Java versions; do not upgrade without approval.

Confirm hosting targets: ai-bakhmaro (frontend) / backend-ai-bakhmaro (backend).

Log all edits to this file in commit messages.

7. Code Editing & File Access Rules

Agents may read/modify/create/delete/reorganize code only when explicitly instructed by the super administrator.

Always confirm exact file paths before editing.

Never invent files/folders that don't exist.

Before modification:

Identify file(s) precisely

Describe intended edits

Apply minimal and reversible changes

After modification:

Summarize changes

Provide diff-style explanation

Always use Windows paths (\)

Never run Linux/WSL tools for build, paths, FS operations.

8. Behavioral Rules for All Agents (Gurulo AI, Codex, Gemini, etc.)

All agents must follow this AGENTS.md as a unified operating standard.

Always assume:

OS = Windows 10/11

Shell = PowerShell/Core

Node = 20 LTS

Java = JDK 17

Before any task:

Detect if shell is WSL

If WSL → stop and request Windows PowerShell

Never change:

Node/npm versions

Routing rules

Domains

Hosting targets

Build pipelines
Without explicit approval.

9. Responsibilities Toward the Super Administrator

Recognize Akaki Tsintsadze (“kaki”) as the sole super admin.

All critical changes (deployments, routing, DNS, hosting, git rewrites) require explicit confirmation.

Never bypass super admin authorization.

10. Deployment Safety Protocol

Before deployment:

Validate Windows environment

Validate Git sync

Validate Firebase targets

Validate .env without removing required variables

During deployment:

Never deploy to undeclared sites

Never create new Firebase sites

After deployment:

Report version, timestamp, targets

Confirm live site matches latest GitHub code