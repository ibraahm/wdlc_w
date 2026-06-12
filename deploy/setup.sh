#!/usr/bin/env bash
#
# WDLC one-command production setup.
#
#   deploy/setup.sh
#
# Interactive: prompts for your domain/DB/secrets where input is needed, then
#   1. preflight checks (node >= 20, npm, openssl)
#   2. generates backend/.env + apps/*/.env.local   (deploy/generate-env.sh)
#   3. installs dependencies (root workspaces + backend)
#   4. prisma generate + migrate deploy + optional seed admin
#   5. builds backend, web, portal, admin for production
#   6. smoke-tests the backend (/api/health/ready — proves DB connectivity)
#   7. prints the pm2 / nginx steps that remain
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

say()  { printf '\n\033[1;36m== %s\033[0m\n' "$*"; }
ok()   { printf '\033[32m  ✔ %s\033[0m\n' "$*"; }
warn() { printf '\033[33m  ! %s\033[0m\n' "$*"; }
die()  { printf '\033[31m  ✘ %s\033[0m\n' "$*" >&2; exit 1; }

confirm() { # confirm "Question" -> 0 yes / 1 no
  local reply; read -r -p "$1 [y/N]: " reply || true
  [[ "$reply" =~ ^[Yy] ]]
}

# ── 1. Preflight ─────────────────────────────────────────────────────────────
say "Preflight checks"
command -v node >/dev/null || die "node not found — install Node.js >= 20"
command -v npm  >/dev/null || die "npm not found"
command -v openssl >/dev/null || die "openssl not found (needed to generate secrets)"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
(( NODE_MAJOR >= 20 )) || die "Node $(node -v) found — this project requires >= 20"
ok "node $(node -v), npm $(npm -v)"

# ── 2. Environment files ─────────────────────────────────────────────────────
say "Environment files"
ENV_FLAG=""
if [[ -f backend/.env || -f apps/web/.env.local ]]; then
  warn "Env files already exist."
  if confirm "Regenerate them (overwrites, new secrets are generated)?"; then
    ENV_FLAG="--force"
  else
    ok "Keeping existing env files."
  fi
fi
if [[ ! -f backend/.env || -n "$ENV_FLAG" ]]; then
  bash deploy/generate-env.sh $ENV_FLAG
fi
[[ -f backend/.env ]] || die "backend/.env missing — env generation failed"
ok "backend/.env, apps/{web,portal,admin}/.env.local in place"

# ── 3. Dependencies ──────────────────────────────────────────────────────────
say "Installing dependencies"
npm install
npm install --prefix backend
ok "dependencies installed"

# ── 4. Database ──────────────────────────────────────────────────────────────
say "Database (Prisma)"
( cd backend
  npx prisma generate
  npx prisma migrate deploy
) || die "Migration failed — check DATABASE_URL in backend/.env and that Postgres is reachable"
ok "migrations applied"

if confirm "Seed the admin user + default content now (safe to skip if already seeded)?"; then
  ( cd backend && npm run db:seed ) || die "Seed failed"
  ok "seeded — admin login is SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD from backend/.env"
  warn "Change the seed admin password on first login."
fi

# ── 5. Production builds ─────────────────────────────────────────────────────
say "Building for production (NEXT_PUBLIC_* values are baked in at this step)"
npm run --prefix backend build           && ok "backend built"
npm run --workspace=apps/web build       && ok "web built"
npm run --workspace=apps/portal build    && ok "portal built"
npm run --workspace=apps/admin build     && ok "admin built"

# ── 6. Backend smoke test ────────────────────────────────────────────────────
say "Smoke test: backend boot + DB readiness"
PORT="$(grep -E '^PORT=' backend/.env | cut -d= -f2 | tr -d '\"' || true)"
PORT="${PORT:-4000}"
HEALTH="http://127.0.0.1:${PORT}/api/health/ready"

if curl -fsS --max-time 3 "$HEALTH" >/dev/null 2>&1; then
  ok "backend already running and ready on :$PORT"
else
  ENTRY="dist/main.js"; [[ -f backend/dist/main.js ]] || ENTRY="dist/src/main.js"
  ( cd backend && NODE_ENV=production node "$ENTRY" >/tmp/wdlc-smoke.log 2>&1 & echo $! >/tmp/wdlc-smoke.pid )
  SMOKE_PID="$(cat /tmp/wdlc-smoke.pid)"
  READY=0
  for _ in $(seq 1 20); do
    sleep 1
    if curl -fsS --max-time 2 "$HEALTH" >/dev/null 2>&1; then READY=1; break; fi
    kill -0 "$SMOKE_PID" 2>/dev/null || break   # process died — stop waiting
  done
  kill "$SMOKE_PID" 2>/dev/null || true
  wait "$SMOKE_PID" 2>/dev/null || true
  if (( READY )); then
    ok "backend boots in production mode and reaches the database"
  else
    warn "Backend failed the smoke test. Last log lines:"
    tail -15 /tmp/wdlc-smoke.log || true
    die "Fix the above (usually DATABASE_URL or JWT secrets) and re-run."
  fi
fi

# ── 7. What's left ───────────────────────────────────────────────────────────
say "Setup complete — remaining manual steps"
cat <<'NEXT'
  1) Run the four services under a process manager, e.g. pm2:
       pm2 start "npm run start:prod" --name wdlc-backend --cwd backend
       pm2 start "npm run start" --name wdlc-web    --cwd apps/web
       pm2 start "npm run start" --name wdlc-portal --cwd apps/portal
       pm2 start "npm run start" --name wdlc-admin  --cwd apps/admin
       pm2 save && pm2 startup

  2) nginx (TLS) per subdomain  ->  local port:
       web     -> 127.0.0.1:3000   (+ "location /api { proxy_pass http://127.0.0.1:4000; }"
                                     if you chose the default same-origin /api)
       portal  -> 127.0.0.1:3001
       admin   -> 127.0.0.1:3002   (your secure.* subdomain — HTTPS is REQUIRED
                                     or the admin login cookie is rejected)
     Send X-Forwarded-For / X-Forwarded-Proto on every block.

  3) Firewall: keep 3000-3002 and 4000 closed to the public internet —
     only nginx talks to them on 127.0.0.1.

  4) Log in to the admin, change the seed password, then rotate/remove
     SEED_ADMIN_* from backend/.env.

  Full reference: deploy/DEPLOYMENT.md (proxy examples, hardening checklist,
  troubleshooting map).
NEXT

# ── 8. Self-removal ──────────────────────────────────────────────────────────
# Setup succeeded — mark the server installed and remove the setup scripts so
# they can't be re-run by accident. A future `git pull` restores the files,
# but the marker keeps the browser installer locked out too.
date -u +"%Y-%m-%dT%H:%M:%SZ" > "$ROOT/deploy/.installed"
rm -f "$ROOT/deploy/setup.sh" "$ROOT/deploy/generate-env.sh"
ok "Setup scripts removed from this server (deploy/.installed marker written)."
