#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "$0")/../common/lib.sh"
[ "$(detect_env)" = "dev" ] || { echo "Refusé: script DEV seulement."; exit 2; }
load_env

echo ">> Ensure DB exists: ${POSTGRES_DB}"
# crée la DB si absente
compose exec -T db psql -U "${POSTGRES_USER}" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='${POSTGRES_DB}'" | grep -q 1 \
  || compose exec -T db psql -U "${POSTGRES_USER}" -d postgres -c "CREATE DATABASE \"${POSTGRES_DB}\" OWNER \"${POSTGRES_USER}\";"

echo ">> Stop backend"
compose stop backend >/dev/null 2>&1 || true

echo ">> Reset schema ${POSTGRES_DB}"
compose exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public AUTHORIZATION \"${POSTGRES_USER}\";"

echo ">> Drop stray types (if any)"
# cas CAL: type composite déjà présent
compose exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "DROP TYPE IF EXISTS calendar_api_calendar CASCADE;" || true

echo ">> Migrate (one-shot container)"
compose run --rm backend bash -lc "python manage.py migrate"

echo ">> Start backend"
compose up -d backend

echo "OK."

