# Phase 9B Inventory

Generated: 2025-10-29T21:22:08.104385Z

- **ai-frontend** — Referenced
  - package.json: workspace entry & dev scripts
  - firebase.json: hosting public directory

- **backend** — Referenced
  - restart-services-smart.sh: service start commands
  - backend/package.json: package definition

- **functions** — Referenced
  - deploy-functions.sh: firebase deploy
  - functions/package.json: package definition

- **ai-service** — Referenced
  - restart-services.sh: service start commands
  - backend/routes/auto_improve.js: imports AI service data

- **shared** — Referenced
  - backend/index.js: imports shared config
  - ai-service/routes/ai_chat.js: imports shared core

- **gateway** — Referenced
  - package.json: workspace entry
  - gateway/package.json: package definition

- **docs** — Referenced
  - README.md: links to docs
  - backend/services/githubAiService.js: docs directory allow-list

- **knowledge_source** — Referenced
  - scripts/build_knowledge_base.js: reads markdown knowledge

- **scripts** — Referenced
  - package.json: build & tooling scripts

- **tests** — Referenced
  - eslint.config.mjs: lint include
  - tests/ai-chat/smoke.test.js: integration tests

- **artifacts** — Referenced
  - system-health-check.js: writes reports

- **ai** — Unreferenced (candidate for removal)
  - No references found in current scan

- **middleware** — Unreferenced (candidate for removal)
  - No references found in current scan
