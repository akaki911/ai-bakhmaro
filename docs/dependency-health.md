# პაკეტების განახლების სტატუსი

სკანირებისას 40-ზე მეტი პაკეტი გამოვლინდა მოძველებული (React 18 → 19, Vite 5 → 7, Firebase 11 → 12 და სხვა). სრული განახლების მცდელობა `npm update --workspaces` მიუწვდომელი რეზისტრის გამო შეჩერდა (`403 Forbidden` `google-gax` პაკეტზე). 

## რა გავაკეთეთ
- დავამატეთ `.env.example` და `scripts/ensureLocalSecrets.js` განახლება, რომ ყველა სერვისმა ავტომატურად მიიღოს `DATABASE_URL` და Firebase web config placeholders.
- PostgreSQL pgvector ინფრასტრუქტურა შეიქმნა Docker Compose-ით (`docker compose up postgres -d`).

## შემდეგი ნაბიჯები პაკეტებისთვის
1. დარწმუნდით, რომ npm რეზისტრებზე წვდომა ნებადართულია (შეამოწმეთ ნებისმიერი internal proxy ან npmrc პოლიტიკა). მიმდინარე შეცდომა: `403 Forbidden - GET https://registry.npmjs.org/google-gax`.
2. წვდომის აღდგენის შემდეგ გაუშვით:
   ```bash
   npm install
   npm outdated --workspaces
   npm update --workspaces
   ```
   თუ major განახლება საჭიროა (მაგ. React 19, Vite 7), რეკომენდებულია `npm install <pkg>@latest --workspace <name>` ინდივიდუალურად და smoke/lint/type-check ტესტების გაშვება ყოველ ნაბიჯზე.
3. pnpm-ის ან სხვა package manager-ის პარამეტრების შემთხვევაში გადახედეთ `.npmrc`-ს და `pnpm-lock.yaml`-ს, რათა არ არსებობდეს შეუთავსებელი კონფიგები (`http-proxy`, `node-linker` და სხვა გაფრთხილებები`).

> შენიშვნა: სრული პაკეტური განახლება ჯერ არ შესრულებულა ქსელური შეზღუდვის გამო. როგორც კი წვდომა აღდგება, ზემოთ მოცემული ნაბიჯები უნდა დასრულდეს.
