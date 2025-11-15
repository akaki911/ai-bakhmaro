# Gurulo Mail ინტეგრაცია Firebase Hosting + Functions-ზე

## არქიტექტურული ფლოუ
- **Static bundle**: build არტიფაქტი (მაგ. `ai-frontend`-ის mail UI) იპუბლიშება Firebase Hosting-ზე `/`-ში.
- **API rewrite**: `firebase.json`-ში გამოიყენეთ rewrite `"/api/mail/**"` → Cloud Functions HTTPS endpoint (Node 18+). ეს იცავს SPA-routing-ს და ამავდროულად როუტავს ყველა mail API ზარს Functions-ზე.
- **Functions layer**: Functions ეწევა Gurulo Mail backend-თან პროქსირებას/ორკესტრაციას (sync, send) და მართავს auth header-ებს/role enforcement-ს. სტრიმინგი ან დიდი პასუხები დატესტეთ Functions memory/time limit-ებზე.
- **Security headers**: Hosting-ის `headers` სექციაში ჩართეთ MIME-sniffing/`Content-Security-Policy` მინიმუმის მიხედვით; `/api/mail/**` ჰენდლდება Functions-ით, სადაც გამოიყენება rate limit + audit log.

## როლები და ავტორიზაცია
- **SUPER_ADMIN**: სრული მენეჯმენტი — SMTP/IMAP credential rotation, rewrite ცვლილებები, rollout toggle-ები, audit log access, mail-sync მაგიური ხელით retrigger.
- **End-user**: Inbox/Send UI მხოლოდ საკუთარი იდენტობით. API ჰენდლერები ასრულებს role-aware authorizer-ს Functions-ში (`/api/mail/**`).

## მინიმალური გარემოს ცვლადები
- `VITE_GURULO_API_BASE`: Gurulo Mail public API base (Frontend build time).
- `MAIL_SMTP_HOST`, `MAIL_SMTP_PORT`, `MAIL_SMTP_USER`, `MAIL_SMTP_PASS`: SMTP transport placeholder-ები (Functions runtime secrets ან env: `process.env`).
- `MAIL_IMAP_HOST`, `MAIL_IMAP_PORT`, `MAIL_IMAP_USER`, `MAIL_IMAP_PASS`: IMAP sync placeholder-ები (Functions runtime secrets ან Secret Manager).

## საჭირო backend სერვისები
- **Mail send endpoint**: `POST /mail/send` (Functions როუტით `/api/mail/send`). მოითხოვს user token-ს და role enforcement-ს.
- **Mail sync endpoint**: `POST /mail/sync` ან `GET /mail/threads` (depending on Gurulo Mail API) Functions გზით `/api/mail/**`.
- **Health/diagnostics**: `GET /mail/health` ხელმისაწვდომი მხოლოდ SUPER_ADMIN audit UI-დან.

## Path Ownership ცხრილი
| Path | Owner | აღწერა |
| --- | --- | --- |
| `/` (static bundle) | Frontend/Hosting | SPA არტიფაქტი, build და deploy Firebase Hosting-ით. |
| `/api/mail/**` rewrite | Functions | HTTPS callable/proxy for mail endpoints; role enforcement, logging. |
| Secret storage (`MAIL_*`) | SUPER_ADMIN | Credential rotation/Secret Manager bindings. |
| `firebase.json` Hosting/Functions სექცია | SUPER_ADMIN | Rewrite/headers ცვლილებები და deploy gate. |

## Rollout ნაბიჯები
1. **Prepare configs**: შეავსეთ `.env`/Secret Manager placeholders `MAIL_*` და `VITE_GURULO_API_BASE` (არ დააკომიტოთ პლეინტექსტში).
2. **Build static bundle**: `npm run build` შესაბამის frontend პაკეტში (მაგ. `ai-frontend`). დაადასტურეთ რომ relative paths მუშაობს Hosting context-ში.
3. **Validate rewrite**: `firebase emulators:start --only hosting,functions` დაატესტეთ `/api/mail/send` და SPA როუტები.
4. **Deploy staged**: `firebase deploy --only hosting,functions --project <staging>` SUPER_ADMIN-ს ტყვია ცვლილებების დასამტკიცებლად.
5. **Smoke tests**: Functions logs + test accounts: send/sync მოქცევები, role enforcement, headers.
6. **Production deploy**: SUPER_ADMIN დამტკიცების შემდეგ `firebase deploy --only hosting,functions --project <prod>`.
7. **Post-deploy audit**: გააქტიურეთ telemetry/alarm-ები (`/api/mail/**` latency/errors), რე-rotate credentials საჭიროებისამებრ.
