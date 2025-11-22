# Refactor Monorepo Architecture for Service Isolation

## Step 1: Restructure Shared Package
- [ ] Move root `shared/` directory to `packages/shared/`
- [ ] Update `pnpm-workspace.yaml` to include `packages/shared` and rename to `@ouranos/shared`
- [ ] Update `packages/shared/package.json` to set name as `@ouranos/shared` and add proper exports

## Step 2: Extract Common Code to Shared Package
- [ ] Move `backend/shared/utils/ensureLocalSecrets.js` to `packages/shared/utils/ensureLocalSecrets.js`
- [ ] Move `ai-service/shared/utils/ensureLocalSecrets.js` to `packages/shared/utils/ensureLocalSecrets.js` (merge if different)
- [ ] Move other common utilities from service shared/ folders to `packages/shared/`
- [ ] Ensure all common logic (env loader, types, utils, DTOs) is in `packages/shared/`

## Step 3: Update Imports in Services
- [ ] Update all services to import from `@ouranos/shared` instead of local shared/
- [ ] Replace relative imports like `../../shared/` with `@ouranos/shared`
- [ ] Ensure each service imports only from own source, `@ouranos/shared`, or npm deps

## Step 4: Remove Service-Specific Shared Folders
- [ ] Delete `backend/shared/`
- [ ] Delete `ai-service/shared/`
- [ ] Delete `functions/shared/` if exists
- [ ] Delete `gateway/shared/` if exists

## Step 5: Replace Cross-Service Direct Usage with API Calls
- [ ] Identify any direct file usage between services (e.g., backend calling ai-service functions directly)
- [ ] Replace with HTTP API calls (REST)
- [ ] Update service code to use fetch or axios for inter-service communication

## Step 6: Update Docker and Nixpacks Configs
- [ ] Modify Dockerfiles to ensure independent builds (no cross-dependencies)
- [ ] Update `nixpacks.toml` for ai-service to build independently
- [ ] Verify each service can build without access to other workspaces

## Step 7: Verify and Test
- [ ] Run `pnpm install` to ensure workspaces resolve correctly
- [ ] Test independent Docker builds for each service
- [ ] Ensure services communicate only via API
- [ ] Run integration tests to confirm no cross-imports remain
