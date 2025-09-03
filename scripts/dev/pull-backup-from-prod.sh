#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "$0")/../common/lib.sh"
[ "$(detect_env)" = "dev" ] || { echo "Refusé: script DEV seulement."; exit 2; }
load_env

: "${PROD_SSH_HOST:?}"
: "${PROD_DB_HOST:?}"
: "${PROD_DB_PORT:?}"
: "${PROD_DB_NAME:?}"
: "${PROD_DB_USER:?}"
: "${PROD_DB_PASSWORD:?}"

BACKUP_DIR="${BACKUP_DIR:-backups/dev}"
mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/${APP_SLUG}_${PROD_DB_NAME}_${TS}.sql.gz"

echo ">> PROD → DEV dump: ${PROD_DB_USER}@${PROD_DB_HOST}:${PROD_DB_PORT}/${PROD_DB_NAME}"
if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "[DRY_RUN] ssh ${PROD_SSH_HOST} 'PGPASSWORD=**** pg_dump -h ${PROD_DB_HOST} -p ${PROD_DB_PORT} -U ${PROD_DB_USER} -d ${PROD_DB_NAME} -Fc' | gzip > ${FILE}"
  exit 0
fi

ssh -o BatchMode=yes "${PROD_SSH_HOST}" \
  "PGPASSWORD='${PROD_DB_PASSWORD}' pg_dump -h '${PROD_DB_HOST}' -p '${PROD_DB_PORT}' -U '${PROD_DB_USER}' -d '${PROD_DB_NAME}' -Fp" \
  | gzip > "${FILE}"

echo ">> Fichier reçu: ${FILE}"
echo ">> RESET schéma local + restore dans ${POSTGRES_DB}"

compose stop backend >/dev/null 2>&1 || true
compose exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public AUTHORIZATION \"${POSTGRES_USER}\";"
gunzip -c "${FILE}" | compose exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"

compose up -d backend
compose exec -T backend bash -lc "python manage.py migrate"
echo "OK."
