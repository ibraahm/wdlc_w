# Getting Started — Pull, Install & Run (Local Development)

A step-by-step guide to get the **WDLC** platform running on your own machine.
For a codebase overview see [README.md](./README.md); for server/production
deployment see [INSTRUCTIONS.md](./INSTRUCTIONS.md).

The platform is one repo with four services:

| Service | Folder | Local URL |
|---------|--------|-----------|
| API (NestJS) | `backend/` | http://localhost:4000/api |
| Public website (Next.js) | `apps/web/` | http://localhost:3000 |
| Agent/teller portal (Next.js) | `apps/portal/` | http://localhost:3001 |
| Admin back-office (Next.js) | `apps/admin/` | http://localhost:3002 |

---

## 1. Prerequisites

Install these first:

- **Node.js 20+** and npm — check with `node -v` (must be ≥ 20).
- **PostgreSQL 14+** running locally — check with `psql --version`.
- **Git**.

> macOS: `brew install node postgresql@16 git` then `brew services start postgresql@16`.
> Ubuntu/Debian: see the prerequisites block in [INSTRUCTIONS.md](./INSTRUCTIONS.md#1-prerequisites-one-time-on-a-new-server).

---

## 2. Pull the code

Clone it (first time):

```bash
git clone https://github.com/ibraahm/wdlc_w.git
cd wdlc_w
```

Already have it? Get the latest:

```bash
cd wdlc_w
git checkout main
git pull origin main
```

---

## 3. Create the database

Create an empty PostgreSQL database and a user for it:

```bash
psql -U postgres <<'SQL'
CREATE DATABASE wdlc;
CREATE USER wdlc_user WITH ENCRYPTED PASSWORD 'devpassword';
GRANT ALL PRIVILEGES ON DATABASE wdlc TO wdlc_user;
ALTER DATABASE wdlc OWNER TO wdlc_user;
SQL
```

You'll reference these credentials in `DATABASE_URL` below. (Migrations create
all the tables — you don't create them by hand.)

---

## 4. Install dependencies

The frontend apps are an npm **workspace** (installed from the repo root); the
backend has its **own** lockfile and is installed separately:

```bash
# from the repo root
npm install                    # installs apps/web, apps/portal, apps/admin
npm install --prefix backend   # installs the API
```

---

## 5. Set up environment files

Each service reads its own env file (none are committed). Copy the examples and
fill in the blanks:

```bash
cp backend/.env.example       backend/.env
cp apps/web/.env.example      apps/web/.env.local
cp apps/portal/.env.example   apps/portal/.env.local
cp apps/admin/.env.example    apps/admin/.env.local
```

**`backend/.env`** — the essentials for local dev:

```bash
DATABASE_URL="postgresql://wdlc_user:devpassword@localhost:5432/wdlc?schema=public"
NODE_ENV="development"
PORT=4000
ADMIN_JWT_SECRET="<run: openssl rand -hex 32>"
AGENT_JWT_SECRET="<run: openssl rand -hex 32>"   # must differ from the admin secret
HUMAN_VERIFICATION_SECRET="<run: openssl rand -hex 32>"
CORS_ORIGIN="http://localhost:3000,http://localhost:3001,http://localhost:3002"
PORTAL_BASE_URL="http://localhost:3001"
ADMIN_BASE_URL="http://localhost:3002"
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="ChangeMe123!"
```

Generate a secret with: `openssl rand -hex 32`. In development, emails are
printed to the API console, so SMTP/SendGrid are optional.

**`apps/*/.env.local`** — each app needs at least:

```bash
API_URL="http://localhost:4000/api"
```

(`apps/web` also uses `NEXT_PUBLIC_API_URL` for direct browser form submits;
`apps/portal` uses `NEXT_PUBLIC_ADMIN_URL` for its "admin sign-in" link. See each
`.env.example` for the full list.)

---

## 6. Prepare the database schema

Apply migrations, generate the Prisma client, and create the first admin user:

```bash
cd backend
npx prisma migrate deploy     # creates all tables
npx prisma generate           # generates the typed client
npm run db:seed               # creates the first SUPER_ADMIN (uses SEED_ADMIN_* above)
cd ..
```

---

## 7. Run it

Open a terminal per service (each runs in the foreground), from the repo root:

```bash
npm run dev:backend    # API     → http://localhost:4000/api
npm run dev:web        # website → http://localhost:3000
npm run dev:portal     # portal  → http://localhost:3001
npm run dev:admin      # admin   → http://localhost:3002
```

You usually only need the **backend** plus whichever frontend you're working on.

Verify the API is up:

```bash
curl -s http://localhost:4000/api/health
```

Sign in to the admin at http://localhost:3002 with the `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` you set in step 5.

---

## 8. Pulling updates later

When you pull new code, re-sync dependencies and the database before running:

```bash
git checkout -- backend/package-lock.json   # discard the locally-regenerated lockfile, if any
git pull origin main

npm install                                  # refresh app deps
npm install --prefix backend                 # refresh API deps

cd backend
npx prisma migrate deploy                    # apply any new migrations
npx prisma generate                          # regenerate the client
cd ..
```

Then start the services again (step 7).

---

## 9. Common issues

| Symptom | Fix |
|---------|-----|
| `git pull` aborts on `package-lock.json` | `git checkout -- backend/package-lock.json`, then pull. It's regenerated by `npm install`. |
| API won't start, `EADDRINUSE :4000` | Another process holds the port: `lsof -i :4000` then `kill <pid>`. |
| Build/runtime errors about unknown Prisma fields | Run `npx prisma generate` in `backend/`. |
| `Can't reach database server` | Postgres isn't running or `DATABASE_URL` is wrong (check host/port/password; URL-encode special chars). |
| Login emails / setup links don't arrive | In dev they're logged to the API console — check the `npm run dev:backend` output. |
| Changes to `NEXT_PUBLIC_*` not taking effect | Restart that app — public env vars are read at build/start time. |

---

That's it — `npm install` (×2), env files, `prisma migrate deploy` + `db:seed`,
then `npm run dev:*`. For production deployment with PM2 and nginx, continue in
[INSTRUCTIONS.md](./INSTRUCTIONS.md).
