# World Direct Link — WDLC Platform

Full-stack monorepo for the World Direct Link, Corp. corporate platform. Includes a headless CMS backend, a public marketing website, a secure agent compliance portal, and an admin back-office.

---

## Repository structure

```
wdlc_w/
├── backend/          NestJS API — auth, CMS, audit log
├── apps/
│   ├── web/          Public website (Next.js 14, port 3000)
│   ├── portal/       Agent compliance portal (Next.js 14, port 3001)
│   └── admin/        Admin back-office (Next.js 14, port 3002)
└── package.json      npm workspace root
```

---

## Stack

| Layer | Technology |
|-------|-----------|
| API | NestJS 10, Prisma ORM, SQLite (swap to PostgreSQL by changing one line) |
| Auth | JWT (rotating refresh tokens, httpOnly cookies), bcrypt 12 rounds |
| Email | SendGrid — falls back to console.log in development |
| Frontend | Next.js 14 App Router, Tailwind CSS, TypeScript |
| Rate limiting | `@nestjs/throttler` — 100 req/60 s global, tighter per-route on auth |
| Security | Helmet headers, ValidationPipe whitelist, account lockout after 5 failures |

---

## Quick start

### 1. Backend

```bash
cd backend
cp .env.example .env          # fill in secrets (see Environment below)
npm install
npm run prisma:deploy         # apply migrations
npm run db:seed               # creates the first SUPER_ADMIN
npm run start:dev             # http://localhost:4000
```

### 2. Frontend apps

Each app reads `API_URL` from its own `.env.local`. Create the file in each app directory:

```
API_URL=http://localhost:4000
```

Then run any or all three:

```bash
# Public website
npm --workspace=apps/web run dev        # http://localhost:3000

# Agent portal
npm --workspace=apps/portal run dev     # http://localhost:3001

# Admin back-office
npm --workspace=apps/admin run dev      # http://localhost:3002
```

Or from the root, all at once (requires a process manager like `concurrently`):

```bash
npm run dev:web & npm run dev:portal & npm run dev:admin
```

---

## Environment variables

### `backend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | `file:./dev.db` for SQLite, or a PostgreSQL connection string |
| `JWT_SECRET` | Yes | Shared JWT fallback secret — generate with `openssl rand -hex 32` |
| `ADMIN_JWT_SECRET` | No | Override JWT secret for admin tokens |
| `AGENT_JWT_SECRET` | No | Override JWT secret for agent tokens |
| `JWT_EXPIRES_IN` | No | Access token lifetime, default `15m` |
| `PORT` | No | API port, default `4000` |
| `CORS_ORIGIN` | Yes | Allowed CORS origin(s), e.g. `http://localhost:3000` |
| `PORTAL_BASE_URL` | Yes | Used in email verification links, e.g. `http://localhost:3001` |
| `ADMIN_BASE_URL` | Yes | Used in password reset links, e.g. `http://localhost:3002` |
| `SEED_ADMIN_EMAIL` | Yes | Email for the initial SUPER_ADMIN account |
| `SEED_ADMIN_PASSWORD` | Yes | Password for the initial SUPER_ADMIN account |
| `NODE_ENV` | No | Set to `production` to enable real email sending |
| `SENDGRID_API_KEY` | No | SendGrid API key — omit to log emails to console |
| `SENDGRID_FROM_EMAIL` | No | From address, default `info@worlddirectlink.com` |

### `apps/*/env.local`

| Variable | Description |
|----------|-------------|
| `API_URL` | Backend base URL, default `http://localhost:4000` |

---

## Auth architecture

Two completely separate auth systems share the same API, distinguished by a `portal` claim inside the JWT.

### Admin portal (`portal: 'admin'`)

- Roles: `SUPER_ADMIN`, `COMPLIANCE_OFFICER`, `MANAGER`, `EDITOR`
- Login only (no self-signup — admins are created by a SUPER_ADMIN)
- Password reset via email
- Tokens: `aat` (access, 15 min) + `art` (refresh, 7 days) in httpOnly cookies

### Agent portal (`portal: 'agent'`)

- Self-signup with email verification required before first login
- Password reset via email, login history tracked per session
- Tokens: `pat` (access, 15 min) + `prt` (refresh, 7 days) in httpOnly cookies
- Account statuses: `PENDING` → `ACTIVE` → `SUSPENDED`

### Token security

- Refresh tokens are SHA-256 hashed before storage — raw token never persisted
- Token rotation on every refresh — reuse of a consumed token revokes all sessions for that account
- Account lockout: 5 consecutive failed logins → 15-minute lockout
- Each Next.js middleware silently refreshes the access token when it expires (no re-login required)

---

## CMS

Managed through the admin back-office at `http://localhost:3002`.

### Pages

Pages have a `slug` (URL path), metadata fields, and a `blocks` array. The public site renders any published page at `/{slug}`.

Available block types:

| Type | Fields |
|------|--------|
| `hero` | `heading`, `subheading`, `ctaText`, `ctaHref` |
| `text` | `content` (HTML) |
| `features` | `items[]` with `icon`, `title`, `body` |
| `cta` | `heading`, `buttonText`, `href` |

The homepage is the page with slug `home`.

### Navigation

Nav items are organized into locations (`HEADER`, `FOOTER`) and support parent–child nesting. Order is adjustable in the admin.

### Site settings

Key–value store for global config. Common keys:

| Key | Example value |
|-----|--------------|
| `siteName` | `World Direct Link` |
| `tagline` | `Trusted global remittance` |
| `contactEmail` | `info@worlddirectlink.com` |

---

## Database

SQLite is used out of the box — no installation required. To switch to PostgreSQL, change two lines in `backend/prisma/schema.prisma`:

```diff
 datasource db {
-  provider = "sqlite"
-  url      = env("DATABASE_URL")
+  provider = "postgresql"
+  url      = env("DATABASE_URL")
 }
```

Then update `DATABASE_URL` in `.env` and run `npm run prisma:deploy`.

### Migrations

```bash
# Apply all pending migrations (CI / production)
npm --workspace=backend run prisma:deploy

# Create a new migration during development
cd backend && npx prisma migrate dev --name describe_your_change
```

---

## API overview

All endpoints are prefixed with the backend base URL (`http://localhost:4000`).

### Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/cms/pages/published` | List all published pages |
| `GET` | `/cms/pages/published/:slug` | Get a single published page |
| `GET` | `/cms/nav` | Nav tree (pass `?location=HEADER`) |
| `GET` | `/cms/settings` | All site settings |

### Agent auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/portal-auth/signup` | Register a new agent |
| `POST` | `/portal-auth/verify-email` | Verify email with token |
| `POST` | `/portal-auth/resend-verification` | Resend verification email |
| `POST` | `/portal-auth/login` | Login → access + refresh tokens |
| `POST` | `/portal-auth/refresh` | Rotate refresh token |
| `POST` | `/portal-auth/logout` | Revoke session |
| `POST` | `/portal-auth/forgot-password` | Send reset email |
| `POST` | `/portal-auth/reset-password` | Set new password with token |
| `POST` | `/portal-auth/change-password` | Change password (authenticated) |
| `GET` | `/portal-auth/login-history` | Login history for current agent |

### Admin auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/admin-auth/login` | Login |
| `POST` | `/admin-auth/refresh` | Rotate refresh token |
| `POST` | `/admin-auth/logout` | Revoke session |
| `POST` | `/admin-auth/forgot-password` | Send reset email |
| `POST` | `/admin-auth/reset-password` | Set new password |
| `POST` | `/admin-auth/change-password` | Change password |
| `GET` | `/admin-auth/users` | List admin users (authenticated) |
| `POST` | `/admin-auth/users` | Create admin user (SUPER_ADMIN) |
| `PATCH` | `/admin-auth/users/:id/active` | Activate / deactivate user (SUPER_ADMIN) |

### CMS (admin auth required)

| Method | Path | Description |
|--------|------|-------------|
| `GET/POST` | `/cms/pages` | List all pages / create page |
| `GET/PATCH/DELETE` | `/cms/pages/:slug` | Get / update / delete page |
| `PATCH` | `/cms/pages/:slug/publish` | Publish page |
| `PATCH` | `/cms/pages/:slug/unpublish` | Unpublish page |
| `GET/POST` | `/cms/nav` | Nav tree / create item |
| `PATCH` | `/cms/nav/reorder` | Bulk reorder |
| `PATCH/DELETE` | `/cms/nav/:id` | Update / delete nav item |
| `GET` | `/cms/settings` | All settings |
| `PUT/DELETE` | `/cms/settings/:key` | Upsert / delete setting |

---

## Production checklist

- [ ] Generate strong secrets: `openssl rand -hex 32` for each JWT secret
- [ ] Switch `DATABASE_URL` to a PostgreSQL connection string
- [ ] Set `NODE_ENV=production` and add `SENDGRID_API_KEY`
- [ ] Set `CORS_ORIGIN` to the production domain(s)
- [ ] Set `PORTAL_BASE_URL` and `ADMIN_BASE_URL` to production URLs
- [ ] Run `npm run db:seed` once to create the initial SUPER_ADMIN, then change the password immediately
- [ ] Deploy behind HTTPS (the httpOnly cookies require a secure context in production)
- [ ] Set `secure: true` on cookies in `apps/portal/src/lib/auth.ts` and `apps/admin/src/lib/auth.ts`

