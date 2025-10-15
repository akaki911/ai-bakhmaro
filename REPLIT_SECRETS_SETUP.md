
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
