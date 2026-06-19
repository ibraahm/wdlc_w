# World Direct Link - WDLC Platform

Full-stack monorepo for the **World Direct Link, Corp.** money-transmitter platform: a
NestJS API, a public marketing website, a secure agent/teller portal (with a corporate
training LMS), and an admin back-office for compliance and operations.

> New here? Start with **[SETUP.md](./SETUP.md)** to pull, install, and run it locally.
> Operations & deployment runbook: see **[INSTRUCTIONS.md](./INSTRUCTIONS.md)**.

---

## Repository structure

```
wdlc/
├── backend/              NestJS API - auth, CMS, agents/DD, training/LMS, audit
│   └── prisma/           schema.prisma + migrations
├── apps/
│   ├── web/              Public website        (Next.js 14, port 3000)
│   ├── portal/           Agent/teller portal   (Next.js 14, port 3001)
│   └── admin/            Admin back-office      (Next.js 14, port 3002)
├── ecosystem.config.js   PM2 process definitions (all 4 services)
└── package.json          npm workspace root (apps/*; backend has its own lockfile)
```

---

## Stack

| Layer | Technology |
|-------|-----------|
| API | NestJS 10, Prisma ORM, **PostgreSQL** |
| Auth | JWT (separate admin/agent secrets), rotating refresh tokens, httpOnly cookies, bcrypt 12 rounds; optional **Google sign-in** for the portal |
| Email | SMTP (preferred) with SendGrid fallback; logs to console in dev |
| Frontend | Next.js 14 App Router, TypeScript, Tailwind (admin) + scoped CSS (portal/web) |
| Docs/PDF | `pdfkit` (agent application PDFs, training certificates) |
| Content safety | `sanitize-html` allowlist on all admin-authored HTML |
| Rate limiting | `@nestjs/throttler` - 100 req/60 s global, tighter on auth routes |
| Security | strict CSP (web), ValidationPipe whitelist, account lockout, server-signed math challenge |
| Process mgr | PM2 (`wdlc-api`, `wdlc-web`, `wdlc-portal`, `wdlc-admin`) |

---

## What's in the platform

- **Public website** - CMS-driven pages/blocks, news & press, partner & country network map,
  licenses & state consumer-disclosures, and the public "Become an Agent" / teller applications.
- **Agent lifecycle** - public application → compliance Due-Diligence file → 6-char branch code →
  auto-provisioned portal login (PRINCIPAL/TELLER) via a one-time emailed setup link.
- **Agent/teller portal** - account + security settings, and a **corporate training LMS**:
  - Udemy-style courses: sections → lessons (embedded YouTube/Vimeo/Loom video + text)
  - Per-lesson progress with resume, final quiz, **PDF completion certificate**
  - **Multi-language** course variants with a language switcher
  - Assignment **deadlines** with overdue flags
- **Admin back-office** - CMS, navigation, agent applications & DD, active branches & portal users,
  teller applications, website submission inbox, and **Training management**: course/quiz builder,
  curriculum (sections/lessons), resources, categories, and score-tracking reports
  (all / by state / by agent, CSV export).

---

## Quick start (local development)

```bash
# 1. Backend
cd backend
cp .env.example .env                # fill in DATABASE_URL + secrets
npm install
npx prisma migrate deploy           # apply migrations
npx prisma generate
npm run db:seed                     # creates the first SUPER_ADMIN
npm run start:dev                   # http://localhost:4000/api

# 2. Frontend apps (each reads API_URL from its own .env.local)
cd ..
npm install
npm run dev:web      # http://localhost:3000
npm run dev:portal   # http://localhost:3001
npm run dev:admin    # http://localhost:3002
```

Each app's `.env.local` needs at least:

```
API_URL="http://localhost:4000/api"
```

See `apps/*/.env.example` and `backend/.env.example` for the full list.

---

## Auth architecture

Two independent auth systems share the API, distinguished by a `portal` claim in the JWT and by
**separate signing secrets** (`ADMIN_JWT_SECRET`, `AGENT_JWT_SECRET`).

- **Admin** (`portal: 'admin'`) - roles `SUPER_ADMIN`, `COMPLIANCE_OFFICER`, `MANAGER`, `EDITOR`.
  Login only; admins are created by a SUPER_ADMIN. Cookies `aat` / `art`.
- **Agent** (`portal: 'agent'`) - **no self-signup**; accounts are issued when an application is
  approved. Email verification, password reset, login history. Cookies `pat` / `prt`.
  Optional **Google sign-in** authenticates an existing approved account by verified email.

Token security: refresh tokens are SHA-256 hashed at rest and rotate on every use (reuse revokes
all sessions); 5 failed logins → 15-minute lockout; Next.js middleware silently refreshes the
access token. Cookies are `secure` only when `NODE_ENV=production` - deploy behind HTTPS.

---

## API surface (prefix: `/api`)

| Area | Base route |
|------|-----------|
| Health | `GET /api/health` |
| Public CMS | `/api/cms/pages`, `/api/cms/nav`, `/api/cms/settings`, `/api/cms/news`, `/api/cms/network`, `/api/cms/partners` |
| Public forms | `/api/cms/forms`, `/api/agents` (applications), `/api/agents/tellers/apply` |
| Agent auth | `/api/portal/auth/*` (login, refresh, google, verify-email, forgot/reset, change-password) |
| Agent training | `/api/portal/training/*` (courses, lessons, quiz submit, certificate, resources) |
| Admin auth | `/api/admin/auth/*` |
| Admin ops | `/api/admin/agent-applications`, `/api/admin/agent-dd`, `/api/admin/agents`, `/api/admin/teller-applications`, `/api/admin/audit` |
| Admin training | `/api/admin/training/*` (courses, sections, lessons, resources, completions, report) |

Exact handlers live in the controllers under `backend/src/**`.

---

## Database & migrations

PostgreSQL, via Prisma. Migrations are **append-only** and idempotent (`IF NOT EXISTS`).

```bash
cd backend
npx prisma migrate deploy            # apply pending migrations (prod-safe)
npx prisma generate                  # regenerate the client after schema changes
# during development, to author a new migration:
npx prisma migrate dev --name describe_your_change
```

> Always run `npx prisma generate` before building the backend after a schema change.

---

## Production / operations

Deployment, environment variables, PM2, nginx, updates, backups, and troubleshooting are
documented in **[INSTRUCTIONS.md](./INSTRUCTIONS.md)**. The short version:

```bash
git pull origin main
npm install --prefix backend && npm install
cd backend && npx prisma migrate deploy && npx prisma generate && cd ..
npm run build --prefix backend
npm run build --workspace apps/web
npm run build --workspace apps/portal
npm run build --workspace apps/admin
pm2 restart ecosystem.config.js && pm2 save
```
