#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="./backup"

./scripts/check-invariants.sh >/dev/null

set -a
source .env
if [ -f ".env.local" ]; then
  source .env.local
fi
set +a

if [ $# -eq 1 ]; then
  BACKUP_FILE="$1"
else
  echo "→ Aucun fichier spécifié"
  echo "→ Recherche du backup le plus récent..."

  BACKUP_FILE="$(ls -1t ${BACKUP_DIR}/*.sql.gz 2>/dev/null | head -n 1 || true)"

  if [ -z "${BACKUP_FILE}" ]; then
    echo "Erreur : aucun fichier de backup trouvé dans ${BACKUP_DIR}"
    exit 1
  fi
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Erreur : fichier introuvable : $BACKUP_FILE"
  exit 1
fi

echo ""
echo "⚠ Backup sélectionné :"
echo "  $BACKUP_FILE"
echo ""
echo "⚠ Cette opération remplacera les données actuelles."
echo ""

read -r -p "Continuer ? [y/N] " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "Restauration annulée."
  exit 0
fi

echo "→ Restauration en cours..."
echo "→ Réinitialisation du schéma public..."

docker compose \
  --env-file .env \
  --env-file .env.local \
  -f "docker-compose.${APP_ENV:-dev}.yml" \
  exec -T db \
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" "$POSTGRES_DB" <<SQL
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public AUTHORIZATION "$POSTGRES_USER";
GRANT ALL ON SCHEMA public TO "$POSTGRES_USER";
GRANT ALL ON SCHEMA public TO PUBLIC;
SQL

echo "→ Import du backup..."

gunzip -c "$BACKUP_FILE" | docker compose \
  --env-file .env \
  --env-file .env.local \
  -f "docker-compose.${APP_ENV:-dev}.yml" \
  exec -T db \
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" "$POSTGRES_DB"

echo "✔ Restauration terminée."
