# Production Deployment Checklist for ai.bakhmaro.co

This checklist captures the required steps to replace the legacy static site with the AI gateway stack in production. Complete the steps in order and confirm each item before moving to the next one.

## 1. Update the server stack
1. SSH into the production server that terminates the `ai.bakhmaro.co` DNS entry.
2. Pull the latest code and provision the environment file:
   ```bash
   git pull
   cp .env.example .env
   ```
3. Populate `.env` with production values:
   ```bash
   AI_DOMAIN=https://ai.bakhmaro.co
   ROOT_DOMAIN=bakhmaro.co
   REMOTE_SITE_BASE=https://8a86230f-...riker.replit.dev  # Temporary until bakhmaro.co backend is live
   JWT_SECRET=<generate-a-strong-secret>
   ```
   Review the advanced AI governance switches and set them intentionally for production operations:
   ```bash
   # Comma-separated IDs that may access AI admin tooling.
   AI_AUTHORIZED_PERSONAL_IDS=01019062020,01019062030
   # Control panel service token (rotate with other admin secrets).
   AI_PANEL_TOKEN=<unique_32+_char_token>
   # Shared key for internal smoke tests hitting privileged routes.
   TEST_SERVICE_KEY=<unique_test_service_key>
   # Staging/alternate UI hostname used during blue/green or DR workflows.
   ALT_FRONTEND_URL=https://staging.ai.bakhmaro.co
   # Toggle guest chat access (true/false); keep `false` unless policy allows anonymous sessions.
   ALLOW_ANONYMOUS_AI_CHAT=false
   # AI proxy streaming strategy (chunked|buffered); `chunked` keeps live token streaming enabled.
   AI_PROXY_STREAMING_MODE=chunked
   # Global smart-routing toggle for complex prompts (true/false).
   AI_SMART_ROUTING=true
   # File patterns treated as complex and routed through guarded flows.
   AI_SMART_ROUTING_COMPLEX_FILES=**/*.sql,**/*.ipynb,docs/architecture/*.md
   # Risk labels that require elevated review or HITL workflows.
   AI_SMART_ROUTING_COMPLEX_RISK_LEVELS=high,critical
   # Require human sign-off before executing elevated actions (true/false).
   AI_HITL_APPROVALS=true
   # Persist structured feedback for ongoing AI quality reviews (true/false).
   AI_FEEDBACK_LOOP=true
   # Assistant operating mode (hybrid|autonomous|manual); production defaults to `hybrid` for guardrails.
   ASSISTANT_MODE=hybrid
   # CI authentication token for `/admin/secrets/check` automation.
   CI_SECRETS_CHECK_TOKEN=<rotate_ci_token>
   # Persist metadata from AI sessions to analytics stores (true/false).
   ENABLE_METADATA=true
   # Route rollout cohorts through the proxy experiment layer (true/false).
   ENABLE_AI_ROLLOUT_PROXY=false
   ```
4. Build and launch the Compose stack:
   ```bash
   docker compose up --build -d
   docker compose ps
   ```
5. Confirm the gateway is healthy on the host:
   ```bash
   curl -I http://127.0.0.1:8080/health
   ```
   Expected response: `HTTP/1.1 200 OK`.

## 2. Point the web server at the gateway
1. Update the `ai.bakhmaro.co` virtual host to proxy traffic to the gateway container (port `8080`). Example Nginx configuration:
   ```nginx
   server {
     listen 80;
     server_name ai.bakhmaro.co;
     return 301 https://$host$request_uri;
   }

   server {
     listen 443 ssl http2;
     server_name ai.bakhmaro.co;

     # ssl_certificate /etc/letsencrypt/live/ai.bakhmaro.co/fullchain.pem;
     # ssl_certificate_key /etc/letsencrypt/live/ai.bakhmaro.co/privkey.pem;

     location / {
       proxy_pass         http://127.0.0.1:8080;
       proxy_set_header   Host $host;
       proxy_set_header   X-Forwarded-Proto $scheme;
       proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
     }
   }
   ```
2. Reload Nginx after testing the configuration:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```
3. If the domain is still mapped to a legacy host (Netlify, Vercel, etc.), update DNS so that `ai.bakhmaro.co` resolves to this server. Otherwise the old static site will remain visible.

## 3. Optional root domain redirect
Set up a permanent redirect from `bakhmaro.co` (and `www.bakhmaro.co`) to `https://ai.bakhmaro.co` for consistent entry points and SEO:
```nginx
server {
  listen 80;
  server_name bakhmaro.co www.bakhmaro.co;
  return 301 https://ai.bakhmaro.co$request_uri;
}
```

## 4. Cookie and authentication domains
Ensure the production `.env` keeps:
```env
AI_DOMAIN=https://ai.bakhmaro.co
ROOT_DOMAIN=bakhmaro.co
```
This configuration instructs the gateway to scope cookies to `.bakhmaro.co`, enabling cross-subdomain authentication.

## 5. Clear caches
1. Purge CDN caches (e.g., Cloudflare "Purge Everything").
2. Hard-refresh the browser (`Ctrl+F5`) or test in an incognito window.

## 6. Post-deployment validation
Run the following diagnostics from both an external client and the server itself:
```bash
# External checks
curl -I https://ai.bakhmaro.co/
curl -I https://ai.bakhmaro.co/health

# On the server
curl -I http://127.0.0.1:8080/
```
You should see 302 redirects from `/` to `/login`, 200 health checks, and responses from the new AI gateway instead of the legacy static site.

Once these checks pass, the production deployment is complete.
