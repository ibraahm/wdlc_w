#!/usr/bin/env bash
#
# WDLC one-command production setup — friendly edition.
#
#   deploy/setup.sh
#
# Walks you through everything in plain language:
#   1. checks this server has what it needs
#   2. asks a few questions and writes the config files
#   3. downloads the app's building blocks (dependencies)
#   4. prepares the database
#   5. builds the four apps for production
#   6. test-starts the backend to prove everything is wired up
#   7. tells you exactly what's left to do
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TOTAL=7
step() { printf '\n\033[1;36m━━ Step %s of %s — %s\033[0m\n' "$1" "$TOTAL" "$2"; }
ok()   { printf '\033[32m  ✔ %s\033[0m\n' "$*"; }
note() { printf '\033[2m  %s\033[0m\n' "$*"; }
warn() { printf '\033[33m  ! %s\033[0m\n' "$*"; }
die()  { printf '\n\033[31m  ✘ %s\033[0m\n' "$*" >&2; exit 1; }

confirm() { # confirm "Question" -> 0 yes / 1 no
  local reply; read -r -p "  $1 [y/N]: " reply || true
  [[ "$reply" =~ ^[Yy] ]]
}

echo
printf '\033[1;36m╔══════════════════════════════════════════════════════════╗\n'
printf '║          WDLC production setup — welcome!                ║\n'
printf '╚══════════════════════════════════════════════════════════╝\033[0m\n'
note "This takes about 5-10 minutes. I'll do the heavy lifting and only"
note "stop when I need an answer from you. You can safely re-run this"
note "script any time — it picks up where things left off."

# ── 1. Preflight ─────────────────────────────────────────────────────────────
step 1 "Checking this server has what it needs"
command -v node >/dev/null || die "Node.js isn't installed. Install Node.js 20 or newer, then re-run me. (On Ubuntu: https://nodejs.org/en/download)"
command -v npm  >/dev/null || die "npm isn't installed (it normally comes with Node.js)."
command -v openssl >/dev/null || die "openssl isn't installed (needed to create security keys). On Ubuntu: sudo apt install openssl"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
(( NODE_MAJOR >= 20 )) || die "Your Node.js is $(node -v), but version 20+ is required. Please upgrade Node.js and re-run."
ok "Node.js $(node -v) and npm $(npm -v) — good to go"

# ── 2. Environment files ─────────────────────────────────────────────────────
step 2 "Your settings (addresses, database, admin login)"
ENV_FLAG=""
if [[ -f backend/.env || -f apps/web/.env.local ]]; then
  warn "You already have configuration files from a previous run."
  note "Keeping them is the safe choice. Recreating them generates brand-new"
  note "security keys, which logs everyone out (fine before launch)."
  if confirm "Recreate the configuration from scratch?"; then
    ENV_FLAG="--force"
  else
    ok "Keeping your existing configuration."
  fi
fi
if [[ ! -f backend/.env || -n "$ENV_FLAG" ]]; then
  bash deploy/generate-env.sh $ENV_FLAG
fi
[[ -f backend/.env ]] || die "Configuration wasn't created — see the message above, then re-run me."
ok "Configuration files are in place"

# ── 3. Dependencies ──────────────────────────────────────────────────────────
step 3 "Downloading the app's building blocks (this is the slow part)"
note "Grabbing libraries from the internet — a few minutes on first run."
npm install
npm install --prefix backend
ok "All dependencies installed"

# ── 4. Database ──────────────────────────────────────────────────────────────
step 4 "Preparing the database"
note "Creating/updating the tables the app needs. Your data is never deleted."
( cd backend
  npx prisma generate
  npx prisma migrate deploy
) || die "Couldn't reach or update the database. Double-check the database password/host you entered (stored in backend/.env), make sure PostgreSQL is running, then re-run me."
ok "Database tables are ready"

echo
note "First time here? Say yes below to create your admin account and the"
note "starter website content. Already did this before? Say no — it's done."
if confirm "Create the admin account + starter content now?"; then
  ( cd backend && npm run db:seed ) || die "Creating the starter data failed — scroll up for the reason, fix it, and re-run me."
  ok "Done — log in with the admin email & password from Step 2"
  warn "Change that password right after your first login."
fi

# ── 5. Production builds ─────────────────────────────────────────────────────
step 5 "Building the four apps for production"
note "Turning the source code into fast, optimized versions. ~2-5 minutes."
npm run --prefix backend build           && ok "1/4 backend (the engine) built"
npm run --workspace=apps/web build       && ok "2/4 public website built"
npm run --workspace=apps/portal build    && ok "3/4 agent portal built"
npm run --workspace=apps/admin build     && ok "4/4 admin panel built"

# ── 6. Backend smoke test ────────────────────────────────────────────────────
step 6 "Test-starting the engine to prove everything is connected"
PORT="$(grep -E '^PORT=' backend/.env | cut -d= -f2 | tr -d '\"' || true)"
PORT="${PORT:-4000}"
HEALTH="http://127.0.0.1:${PORT}/api/health/ready"

if curl -fsS --max-time 3 "$HEALTH" >/dev/null 2>&1; then
  ok "The backend is already running and talking to the database"
else
  note "Starting the backend briefly to verify it boots and reaches the database…"
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
    ok "Backend starts cleanly and the database answers — you're wired up"
  else
    warn "The backend didn't start. Here are its last words:"
    tail -15 /tmp/wdlc-smoke.log || true
    die "Most often this is a wrong database password or host (in backend/.env). Fix it and re-run me — everything done so far is saved."
  fi
fi

# ── 7. What's left ───────────────────────────────────────────────────────────
step 7 "You're nearly live — here's the short to-do list"
cat <<'NEXT'

  A) Keep the apps running permanently with pm2 (copy-paste these):

       sudo npm install -g pm2
       pm2 start "npm run start:prod" --name wdlc-backend --cwd backend
       pm2 start "npm run start" --name wdlc-web    --cwd apps/web
       pm2 start "npm run start" --name wdlc-portal --cwd apps/portal
       pm2 start "npm run start" --name wdlc-admin  --cwd apps/admin
       pm2 save && pm2 startup

     (pm2 restarts everything automatically after a crash or reboot.)

  B) Point your web server (nginx) at the apps — each domain to its port:

       main website   -> 127.0.0.1:3000   (also forward /api to 127.0.0.1:4000)
       portal.…       -> 127.0.0.1:3001
       secure.…       -> 127.0.0.1:3002   (admin — MUST be https, or login
                                           silently fails)

     Copy-paste-ready nginx examples: deploy/DEPLOYMENT.md, section 6.

  C) Firewall: only ports 80 and 443 should be open to the world.
     Ports 3000-3002 and 4000 stay private (nginx reaches them locally).

  D) Log in to the admin panel, change your password, and you're live!

  Stuck? deploy/DEPLOYMENT.md has a "symptom -> fix" table at the bottom.
NEXT

# ── 8. Self-removal ──────────────────────────────────────────────────────────
# Setup succeeded — mark the server installed and remove the setup scripts so
# they can't be re-run by accident. A future `git pull` restores the files,
# but the marker keeps the browser installer locked out too.
date -u +"%Y-%m-%dT%H:%M:%SZ" > "$ROOT/deploy/.installed"
rm -f "$ROOT/deploy/setup.sh" "$ROOT/deploy/generate-env.sh"
ok "Setup scripts removed from this server (deploy/.installed marker written)."
