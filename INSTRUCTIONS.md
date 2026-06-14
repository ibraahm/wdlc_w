# WDLC - Operations & Deployment Guide

Practical runbook for deploying and running the WDLC platform on a Linux server.
For an overview of the codebase, see [README.md](./README.md).

- **Server layout:** repo at `/var/www/wdlc`, served behind nginx, run by PM2.
- **Ports:** API `4000`, web `3000`, portal `3001`, admin `3002` (API binds to `127.0.0.1`).
- **PM2 processes:** `wdlc-api`, `wdlc-web`, `wdlc-portal`, `wdlc-admin` (defined in `ecosystem.config.js`).

---

## 1. Prerequisites (one-time, on a new server)

```bash
# Node 20 LTS + npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL, nginx, PM2
sudo apt-get install -y postgresql nginx
sudo npm install -g pm2
```

Create the database and user (use a strong password; URL-encode special chars in `DATABASE_URL`):

```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE wdlc;
CREATE USER wdlc_user WITH ENCRYPTED PASSWORD 'CHANGE_ME';
GRANT ALL PRIVILEGES ON DATABASE wdlc TO wdlc_user;
ALTER DATABASE wdlc OWNER TO wdlc_user;
SQL
```

---

## 2. Environment files

These are **not** in git. They must exist before building/starting. Keep a secure backup
(e.g. `/root/wdlc-env-backup/`) - re-cloning the repo does **not** restore them.

### `backend/.env`

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | ✅ | `postgresql://wdlc_user:PASS@localhost:5432/wdlc?schema=public` (URL-encode special chars) |
| `NODE_ENV` | ✅ | `production` |
| `PORT` | – | default `4000` |
| `ADMIN_JWT_SECRET` | ✅ | `openssl rand -hex 32` - must differ from agent secret |
| `AGENT_JWT_SECRET` | ✅ | `openssl rand -hex 32` |
| `JWT_SECRET` | – | shared fallback if the two above aren't set |
| `CORS_ORIGIN` | ✅ | comma-separated prod origins (web/portal/admin domains) |
| `PORTAL_BASE_URL` | ✅ | e.g. `https://secure.worlddirectlink.com` (email links) |
| `ADMIN_BASE_URL` | ✅ | admin URL (email links) |
| `HUMAN_VERIFICATION_SECRET` | ✅ | `openssl rand -hex 32` (signs the math challenge) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | ✅* | SMTP server (preferred email path) |
| `SMTP_USER` / `SMTP_PASS` | ✅* | SMTP credentials |
| `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` | – | sender identity |
| `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL` | – | fallback if SMTP not set |
| `AGENT_APPLICATION_NOTIFY_EMAIL` | – | where new applications are emailed |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | ✅ | first SUPER_ADMIN (change password after first login) |
| `GOOGLE_CLIENT_ID` | – | enables portal Google sign-in (see §7) |

\* Either SMTP **or** SendGrid must be configured for emails (verification, setup links, resets) to send.

### `apps/web/.env.local`, `apps/portal/.env.local`, `apps/admin/.env.local`

| Variable | Apps | Notes |
|----------|------|-------|
| `API_URL` | all | server-side base URL, e.g. `http://127.0.0.1:4000/api` |
| `NEXT_PUBLIC_API_URL` | web | browser calls the API directly for form submits |
| `NEXT_PUBLIC_ADMIN_URL` | portal | "admin sign-in" link target |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | portal | same value as backend `GOOGLE_CLIENT_ID` (see §7) |

> `NEXT_PUBLIC_*` values are baked in at **build time** - rebuild the app after changing them.

---

## 3. First deploy

```bash
cd /var/www
git clone https://github.com/ibraahm/wdlc_w.git wdlc
cd /var/www/wdlc && git checkout main

# create the env files from §2 (or restore from backup)

npm install --prefix backend
npm install
cd backend && npx prisma migrate deploy && npx prisma generate && npm run db:seed && cd ..

npm run build --prefix backend
npm run build --workspace apps/web
npm run build --workspace apps/portal
npm run build --workspace apps/admin

pm2 start ecosystem.config.js
pm2 save
pm2 startup        # run the command it prints, so PM2 restarts on reboot
```

Verify:

```bash
curl -s http://127.0.0.1:4000/api/health
pm2 status
```

---

## 4. Updating to the latest code

```bash
cd /var/www/wdlc
git checkout -- backend/package-lock.json    # discard the locally-regenerated lockfile
git pull origin main

npm install --prefix backend && npm install
cd backend && npx prisma migrate deploy && npx prisma generate && cd ..

npm run build --prefix backend
npm run build --workspace apps/web
npm run build --workspace apps/portal
npm run build --workspace apps/admin

pm2 restart ecosystem.config.js && pm2 save
```

---

## 5. Fresh restart (re-clone, keep the database)

The database is separate from the code, so re-cloning is safe **as long as you keep the env files**.

```bash
# 1) BACK UP ENV FIRST (do not skip)
mkdir -p /root/wdlc-env-backup
cp /var/www/wdlc/backend/.env            /root/wdlc-env-backup/backend.env
cp /var/www/wdlc/apps/portal/.env.local  /root/wdlc-env-backup/portal.env.local
cp /var/www/wdlc/apps/admin/.env.local   /root/wdlc-env-backup/admin.env.local
cp /var/www/wdlc/apps/web/.env.local     /root/wdlc-env-backup/web.env.local

# 2) Re-clone
cd /var/www && rm -rf wdlc
git clone https://github.com/ibraahm/wdlc_w.git wdlc && cd wdlc && git checkout main

# 3) Restore env
cp /root/wdlc-env-backup/backend.env      backend/.env
cp /root/wdlc-env-backup/portal.env.local apps/portal/.env.local
cp /root/wdlc-env-backup/admin.env.local  apps/admin/.env.local
cp /root/wdlc-env-backup/web.env.local    apps/web/.env.local

# 4) Install / migrate / build / start (see §3, skip db:seed)
```

### Recovering lost env (if you deleted the folder without a backup)

The PostgreSQL data is intact; you only need to rebuild `.env`. If the API is still running,
read its values from the live process:

```bash
pid=$(pgrep -f 'dist/main.js' | head -1)
cat /proc/$pid/environ | tr '\0' '\n' | grep -Ei 'DATABASE_URL|JWT|SECRET|SMTP|SENDGRID|GOOGLE|NOTIFY|SEED|HUMAN'
```

Or from PM2's saved dump: `grep -ao '"DATABASE_URL":"[^"]*"' ~/.pm2/dump.pm2`.
Lost JWT/verification secrets can be regenerated (`openssl rand -hex 32`) - this only logs
everyone out. `DATABASE_URL` must match the existing Postgres credentials to keep your data.

---

## 6. nginx (reverse proxy)

One server block per subdomain, each proxying to the local app port. Example for the portal:

```nginx
server {
    server_name secure.worlddirectlink.com;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    # listen 443 ssl; managed by certbot
}
```

Repeat for web (`:3000`) and admin (`:3002`). The API is **not** exposed publicly - the apps
reach it on `127.0.0.1:4000`. Use certbot for HTTPS; the `X-Forwarded-For` header lets the API
record the real client IP on e-signed applications.

---

## 7. Enabling Google sign-in (portal)

Optional. Off until configured; password login is unaffected.

1. In Google Cloud Console → **APIs & Services → Credentials**, create an **OAuth 2.0 Client ID**
   (type: Web application). Add your portal domain to **Authorized JavaScript origins**
   (e.g. `https://secure.worlddirectlink.com`).
2. Set the client ID in both places:
   - `backend/.env`: `GOOGLE_CLIENT_ID="...apps.googleusercontent.com"`
   - `apps/portal/.env.local`: `NEXT_PUBLIC_GOOGLE_CLIENT_ID="...apps.googleusercontent.com"`
3. Rebuild the portal and restart: `npm run build --workspace apps/portal && pm2 restart wdlc-portal`.

Google only authenticates accounts that **already exist and are approved** (matched by verified
email). It never creates accounts.

---

## 8. Training / LMS workflow (admin)

1. **Admin → Training → Courses → New Course.** Fill the steps: details, overview, save.
2. Reopen the course to build the **Curriculum** - add sections, then lessons (paste a
   YouTube/Vimeo/Loom link and/or write text).
3. Add **quiz** questions (mark the correct answer), set the pass mark, optionally require all
   lessons before the quiz.
4. Set **language** (+ a shared *translation group* code to link other-language variants), an
   optional **complete-by date**, the **audience** (everyone / states / agents), then **Publish**.
5. Agents see assigned courses in the portal, complete lessons + quiz, and download a certificate.
6. **Admin → Training → Reports** tracks scores and completions (all / by state / by agent),
   flags overdue, and exports CSV.

Courses/resources are **DRAFT** until you publish them.

---

## 9. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `git pull` aborts: *local changes to package-lock.json* | `git checkout -- backend/package-lock.json` then pull (it's regenerated by `npm install`). |
| API won't start, `EADDRINUSE :4000` | A stale process holds the port: `ss -ltnp \| grep 4000`, then `kill <pid>` (or `pm2 delete wdlc-api`) and restart. |
| Build errors about unknown Prisma fields | Run `npx prisma generate` in `backend/` before building. |
| Migration not applied | `cd backend && npx prisma migrate deploy`. Migrations are idempotent. |
| Emails not sending | Check `SMTP_*` (or SendGrid) in `backend/.env`; `pm2 logs wdlc-api` shows "SMTP ready" / errors. |
| Portal map/iframe blocked | Web CSP is in `apps/web/next.config.mjs`; the portal has no CSP (video embeds work). |
| Login says "verify your email" | Have the agent use the emailed setup link, or Admin → Active Agents → "Verify & activate". |
| Changes to `NEXT_PUBLIC_*` not taking effect | Rebuild that app - public env vars are compiled in. |

Useful commands:

```bash
pm2 status
pm2 logs wdlc-api --lines 50
pm2 restart ecosystem.config.js
curl -s http://127.0.0.1:4000/api/health
```

---

## 10. Backups

```bash
# Database (run on a schedule)
pg_dump -U wdlc_user -h localhost wdlc | gzip > /root/backups/wdlc-$(date +%F).sql.gz

# Env files (after any change)
cp backend/.env apps/*/.env.local /root/wdlc-env-backup/
```

Restore the DB with: `gunzip -c file.sql.gz | psql -U wdlc_user -h localhost wdlc`.
