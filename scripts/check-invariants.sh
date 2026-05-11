#!/usr/bin/env bash
set -euo pipefail

fail() {
  echo "ERREUR: $1"
  exit 1
}

[ -f "INVARIANTS.md" ] || fail "INVARIANTS.md est manquant"
[ -f ".env.dev" ] || fail ".env.dev est manquant"
[ -f ".env.prod" ] || fail ".env.prod est manquant"
[ -f ".env.local" ] || fail ".env.local est manquant"
[ -L ".env" ] || fail ".env doit être un lien symbolique vers .env.dev ou .env.prod"

TARGET="$(readlink .env)"

if [ "$TARGET" != ".env.dev" ] && [ "$TARGET" != ".env.prod" ]; then
  fail ".env doit pointer vers .env.dev ou .env.prod"
fi

set -a
source .env
set +a

[ -n "${APP_NAME:-}" ] || fail "APP_NAME est manquant"
[ -n "${APP_SLUG:-}" ] || fail "APP_SLUG est manquant"
[ -n "${APP_DEPOT:-}" ] || fail "APP_DEPOT est manquant"
[ -n "${APP_NO:-}" ] || fail "APP_NO est manquant"
[ -n "${APP_ENV:-}" ] || fail "APP_ENV est manquant"

[ "$APP_ENV" = "dev" ] || [ "$APP_ENV" = "prod" ] || fail "APP_ENV doit être dev ou prod"

EXPECTED_DB_PORT=$((5432 + APP_NO))
EXPECTED_VITE_PORT=$((5173 + APP_NO))
EXPECTED_API_PORT=$((8000 + APP_NO + 1))

if [ "$APP_ENV" = "dev" ]; then
  [ "${DEV_DB_PORT:-}" = "$EXPECTED_DB_PORT" ] || fail "DEV_DB_PORT devrait être $EXPECTED_DB_PORT"
  [ "${DEV_VITE_PORT:-}" = "$EXPECTED_VITE_PORT" ] || fail "DEV_VITE_PORT devrait être $EXPECTED_VITE_PORT"
  [ "${DEV_API_PORT:-}" = "$EXPECTED_API_PORT" ] || fail "DEV_API_PORT devrait être $EXPECTED_API_PORT"
fi

[ "${POSTGRES_USER:-}" = "${APP_SLUG}_pg_user" ] || fail "POSTGRES_USER devrait être ${APP_SLUG}_pg_user"
[ "${POSTGRES_DB:-}" = "${APP_SLUG}_pg_db" ] || fail "POSTGRES_DB devrait être ${APP_SLUG}_pg_db"

[ -f "docker-compose.${APP_ENV}.yml" ] || fail "docker-compose.${APP_ENV}.yml est manquant"

if grep -q "^\.env$" .gitignore 2>/dev/null; then
  true
else
  fail ".gitignore doit ignorer .env"
fi

if grep -q "^\.env.local$" .gitignore 2>/dev/null; then
  true
else
  fail ".gitignore doit ignorer .env.local"
fi

if grep -q "^\.env.template$" .gitignore 2>/dev/null; then
  true
else
  fail ".gitignore doit ignorer .env.template"
fi

echo "OK: invariants valides pour APP_ENV=$APP_ENV"
