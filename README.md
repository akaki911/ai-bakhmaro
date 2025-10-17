# Bakhmaro AI Stack

## TypeScript service map
| Service | Directory | Default port | Description |
| --- | --- | --- | --- |
| Gateway API | `gateway/` | 8080 | Express proxy that fronts all browser traffic, handles login redirects, and issues service JWTs before forwarding requests to downstream APIs. |
| Property API | `property-api/` | 5100 | Express microservice that serves property commission data and health information consumed by the gateway. |
| AI Frontend | `ai-frontend/` | 5173 | Vite-powered React UI bundled for both local development and static hosting behind the gateway. |

The compose file maps each container port to the same host port so the services are reachable at `http://localhost:<port>` when started with Docker Compose.

## Authentication request sequence
1. A browser request to `/` lands on the gateway.
2. If no auth headers or session cookies are present, the gateway responds with `302 /login`.
3. Authenticated traffic (or any other `GET`) is served the compiled `index.html`, which bootstraps the Vite frontend.

This flow is implemented in the gateway entrypoint: unauthenticated requests on `/` are redirected to `env.LOGIN_PATH` (default `/login`), while a shared `sendIndexHtml` helper responds with the SPA shell for authenticated or subsequent routes.

## Configuration matrix
| Variable | Consumed by | Defaults & source | Purpose | Switching notes |
| --- | --- | --- | --- | --- |
| `AI_DOMAIN` | Frontend & gateway containers | Defaults to `http://localhost:5173` when unset in Compose. | Used by client code and reverse proxy logic to describe the public-facing AI hostname. | Set this to your live AI domain (e.g., `https://ai.bakhmaro.co`) when deploying beyond localhost. |
| `ROOT_DOMAIN` | Frontend & gateway containers | Defaults to `localhost` in Compose. | Controls cookie / redirect handling that depends on the parent domain. | Replace with `bakhmaro.co` (or your root) so redirects like `bakhmaro.co → ai.bakhmaro.co` resolve correctly. |
| `REMOTE_SITE_BASE` | Gateway | Resolved to `http://ai-frontend:5173` in Compose, or falls back to `UPSTREAM_API_URL` → `http://127.0.0.1:5002` in code. | Target for `/api` proxy traffic that ultimately serves the public site. | Point this at the desired upstream: keep a Replit URL during development, then switch to `https://bakhmaro.co` for production. |
| `JWT_SECRET` | Gateway | Required; Compose enforces presence. | Signs the short-lived service tokens injected on proxied requests. | Rotate per environment. Must be at least 16 characters to satisfy validation. |

## Docker Compose workflow
1. Copy and edit `.env` with the matrix values above.
2. Build and start the stack with `docker compose up --build`.
3. The containers expose:
   - Frontend on `5173` with an HTTP health probe that fetches `/`.
   - Gateway on `8080` with a `GET /health` probe.
   - Property API on `5100` with a `GET /health` probe.
4. Stop with `Ctrl+C` and tear down resources via `docker compose down` when finished.

## Gateway proxy topology
```
Browser ↔ Gateway (8080)
  ↳ /api/property → Property API (5100)
  ↳ /api/*        → Remote site (REMOTE_SITE_BASE)
```
The gateway issues service JWTs before forwarding each proxied call, and surfaces `/health` to report which upstream base URLs are currently active.
