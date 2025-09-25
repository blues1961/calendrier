#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

. "$SCRIPT_DIR/../common/lib.sh"

source_dotenv() {
  local dotenv="$1"
  [ -f "$dotenv" ] || return 0
  set -a
  . "$dotenv"
  set +a
}

[ "$(detect_env)" = "dev" ] || { echo "Refusé: script DEV seulement."; exit 2; }

source_dotenv "$REPO_ROOT/.env.prod"
source_dotenv "$REPO_ROOT/.env.prod.local"

PROD_SSH_HOST="${PROD_SSH_HOST:-${APP_HOST:-}}"

PROD_DB_HOST="${PROD_DB_HOST:-${POSTGRES_HOST:-}}"
PROD_DB_PORT="${PROD_DB_PORT:-${POSTGRES_PORT:-}}"
PROD_DB_NAME="${PROD_DB_NAME:-${POSTGRES_DB:-}}"
PROD_DB_USER="${PROD_DB_USER:-${POSTGRES_USER:-}}"
PROD_DB_PASSWORD="${PROD_DB_PASSWORD:-${POSTGRES_PASSWORD:-}}"



# Defaults (modifiables via l'env)
PROD_SSH_HOST="${PROD_SSH_HOST:-sylvain@cal.mon-site.ca}"
PROD_DIR="${PROD_DIR:-/opt/apps/cal}"
PROD_COMPOSE_FILE="${PROD_COMPOSE_FILE:-docker-compose.prod.yml}"
PROD_ENV_FILE="${PROD_ENV_FILE:-.env.prod}"
DB_SERVICE="${DB_SERVICE:-db}"
PROD_DB_NAME="${PROD_DB_NAME:-cal_pg_db}"
PROD_DB_USER="${PROD_DB_USER:-cal_pg_user}"

unset POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD POSTGRES_HOST POSTGRES_PORT

source_dotenv "$REPO_ROOT/.env.dev"
source_dotenv "$REPO_ROOT/.env.dev.local"

: "${PROD_SSH_HOST:?}"
: "${PROD_DB_HOST:?}"
: "${PROD_DB_PORT:?}"
: "${PROD_DB_NAME:?}"
: "${PROD_DB_USER:?}"
: "${PROD_DB_PASSWORD:?}"
: "${POSTGRES_DB:?}"
: "${POSTGRES_USER:?}"

BACKUP_DIR="${BACKUP_DIR:-backups}"
mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/${APP_SLUG}_${PROD_DB_NAME}_${TS}.sql.gz"

echo ">> PROD → DEV dump: ${PROD_DB_USER}@${PROD_DB_HOST}:${PROD_DB_PORT}/${PROD_DB_NAME}"
if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "[DRY_RUN] ssh ${PROD_SSH_HOST} 'PGPASSWORD=**** pg_dump -h ${PROD_DB_HOST} -p ${PROD_DB_PORT} -U ${PROD_DB_USER} -d ${PROD_DB_NAME} -Fp' | gzip > ${FILE}"
  exit 0
fi

ssh -o BatchMode=yes "$PROD_SSH_HOST" \
  "cd '$PROD_DIR' && \
   LC_ALL=C LANG=C docker compose --env-file '$PROD_ENV_FILE' -f '$PROD_COMPOSE_FILE' \
     exec -T '$DB_SERVICE' pg_dump -U '$PROD_DB_USER' -d '$PROD_DB_NAME' -Fp" \
| gzip > "$FILE"


echo ">> Fichier reçu: ${FILE}"
echo ">> RESET schéma local + restore dans ${POSTGRES_DB}"

compose stop backend >/dev/null 2>&1 || true
compose exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public AUTHORIZATION \"${POSTGRES_USER}\";"
gunzip -c "${FILE}" | compose exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"

compose up -d backend
compose exec -T backend bash -lc "python manage.py migrate"
echo "OK."
