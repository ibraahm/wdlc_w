#!/usr/bin/env bash
#
# Generate the real .env files for every WDLC app from deploy/env/*.template.
#
# It fills in your public URLs (or server IP), auto-generates strong distinct
# secrets, and writes:
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
warn() { printf '\033[33m%s\033[0m\n' "$*"; }
die()  { printf '\033[31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

command -v openssl >/dev/null || die "openssl is required to generate secrets."

ask() { # ask VAR "Prompt" "default"
  local var="$1" prompt="$2" def="${3:-}" cur="${!1:-}"
  [[ -n "$cur" ]] && { printf -v "$var" '%s' "$cur"; return; }
  local reply=""
  if [[ -n "$def" ]]; then read -r -p "$prompt [$def]: " reply || true; reply="${reply:-$def}"
  else read -r -p "$prompt: " reply || true; fi
  printf -v "$var" '%s' "$reply"
}

# Strip a URL down to its origin (scheme://host[:port]) for CORS.
origin() { sed -E 's#^(https?://[^/]+).*#\1#' <<<"$1"; }

gen() { openssl rand -hex 32; }

say "WDLC environment generator"
echo

ask DEPLOY_MODE "Deploy mode (domain/ip)" "domain"

if [[ "$DEPLOY_MODE" == "domain" ]]; then
  SCHEME="${SCHEME:-https}"
  ask BASE_DOMAIN "Base domain (apex)" "worlddirectlink.com"
  : "${PUBLIC_WEB_URL:=$SCHEME://$BASE_DOMAIN}"
  : "${PUBLIC_PORTAL_URL:=$SCHEME://portal.$BASE_DOMAIN}"
  : "${PUBLIC_ADMIN_URL:=$SCHEME://secure.$BASE_DOMAIN}"
  # Default: same-origin /api proxied to the backend on the web domain — no
  # api. subdomain and no CORS needed for the public site. Override with a full
  # URL (e.g. https://api.example.com/api) if you prefer a dedicated API host.
  : "${PUBLIC_API_URL:=/api}"
  warn "Derived subdomains (edit if your DNS differs):"
elif [[ "$DEPLOY_MODE" == "ip" ]]; then
  SCHEME="${SCHEME:-http}"
  ask SERVER_IP "Server public IP" ""
  [[ -n "$SERVER_IP" ]] || die "SERVER_IP is required in ip mode."
  : "${PUBLIC_WEB_URL:=$SCHEME://$SERVER_IP:3000}"
  : "${PUBLIC_PORTAL_URL:=$SCHEME://$SERVER_IP:3001}"
  : "${PUBLIC_ADMIN_URL:=$SCHEME://$SERVER_IP:3002}"
  : "${PUBLIC_API_URL:=$SCHEME://$SERVER_IP:4000/api}"
  warn "IP mode uses plain HTTP and exposes port 4000 to the browser."
  warn "The admin login cookie is 'secure' in production and needs HTTPS — use"
  warn "domain mode + TLS before trusting the admin app on the public internet."
else
  die "DEPLOY_MODE must be 'domain' or 'ip'."
fi

# Allow per-URL overrides / confirmation.
ask PUBLIC_WEB_URL    "  Public web URL"     "$PUBLIC_WEB_URL"
ask PUBLIC_PORTAL_URL "  Public portal URL"  "$PUBLIC_PORTAL_URL"
ask PUBLIC_ADMIN_URL  "  Public admin URL"   "$PUBLIC_ADMIN_URL"
ask PUBLIC_API_URL    "  Browser API base (absolute URL, or /api if proxied)" "$PUBLIC_API_URL"

INTERNAL_API_URL="${INTERNAL_API_URL:-http://127.0.0.1:4000/api}"

echo
ask DATABASE_URL "PostgreSQL DATABASE_URL" ""
[[ -n "$DATABASE_URL" ]] || die "DATABASE_URL is required."

echo
ask SEED_ADMIN_EMAIL "Seed admin email" "info@worlddirectlink.com"
: "${SEED_ADMIN_PASSWORD:=$(gen | cut -c1-20)!Aa1}"  # strong default if unset

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
  [[ -f "$dest" && $FORCE -eq 0 ]] && die "$dest exists. Re-run with --force to overwrite."
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
  say "  wrote $dest"
}

echo
say "Writing env files…"
render "$TPL/backend.env.template" "$ROOT/backend/.env"
render "$TPL/web.env.template"     "$ROOT/apps/web/.env.local"
render "$TPL/portal.env.template"  "$ROOT/apps/portal/.env.local"
render "$TPL/admin.env.template"   "$ROOT/apps/admin/.env.local"

echo
say "Done. Summary:"
cat <<SUMMARY
  Web    : $PUBLIC_WEB_URL      -> :3000
  Portal : $PUBLIC_PORTAL_URL   -> :3001
  Admin  : $PUBLIC_ADMIN_URL    -> :3002
  API    : browser=$PUBLIC_API_URL  server=$INTERNAL_API_URL  -> :4000
  CORS   : $CORS_ORIGIN
  Seed admin login: $SEED_ADMIN_EMAIL / $SEED_ADMIN_PASSWORD
SUMMARY
warn "Save the seed admin password now and change it on first login."
echo "Next: see deploy/DEPLOYMENT.md (migrate DB, build, run, reverse proxy)."
