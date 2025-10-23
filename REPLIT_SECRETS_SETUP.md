
# GitHub Secrets Setup for Firebase & Production Deployments

Replit-სთან კავშირი აღარ გვაქვს. Production და CI secrets ინახება GitHub Repository Secrets-ში ამ მისამართზე:

👉 https://github.com/akaki911/ai-bakhmaro/settings/secrets/actions

## 1. გახსენით GitHub Secrets გვერდი
- გადადით ზემოთ მოცემულ ბმულზე (Actions secrets)
- დააჭირეთ **"New repository secret"** ღილაკს თითოეული მნიშვნელობისთვის

## 2. დაამატეთ Firebase-ის კონფიგურაციის ცვლადები
დაამატეთ თითოეული სეკრეტი ქვედა სახელებითა და მნიშვნელობებით:

```
VITE_FIREBASE_API_KEY=AIzaSyBH0-yeuoUIWOiO1ZXGDcuJ7_vP6BkugBw
VITE_FIREBASE_AUTH_DOMAIN=bakhmaro-cottages.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=bakhmaro-cottages
VITE_FIREBASE_STORAGE_BUCKET=bakhmaro-cottages.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=815060315119
VITE_FIREBASE_APP_ID=1:815060315119:web:a1f33d920bcd52e536a41a
VITE_FIREBASE_MEASUREMENT_ID=G-NT97B9E4YL
```

### 2.1 დამატებითი frontend პარამეტრები
`.env.example`-ში დამატებულია დამატებითი გასაღებები, რომლებიც მართავენ ადმინის ბუთსტრაპს, WebAuthn-სა და AI ჩატის რეჟიმებს. საჭიროებისამებრ განახლეთ ისინი GitHub Secrets-ში:

- `VITE_ADMIN_SETUP_TOKEN` — საწყისი ადმინის ავტორიზაცია (კონტექსტი: `ai-frontend/src/utils/adminToken.ts`).
- `VITE_ORIGIN` / `VITE_RP_ID` — WebAuthn passkey დომენები (`ai-frontend/src/utils/webauthn_support.ts`).
- `VITE_ENABLE_PUBLIC_CHAT` — სტუმრის ჩატის ჩართვა (`ai-frontend/src/components/AIAssistantEnhanced.tsx`).
- `VITE_ASSISTANT_MODE` — ასისტენტის საწყისი რეჟიმი (`ai-frontend/src/contexts/AssistantModeContext.tsx`).
- `VITE_GITHUB_ENABLED` — GitHub workspace-ის ტოგლი (`ai-frontend/src/lib/featureFlags.ts`).
- `VITE_BACKEND_URL` / `VITE_API_BASE` / `VITE_GATEWAY_URL` / `VITE_REMOTE_SITE_BASE` — backend/gateway მისამართები (`ai-frontend/src/lib/env.ts`).
- `AI_SERVICE_URL` — API proxy fallback მისამართი (`ai-frontend/pages/api/ai/[...path].ts`).

## 3. განაახლეთ GitHub Actions გარემო ცვლადები
- თუ უკვე გაშვებულია workflow-ები, ხელახლა გაუშვით მათი secrets განახლების შემდეგ, რომ ახალი მნიშვნელობები ჩაიტვირთოს
- საჭიროების შემთხვევაში გამოიყენეთ `node check-secrets.js` ადგილობრივად მნიშვნელობების დასადასტურებლად

## 4. ვერიფიკაცია
- Frontend build-ისას კონსოლში უნდა გამოჩნდეს: "✅ Firebase initialized successfully"
- `node scripts/github-verification.js` დაადასტურებს GitHub Token-სა და webhook secret-ს

## Troubleshooting
- დარწმუნდით, რომ ყველა ცვლადი იწყება `VITE_` პრეფიქსით (frontend-სთვის)
- `FIREBASE_SERVICE_ACCOUNT_KEY` ჩაწერეთ როგორც სრული JSON (ერთ ხაზზე ან მრავალ ხაზად)
- GitHub Secrets გვერდზე whitespace ავტომატურად იჭრება; ცარიელი მნიშვნელობის შეტანა გამოიწვევს შეცდომას
