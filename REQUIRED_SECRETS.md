
# გამოყენებული Secrets-ები

აუცილებელი სეკრეტები ინახება **GitHub Repository Secrets**-ში (`https://github.com/akaki911/ai-bakhmaro/settings/secrets/actions`).

> ℹ️ **ლოკალური განვითარებისთვის:** `scripts/ensureLocalSecrets.js` ავტომატურად გენერირებს საჭირო dev-secret-ებს და ინახავს მათ `config/local-secrets.json` ფაილში (gitignored).  ეს მნიშვნელობები იტვირთება Backend-სა და AI Service-ში გაშვებისას, ამიტომ GitHub Secrets-ის მითითება მხოლოდ production/CI გარემოსთვისაა აუცილებელი.

## AI Service
```
AI_INTERNAL_TOKEN=your_jwt_secret_256_bit_minimum
GROQ_API_KEY=your_groq_api_key
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
FIREBASE_PROJECT_ID=your_firebase_project_id
ALLOWED_BACKEND_IPS=127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
```

| Secret | სად გამოიყენება | რეფერენსი |
| --- | --- | --- |
| `AI_INTERNAL_TOKEN` | Backend-სა და AI Service-ს შორის აუთენტიკაცია. | [`shared/config/envValidator.js`](shared/config/envValidator.js) 【F:shared/config/envValidator.js†L8-L68】, [`ai-service/config/runtimeConfig.js`](ai-service/config/runtimeConfig.js) 【F:ai-service/config/runtimeConfig.js†L131-L213】 |
| `GROQ_API_KEY` | Groq მოდელებთან დასაკავშირებლად AI Service-ში. | [`ai-service/config/runtimeConfig.js`](ai-service/config/runtimeConfig.js) 【F:ai-service/config/runtimeConfig.js†L131-L213】, [`ai-service/services/groq_service.js`](ai-service/services/groq_service.js) 【F:ai-service/services/groq_service.js†L1-L23】 |
| `FIREBASE_SERVICE_ACCOUNT_KEY`, `FIREBASE_PROJECT_ID` | Firebase Admin SDK-ის ინიციალიზაცია. | [`shared/secretResolver.js`](shared/secretResolver.js) 【F:shared/secretResolver.js†L223-L240】 |
| `ALLOWED_BACKEND_IPS` | Backend-ის IP-ების allowlist AI Service-ზე. | [`backend/services/secretsRequiredService.js`](backend/services/secretsRequiredService.js) 【F:backend/services/secretsRequiredService.js†L38-L40】 |

## Backend
```
AI_INTERNAL_TOKEN=same_jwt_secret_as_ai_service
SESSION_SECRET=your_session_secret_256_bit
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
FIREBASE_PROJECT_ID=your_firebase_project_id
AI_SERVICE_URL=http://127.0.0.1:5001
SECRETS_ENC_KEY=32_byte_base64_encryption_key (e.g. configure with the shared production value)
ADMIN_SETUP_TOKEN=your_admin_setup_token
```

| Secret | სად გამოიყენება | რეფერენსი |
| --- | --- | --- |
| `AI_INTERNAL_TOKEN` | Backend-სა და AI Service-ს შორის ავტორიზაცია. | [`backend/services/secretsRequiredService.js`](backend/services/secretsRequiredService.js) 【F:backend/services/secretsRequiredService.js†L34-L38】, [`shared/config/envValidator.js`](shared/config/envValidator.js) 【F:shared/config/envValidator.js†L8-L68】 |
| `SESSION_SECRET` | სესიის cookie-ს ხელმოწერა. | [`backend/services/secretsRequiredService.js`](backend/services/secretsRequiredService.js) 【F:backend/services/secretsRequiredService.js†L35-L37】, [`shared/config/envValidator.js`](shared/config/envValidator.js) 【F:shared/config/envValidator.js†L40-L71】 |
| `FIREBASE_SERVICE_ACCOUNT_KEY`, `FIREBASE_PROJECT_ID` | Firebase Admin SDK backend-ში. | [`backend/services/secretsRequiredService.js`](backend/services/secretsRequiredService.js) 【F:backend/services/secretsRequiredService.js†L19-L21】, [`shared/secretResolver.js`](shared/secretResolver.js) 【F:shared/secretResolver.js†L223-L240】 |
| `AI_SERVICE_URL` | Backend → AI Service HTTP კავშირი. | [`backend/services/secretsRequiredService.js`](backend/services/secretsRequiredService.js) 【F:backend/services/secretsRequiredService.js†L36-L37】 |
| `SECRETS_ENC_KEY` | Secrets Vault-ის დაშიფვრა/გაშიფვრის გასაღები. | [`scripts/setupSecretsVault.js`](scripts/setupSecretsVault.js) 【F:scripts/setupSecretsVault.js†L60-L76】, [`backend/services/secretsVault.js`](backend/services/secretsVault.js) 【F:backend/services/secretsVault.js†L56-L83】 |
| `ADMIN_SETUP_TOKEN` | ადმინის საწყისი კონფიგურაციისთვის. | [`backend/services/secretsRequiredService.js`](backend/services/secretsRequiredService.js) 【F:backend/services/secretsRequiredService.js†L34-L38】, [`shared/config/envValidator.js`](shared/config/envValidator.js) 【F:shared/config/envValidator.js†L32-L71】 |

## Frontend
```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_ADMIN_SETUP_TOKEN=bootstrap_admin_token
VITE_ORIGIN=https://ai.bakhmaro.co
VITE_RP_ID=ai.bakhmaro.co
VITE_ENABLE_PUBLIC_CHAT=false
VITE_ASSISTANT_MODE=admin
VITE_GITHUB_ENABLED=0
VITE_BACKEND_URL=https://backend.ai.bakhmaro.co
VITE_API_BASE=/api
VITE_GATEWAY_URL=https://ai.bakhmaro.co
VITE_REMOTE_SITE_BASE=https://bakhmaro.co
AI_SERVICE_URL=https://api.ai.bakhmaro.co
```

| Secret | სად გამოიყენება | რეფერენსი |
| --- | --- | --- |
| ყველა `VITE_FIREBASE_*` ცვლადი | Frontend build-ისას Firebase client config-ს ავსებს. | [`src/firebase.ts`](src/firebase.ts) 【F:src/firebase.ts†L13-L117】 |
| `VITE_ADMIN_SETUP_TOKEN` | ადმინის საწყისი კონფიგურაციისთვის SPA-ში. | [`ai-frontend/src/utils/adminToken.ts`](ai-frontend/src/utils/adminToken.ts) 【F:ai-frontend/src/utils/adminToken.ts†L1-L60】 |
| `VITE_ORIGIN`, `VITE_RP_ID` | WebAuthn passkey origin/რელაიინგ-პარტის პარამეტრები. | [`ai-frontend/src/utils/webauthn_support.ts`](ai-frontend/src/utils/webauthn_support.ts) 【F:ai-frontend/src/utils/webauthn_support.ts†L182-L214】 |
| `VITE_ENABLE_PUBLIC_CHAT` | გესტ ჩატის დაშვება აუთენტიფიცირებელი მომხმარებლებისთვის. | [`ai-frontend/src/components/AIAssistantEnhanced.tsx`](ai-frontend/src/components/AIAssistantEnhanced.tsx) 【F:ai-frontend/src/components/AIAssistantEnhanced.tsx†L698-L715】 |
| `VITE_ASSISTANT_MODE` | ასისტენტის საწყისი რეჟიმი (plan/build/admin). | [`ai-frontend/src/contexts/AssistantModeContext.tsx`](ai-frontend/src/contexts/AssistantModeContext.tsx) 【F:ai-frontend/src/contexts/AssistantModeContext.tsx†L108-L133】 |
| `VITE_GITHUB_ENABLED` | GitHub workspace-ის ჩართვა/გამორთვა. | [`ai-frontend/src/lib/featureFlags.ts`](ai-frontend/src/lib/featureFlags.ts) 【F:ai-frontend/src/lib/featureFlags.ts†L28-L48】 |
| `VITE_BACKEND_URL`, `VITE_API_BASE`, `VITE_GATEWAY_URL`, `VITE_REMOTE_SITE_BASE` | Backend discovery fallbacks SPA-ში. | [`ai-frontend/src/lib/env.ts`](ai-frontend/src/lib/env.ts) 【F:ai-frontend/src/lib/env.ts†L46-L97】 |
| `AI_SERVICE_URL` | API proxy/ტესტები → AI Service საბოლოო მისამართი. | [`ai-frontend/pages/api/ai/[...path].ts`](ai-frontend/pages/api/ai/[...path].ts) 【F:ai-frontend/pages/api/ai/[...path].ts†L1-L63】 |

## Production Security ❗
- `AI_INTERNAL_TOKEN`: 256-bit რანდომული სტრინგი (ორივე სერვისში ერთნაირი)
- `SESSION_SECRET`: 256-bit რანდომული სტრინგი
- TLS/HTTPS: GitHub Actions-ით განხორციელებული დიპლოისას Firebase Hosting უზრუნველყოფს HTTPS-ს
- CORS: Production domains მხოლოდ
- Cookies: `secure: true`, `sameSite: 'none'` production-ზე

## IP Allowlist
Backend-ისთვის AI Service-ზე:
- `127.0.0.1` (localhost)
- `10.0.0.0/8` (private network)
- `172.16.0.0/12` (docker networks)
- `192.168.0.0/16` (local networks)

## GitHub Secrets / Repository ავტომაცია
Production გარემოში GitHub ინტეგრაციისთვის აუცილებელია ქვედა ცვლადები GitHub Actions-ისა და Environments-ის Secret-ებში:

```
GITHUB_TOKEN=personal_access_token_with_repo_scope
GITHUB_REPO_OWNER=github_username_or_org
GITHUB_REPO_NAME=target_repository_name
GITHUB_WEBHOOK_SECRET=shared_secret_for_webhook_validation
GITHUB_API_URL=https://api.github.com (optional override)
GITHUB_OWNER=legacy_owner_fallback (optional)
GITHUB_REPO=legacy_repo_fallback (optional)
```

| Secret | სად გამოიყენება | რეფერენსი |
| --- | --- | --- |
| `GITHUB_TOKEN` | GitHub API-ზე ყველა მოთხოვნის ავტორიზაცია backend და AI Service-ში. | [`backend/services/githubIntegration.js`](backend/services/githubIntegration.js) 【F:backend/services/githubIntegration.js†L101-L109】, [`ai-service/services/repository_automation_service.js`](ai-service/services/repository_automation_service.js) 【F:ai-service/services/repository_automation_service.js†L12-L102】 |
| `GITHUB_REPO_OWNER` / `GITHUB_REPO_NAME` | სამიზნე რეპოზიტორიის იდენტიფიკაცია. | [`backend/services/githubIntegration.js`](backend/services/githubIntegration.js) 【F:backend/services/githubIntegration.js†L43-L75】, [`ai-service/services/repository_automation_service.js`](ai-service/services/repository_automation_service.js) 【F:ai-service/services/repository_automation_service.js†L12-L186】 |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhook-ის ხელმოწერის ვალიდაცია. | [`ai-service/routes/repository_automation.js`](ai-service/routes/repository_automation.js) 【F:ai-service/routes/repository_automation.js†L100-L118】 |
| `GITHUB_API_URL` (optional) | Enterprise GitHub instance-ის მისამართი. | [`check-github-env.js`](check-github-env.js) 【F:check-github-env.js†L19-L101】 |
| `GITHUB_OWNER` / `GITHUB_REPO` (legacy) | ძველი სკრიპტებისა და fallback ლოგიკისთვის. | [`scripts/github-verification.js`](scripts/github-verification.js) 【F:scripts/github-verification.js†L116-L170】 |

ℹ️ **შენიშვნა:** `SECRET_KEY_BASE` და `GCP_SLACK_TOKEN` ამ რეპოზიტორიის აქტიურ კოდში არ გამოიყენება; თუ GitHub Secrets-ში რჩება, გადაამოწმეთ მათი საჭიროება redundant სეკრეტების თავიდან ასაცილებლად.【F:backend/services/secretsRequiredService.js†L12-L50】【313811†L1-L1】【ce6f0e†L1-L1】

## სად უნდა განახლდეს იგივე მნიშვნელობები
- **GitHub Secrets / Actions გარემო ცვლადები:** `node check-secrets.js` ამოწმებს Frontend/Backend/AI Service-სთვის აუცილებელ env-ს და მიუთითებს აკლულ მნიშვნელობებს.【F:check-secrets.js†L8-L101】
- **GitHub Actions / Environments:** `node scripts/github-verification.js` ამოწმებს `GITHUB_TOKEN`, owner/repo/key სეტის სტატუსს და GitHub API კავშირის შესაძლებლობას.【F:scripts/github-verification.js†L44-L170】
- **Firebase client config:** `src/firebase.ts` ამჟამად შეიცავს production კონფიგურაციას; Firebase პარამეტრების ცვლილებისას სეკრეტების განახლება უნდა მოხდეს ერთდროულად Secrets-ში და ამ ფაილში, რათა Frontend build-მა დაინახოს სწორი მნიშვნელობები.【F:src/firebase.ts†L13-L117】

## როგორ გადავამოწმოთ კონფიგურაცია
1. **Secrets health-check:**
   ```bash
   node check-secrets.js
   ```
   გამოდის სრული რეპორტი დაკლებული ან არასწორი მნიშვნელობების შესახებ.【F:check-secrets.js†L8-L101】

2. **GitHub ინტეგრაციის ტესტი:**
   ```bash
   node scripts/github-verification.js
   ```
   ამოწმებს env ცვლადებს, ტოკენის სქოუპს და GitHub API კავშირს.【F:scripts/github-verification.js†L44-L200】

3. **AI Service runtime-მონიტორინგი:** Production გარემოში `ai-service/config/runtimeConfig.js` გამოყოფს `fatal` შეტყობინებებს, თუ `AI_INTERNAL_TOKEN` ან `GROQ_API_KEY` არასწორია.【F:ai-service/config/runtimeConfig.js†L131-L213】
