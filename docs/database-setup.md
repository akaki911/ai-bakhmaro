# PostgreSQL + pgvector ლოკალური კონფიგურაცია

ამ პროექტს სჭირდება PostgreSQL pgvector გაფართოებით. ქვემოთ აღწერილია, როგორ ჩავრთოთ იგი Docker-ის საშუალებით და როგორ დავაკონფიგურიროთ გარემო ცვლადები.

## გაშვება Docker Compose-ით

```bash
docker compose up postgres -d
```

* `docker-compose.yml` ახლიდან შეიცავს `postgres` სერვისს (`postgres:16` იმიჯი) რომელიც ავტომატურად ტვირთავს `config/postgres/init.sql` სკრიპტს pgvector-ის ჩასართავად.
* Healthcheck იყენებს `pg_isready`-ს და ამოწმებს იმავე DB-ს, რომელიც `DATABASE_URL`-ით იკვებება.

## აუცილებელი ENV ცვლადები

`.env.example` ფაილი ემსახურება საბაზისო შაბლონს. კოპირება შეგიძლიათ ასე:

```bash
cp .env.example .env
```

შემდეგ გაასწორეთ მნიშვნელობები (რეალური პაროლით და Firebase მონაცემებით):

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_HOST`, `POSTGRES_PORT`
- `DATABASE_URL` (შეიძლება დატოვოთ შაბლონური ფორმატით)
- `VITE_FIREBASE_API_KEY` და დანარჩენი `VITE_FIREBASE_*` პარამეტრები

`scripts/ensureLocalSecrets.js` ახლა ავტომატურად აგენერირებს ზემო მოცემულ პარამეტრებს ლოკალური განვითარებისას, ასე რომ `node check-secrets.js` ან ნებისმიერი dev სერვისი გაავსებს ნაგულისხმევ მნიშვნელობებსაც.

## pgvector და ტალღები

`config/postgres/init.sql` უზრუნველყოფს pgvector-ის ჩართვას და ამატებს `service_health` ცხრილს readiness-სატესტოდ. Vector memory ტაბლის შესაქმნელად გაუშვით არსებული მიგრაცია:

```bash
psql "$DATABASE_URL" -f ai-service/migrations/002_create_vector_memory.sql
```

ეს საჭიროა სანამ AI სერვისი დაიწყებს ემბედინგების შენახვას.
