#!/usr/bin/env bash
#
# Generate the real .env files for every WDLC app from deploy/env/*.template.
#
# Friendly interactive prompts; every question shows a [default] you can accept
# by just pressing ENTER. Writes:
#   backend/.env            apps/web/.env.local
#   apps/portal/.env.local  apps/admin/.env.local
#
# Usage:
#   deploy/generate-env.sh            # interactive prompts
#   deploy/generate-env.sh --force    # overwrite files that already exist
#
# Non-interactive: pre-set any of these env vars to skip the matching prompt:
#   DEPLOY_MODE   domain | ip
#   BASE_DOMAIN   example.com      (domain mode; subdomains derived below)
#   SERVER_IP     203.0.113.5      (ip mode)
#   SCHEME        https | http     (default: https for domain, http for ip)
#   DATABASE_URL  postgresql://user:pass@host:5432/wdlc?schema=public
#   PUBLIC_WEB_URL / PUBLIC_PORTAL_URL / PUBLIC_ADMIN_URL / PUBLIC_API_URL
#   INTERNAL_API_URL   (default http://127.0.0.1:4000/api)
#   SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TPL="$ROOT/deploy/env"
FORCE=0
[[ "${1:-}" == "--force" ]] && FORCE=1

say()  { printf '\033[36m%s\033[0m\n' "$*"; }
note() { printf '\033[2m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*"; }
die()  { printf '\033[31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

command -v openssl >/dev/null || die "openssl is required to generate secrets."

ask() { # ask VAR "Prompt" "default"
  local var="$1" prompt="$2" def="${3:-}" cur="${!1:-}"
  [[ -n "$cur" ]] && { printf -v "$var" '%s' "$cur"; return; }
  local reply=""
  if [[ -n "$def" ]]; then read -r -p "  $prompt [$def]: " reply || true; reply="${reply:-$def}"
  else read -r -p "  $prompt: " reply || true; fi
  printf -v "$var" '%s' "$reply"
}

ask_secret() { # ask_secret VAR "Prompt"  (input hidden while typing)
  local var="$1" prompt="$2" cur="${!1:-}"
  [[ -n "$cur" ]] && { printf -v "$var" '%s' "$cur"; return; }
  local reply=""
  read -r -s -p "  $prompt: " reply || true; echo
  printf -v "$var" '%s' "$reply"
}

# Percent-encode characters that would break a connection URL (e.g. @ : / #).
urlencode() {
  local s="$1" out="" c i
  for (( i=0; i<${#s}; i++ )); do
    c="${s:$i:1}"
    case "$c" in
      [a-zA-Z0-9.~_-]) out+="$c" ;;
      *) printf -v c '%%%02X' "'$c"; out+="$c" ;;
    esac
  done
  printf '%s' "$out"
}

# Strip a URL down to its origin (scheme://host[:port]) for CORS.
origin() { sed -E 's#^(https?://[^/]+).*#\1#' <<<"$1"; }

gen() { openssl rand -hex 32; }

echo
say "════════════════════════════════════════════════════════════"
say "  WDLC setup — let's connect your apps together"
say "════════════════════════════════════════════════════════════"
note "I'll ask a few questions. Whenever you see a value in [brackets],"
note "just press ENTER to accept it. Nothing is sent anywhere — answers"
note "only end up in config files on this server."
echo

# ── Step A: how people will reach your sites ────────────────────────────────
say "STEP A — Your website addresses"
note "Do you have domain names pointed at this server (like worlddirectlink.com),"
note "or are you testing with just the server's IP address for now?"
ask DEPLOY_MODE "Type 'domain' or 'ip'" "domain"
case "$DEPLOY_MODE" in 1|d|D) DEPLOY_MODE=domain ;; 2|i|I) DEPLOY_MODE=ip ;; esac

# Suggestions are passed as [defaults] so you can still type something else;
# pre-setting PUBLIC_*_URL in the environment skips the prompt entirely.
if [[ "$DEPLOY_MODE" == "domain" ]]; then
  SCHEME="${SCHEME:-https}"
  ask BASE_DOMAIN "Your main domain" "worlddirectlink.com"
  DEF_WEB="$SCHEME://$BASE_DOMAIN"
  DEF_PORTAL="$SCHEME://portal.$BASE_DOMAIN"
  DEF_ADMIN="$SCHEME://secure.$BASE_DOMAIN"
  # Default: same-origin /api proxied to the backend on the web domain — no
  # api. subdomain and no CORS needed for the public site.
  DEF_API="/api"
  echo
  note "Based on that, I'll suggest an address for each app. Press ENTER to"
  note "accept each one, or type a different address if yours differs."
elif [[ "$DEPLOY_MODE" == "ip" ]]; then
  SCHEME="${SCHEME:-http}"
  ask SERVER_IP "This server's public IP address" ""
  [[ -n "$SERVER_IP" ]] || die "I need the server IP to continue."
  DEF_WEB="$SCHEME://$SERVER_IP:3000"
  DEF_PORTAL="$SCHEME://$SERVER_IP:3001"
  DEF_ADMIN="$SCHEME://$SERVER_IP:3002"
  DEF_API="$SCHEME://$SERVER_IP:4000/api"
  warn "Heads-up: IP mode is fine for testing, but the admin login only fully"
  warn "works over HTTPS — use domain mode with TLS before going live."
else
  die "Please answer 'domain' or 'ip'."
fi

ask PUBLIC_WEB_URL    "Public website (visitors)" "$DEF_WEB"
ask PUBLIC_PORTAL_URL "Agent portal"              "$DEF_PORTAL"
ask PUBLIC_ADMIN_URL  "Admin panel"               "$DEF_ADMIN"
ask PUBLIC_API_URL    "API address browsers use (keep /api unless you know otherwise)" "$DEF_API"

INTERNAL_API_URL="${INTERNAL_API_URL:-http://127.0.0.1:4000/api}"

# ── Step B: database ─────────────────────────────────────────────────────────
echo
say "STEP B — Your PostgreSQL database"
if [[ -z "${DATABASE_URL:-}" ]]; then
  note "If you have a full connection string (starts with postgresql://),"
  note "paste it now. Otherwise just press ENTER and I'll build it with you."
  ask DATABASE_URL "Connection string (or ENTER to answer step by step)" ""
  if [[ -z "$DATABASE_URL" ]]; then
    ask DB_HOST "Where does the database run? (usually this same server)" "localhost"
    ask DB_PORT "Database port (PostgreSQL's standard is 5432)" "5432"
    ask DB_NAME "Database name" "wdlc"
    ask DB_USER "Database username" "postgres"
    ask_secret DB_PASS "Database password (typing is hidden)"
    [[ -n "$DB_PASS" ]] || warn "Empty password — okay only if Postgres allows it."
    DATABASE_URL="postgresql://$(urlencode "$DB_USER"):$(urlencode "$DB_PASS")@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
    note "Built: postgresql://${DB_USER}:•••••@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  fi
fi
[[ -n "$DATABASE_URL" ]] || die "I can't continue without database details."

# ── Step C: your admin login ─────────────────────────────────────────────────
echo
say "STEP C — Your first admin account (how YOU log in)"
ask SEED_ADMIN_EMAIL "Admin email address" "info@worlddirectlink.com"
if [[ -z "${SEED_ADMIN_PASSWORD:-}" ]]; then
  note "Press ENTER and I'll generate a strong password for you (recommended),"
  note "or type one yourself (12+ characters)."
  ask_secret SEED_ADMIN_PASSWORD "Admin password (ENTER = generate one)"
  if [[ -z "$SEED_ADMIN_PASSWORD" ]]; then
    SEED_ADMIN_PASSWORD="$(gen | cut -c1-20)!Aa1"
    GENERATED_PW=1
  fi
fi

# CORS = the browser-facing app origins (web definitely calls cross-origin).
CORS_ORIGIN="$(origin "$PUBLIC_WEB_URL"),$(origin "$PUBLIC_PORTAL_URL"),$(origin "$PUBLIC_ADMIN_URL")"

# Secrets — generated once; REVALIDATE_SECRET shared between web + admin.
ADMIN_JWT_SECRET="$(gen)"
AGENT_JWT_SECRET="$(gen)"
JWT_SECRET="$(gen)"
HUMAN_VERIFICATION_SECRET="$(gen)"
REVALIDATE_SECRET="$(gen)"

render() { # render TEMPLATE DEST
  local tpl="$1" dest="$2"
  [[ -f "$dest" && $FORCE -eq 0 ]] && die "$dest already exists. Re-run with --force to replace it."
  sed \
    -e "s|@@DATABASE_URL@@|${DATABASE_URL//|/\\|}|g" \
    -e "s|@@ADMIN_JWT_SECRET@@|${ADMIN_JWT_SECRET}|g" \
    -e "s|@@AGENT_JWT_SECRET@@|${AGENT_JWT_SECRET}|g" \
    -e "s|@@JWT_SECRET@@|${JWT_SECRET}|g" \
    -e "s|@@HUMAN_VERIFICATION_SECRET@@|${HUMAN_VERIFICATION_SECRET}|g" \
    -e "s|@@REVALIDATE_SECRET@@|${REVALIDATE_SECRET}|g" \
    -e "s|@@CORS_ORIGIN@@|${CORS_ORIGIN}|g" \
    -e "s|@@INTERNAL_API_URL@@|${INTERNAL_API_URL//|/\\|}|g" \
    -e "s|@@PUBLIC_API_URL@@|${PUBLIC_API_URL//|/\\|}|g" \
    -e "s|@@PUBLIC_WEB_URL@@|${PUBLIC_WEB_URL//|/\\|}|g" \
    -e "s|@@PUBLIC_PORTAL_URL@@|${PUBLIC_PORTAL_URL//|/\\|}|g" \
    -e "s|@@PUBLIC_ADMIN_URL@@|${PUBLIC_ADMIN_URL//|/\\|}|g" \
    -e "s|@@SEED_ADMIN_EMAIL@@|${SEED_ADMIN_EMAIL}|g" \
    -e "s|@@SEED_ADMIN_PASSWORD@@|${SEED_ADMIN_PASSWORD//|/\\|}|g" \
    "$tpl" > "$dest"
  chmod 600 "$dest"
  say "  ✔ wrote $dest"
}

echo
say "Writing configuration files (strong security keys are generated for you)…"
render "$TPL/backend.env.template" "$ROOT/backend/.env"
render "$TPL/web.env.template"     "$ROOT/apps/web/.env.local"
render "$TPL/portal.env.template"  "$ROOT/apps/portal/.env.local"
render "$TPL/admin.env.template"   "$ROOT/apps/admin/.env.local"

echo
say "════════════════════════════════════════════════════════════"
say "  All set! Here's your summary — keep it somewhere safe"
say "════════════════════════════════════════════════════════════"
cat <<SUMMARY
  Public website : $PUBLIC_WEB_URL
  Agent portal   : $PUBLIC_PORTAL_URL
  Admin panel    : $PUBLIC_ADMIN_URL
  Admin login    : $SEED_ADMIN_EMAIL
SUMMARY
if [[ -n "${GENERATED_PW:-}" ]]; then
  printf '  Admin password : %s\n' "$SEED_ADMIN_PASSWORD"
  warn "  ↑ WRITE THIS PASSWORD DOWN NOW — it is shown only this once."
else
  echo "  Admin password : (the one you typed)"
fi
warn "Change the admin password after your first login."
