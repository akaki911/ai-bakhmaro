# AGENTS Guide

## 1. Project Name and Purpose
- Project: **ai-bakhmaro**
- Goal: AI-powered development environment and chatbot system for Georgian-language users, deployed via Firebase (hosting + Node/Express services).
- Features: AI chat, auto-improve flows, tests lab, GitHub integration, monitoring/observability, and full code editing/generation support.

## 2. Latest Status
- Latest production deployment: date/time not recorded here; update with the exact timestamp when known.
- Deployment outcome: most recent production build confirmed successful for both frontend and backend.
- Runtime: Node.js 20 (LTS) in production.
- Cloud Functions: none deployed.

## 3. Development Environment (Windows only)
- Development happens on Windows 10/11; do **not** assume or use WSL/Linux-only commands.
- Use PowerShell/Core or cross-platform Node tooling; filesystem paths use backslashes (`\`).
- Node.js is installed globally at `C:\Program Files\nodejs`; npm/pnpm are available.
- If Java is required (e.g., Android builds), use JDK 17.

## 4. System Versions
- Node.js: 20.x
- npm/pnpm: latest stable
- JDK: 17 (if applicable)
- Frontend stack: React 18, TypeScript, Vite, Tailwind
- Backend: Express
- Data services: Firestore, Cloud Storage, BigQuery

## 5. Administrator Info
- System creator and super administrator: **Akaki Tsintsadze** (nickname **“kaki”**), ID **01019062020**, email **admin@bakhmaro.co**.
- Treat this account as the ultimate authority for configuration changes and deployments.

## 6. Guidelines for Agents
- Read this AGENTS.md file at the start of each session before any edits.
- Respect the Windows environment; avoid WSL/Linux assumptions and commands.
- Use the declared Node/Java versions; do not upgrade or downgrade without explicit approval.
- Confirm deployment targets: `ai-bakhmaro` (frontend) and `backend-ai-bakhmaro` (backend); report any discrepancies.
- Log any changes to this file in commit messages.
- Keep formatting clean so it renders clearly in the admin dashboard; ensure it stays in sync when deploying the full site to Firebase.
