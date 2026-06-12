# WDLC Server Deployment Guide

## TL;DR — two ways to install

**Option A — from the browser (easiest):**

```bash
node deploy/install-server.js          # then open the printed link
```

It serves a one-page form at `/installation` (protected by a one-time key
printed in the terminal). Fill in your domain, database, and admin account;
it streams the whole install live in the browser, and on success it starts
the apps with pm2 (if installed), **deletes the installer and setup scripts**,
and frees the port for the real website. It refuses to ever run twice
(`deploy/.installed` marker), so the `/installation` URL is gone for good.
A later `git pull` may restore the deleted script files — harmless, the
marker still blocks re-runs.

**Option B — in the terminal:**

```bash
deploy/setup.sh
```

It prompts for your domain and `DATABASE_URL` where input is needed, then
generates all env files (with strong auto-generated secrets), installs
dependencies, runs migrations + optional seed, builds all four services for
production, and smoke-tests the backend against the database. At the end it
prints the pm2/nginx steps that remain. The rest of this guide is the detailed
reference behind it.

---

This guide gets the four services talking to each other on a server. It exists
because the apps ship with **no committed `.env` files** (they're gitignored),
so a fresh clone falls back to `http://localhost:4000` everywhere — which is why
the web/portal/admin "fetch failed" after you cloned to the server.

## The architecture (why it breaks on a remote server)

| Service | Port | How it reaches the backend |
|---|---|---|
| Backend (NestJS) | 4000 | — (it *is* the API, prefix `/api`) |
| Public web (Next) | 3000 | **server-side** via `API_URL` **and browser-side** via `NEXT_PUBLIC_API_URL` |
| Agent portal (Next) | 3001 | server-side only (server actions + middleware) via `API_URL` |
| Admin/CMS (Next) | 3002 | server-side via `API_URL` (one client-side exception, see below) |

Two things must be true on a server that aren't true by default:

1. **`NEXT_PUBLIC_API_URL` must be a URL the visitor's browser can reach.** It's
   baked into the browser bundle at build time. Left as `localhost:4000`, every
   visitor's browser tries to call *their own* machine → fetch fails. This is the
   main cause of the public web app failing.
2. **`CORS_ORIGIN` on the backend must list your real frontend origins**, or the
   browser blocks the cross-origin API calls.

Server-to-server calls (portal/admin/web SSR via `API_URL`) keep using the
**internal** address `http://127.0.0.1:4000/api` — fast, and never exposed.

## 1. Prerequisites

- Node.js >= 20, npm
- PostgreSQL reachable via your `DATABASE_URL` (you confirmed this is set up)
- A reverse proxy (nginx/Caddy) terminating TLS — **required** for the admin app
  (its login cookie is `secure` in production and won't be stored over plain HTTP)

## 2. Install dependencies

```bash
npm install                       # root workspaces (web/portal/admin)
npm install --prefix backend      # backend has its own lockfile
```

## 3. Generate env files

```bash
deploy/generate-env.sh            # interactive; --force to overwrite existing
```

It writes (all `chmod 600`, all gitignored):
`backend/.env`, `apps/web/.env.local`, `apps/portal/.env.local`, `apps/admin/.env.local`.

It auto-generates strong, distinct `ADMIN_JWT_SECRET` / `AGENT_JWT_SECRET` /
`JWT_SECRET` / `HUMAN_VERIFICATION_SECRET` and a shared `REVALIDATE_SECRET`
(identical in web + admin, as required).

**Domain mode** (recommended) derives:
`example.com` → web, `portal.example.com`, `admin.example.com`, `api.example.com/api`.
**IP mode** uses `http://IP:3000|3001|3002|4000` — fine for a quick smoke test,
but do not run the admin app there in the open (no HTTPS = no secure cookie).

You can pre-set any value as an env var to skip its prompt (see the header of
`deploy/generate-env.sh`).

## 4. Database migrate + seed

```bash
cd backend
npx prisma migrate deploy
npm run db:seed          # creates the seed admin from SEED_ADMIN_* in backend/.env
cd ..
```

## 5. Build and run

`NEXT_PUBLIC_*` values are inlined at **build time**, so build *after* env files exist.

```bash
# Backend
npm run --prefix backend build && npm run --prefix backend start:prod

# Each Next app
npm run --workspace=apps/web   build && npm run --workspace=apps/web   start
npm run --workspace=apps/portal build && npm run --workspace=apps/portal start
npm run --workspace=apps/admin  build && npm run --workspace=apps/admin  start
```

Use a process manager (pm2/systemd) to keep them up, e.g.:

```bash
pm2 start "npm run start:prod" --name wdlc-backend --cwd backend
pm2 start "npm run start" --name wdlc-web    --cwd apps/web
pm2 start "npm run start" --name wdlc-portal --cwd apps/portal
pm2 start "npm run start" --name wdlc-admin  --cwd apps/admin
pm2 save
```

## 6. Reverse proxy (nginx example, domain mode)

Terminate TLS here and forward to the local ports. Keep port 4000 firewalled off
the public internet — only the proxy and the local Next apps need it.

```nginx
# api.example.com  -> backend (only needed because the public web browser calls it)
server {
  listen 443 ssl;
  server_name api.example.com;
  # ssl_certificate ...; ssl_certificate_key ...;
  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;   # real client IP for rate-limit/audit
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

# example.com -> web ; portal.example.com -> :3001 ; admin.example.com -> :3002
server {
  listen 443 ssl;
  server_name example.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

The backend sets `trust proxy` in production, so `X-Forwarded-For` is honored for
rate limiting, login lockout, and audit IPs — make sure your proxy sends it.

> **Alternative (no `api.` subdomain, no CORS):** proxy `location /api { proxy_pass
> http://127.0.0.1:4000; }` under the web domain and set
> `NEXT_PUBLIC_API_URL=/api`. Same-origin → CORS becomes irrelevant for the web app.

## 7. Admin hardening checklist

You asked for the admin to be locked down. Beyond the strong generated secrets:

- [ ] **HTTPS only.** Required for the admin's `secure` login cookie to work at all.
- [ ] **Restrict who can reach `admin.example.com`** — it's the most sensitive
      surface. Put it behind a VPN, an IP allowlist, or proxy-level auth (e.g.
      nginx `allow`/`deny` or HTTP basic auth) in addition to the app login.
- [ ] **Enable reCAPTCHA on the admin login** — set `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
      (admin) **and** `RECAPTCHA_SECRET` (backend) together. Backend verification
      fails closed in production when the secret is set.
- [ ] **Change the seed admin password on first login**, then remove/rotate
      `SEED_ADMIN_*` from `backend/.env`.
- [ ] **Don't expose backend port 4000 publicly** — firewall it; the proxy and
      local apps reach it on `127.0.0.1`. Admin/portal use the internal `API_URL`.
- [ ] **Add HSTS** at the proxy for the admin (and other) domains.
- [ ] Keep `CORS_ORIGIN` to the exact origins only — no wildcards.

> **Known caveat — admin location import:** every admin flow runs server-side
> (server actions/middleware) **except** the Excel/CSV location import in
> `apps/admin/src/lib/api.ts` (`apiImportLocations`), which fetches from the
> browser using `API_URL`. Since `API_URL` isn't a `NEXT_PUBLIC_` var, in the
> browser it falls back to `http://localhost:4000/api` and the upload fails on a
> remote server. Until that's refactored to a server action (or the admin domain
> proxies `/api` to the backend), the import button won't work remotely. Tell me
> if you want that fix — it's a small, contained change.

## 8. Troubleshooting map

| Symptom | Cause | Fix |
|---|---|---|
| Public web forms/contact "fetch failed" in browser | `NEXT_PUBLIC_API_URL` is localhost or unreachable | Set it to your public API URL (or `/api` proxied), then **rebuild** web |
| Browser console shows CORS error | `CORS_ORIGIN` missing your frontend origin | Add the exact origin(s) to `backend/.env`, restart backend |
| Portal/admin pages redirect to /login or 500 on SSR | Backend not running / `API_URL` wrong | Confirm backend is up on :4000; `API_URL=http://127.0.0.1:4000/api` |
| Admin login "succeeds" but immediately bounces to /login | Cookie not stored (no HTTPS in prod) | Serve admin over TLS (`NODE_ENV=production` + HTTPS) |
| Backend won't start, complains about JWT secrets | Placeholder/short secrets in prod | Re-run `deploy/generate-env.sh` (generates valid ones) |
| Backend won't start, DB error | `DATABASE_URL` wrong / migrations not applied | Fix URL; run `npx prisma migrate deploy` |
