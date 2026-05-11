#!/usr/bin/env bash
set -euo pipefail

log()  { echo -e "\033[1;34m→ $1\033[0m"; }
ok()   { echo -e "\033[1;32m✔ $1\033[0m"; }
err()  { echo -e "\033[1;31m✖ $1\033[0m"; exit 1; }

[ -f ".env.template" ] || err ".env.template introuvable. Copie d'abord .env.template.example vers .env.template"

TARGET_ENV="${1:-dev}"

if [ "$TARGET_ENV" != "dev" ] && [ "$TARGET_ENV" != "prod" ]; then
  err "Usage: ./scripts/init.sh [dev|prod]"
fi

log "Génération des fichiers d'environnement"
./scripts/generate-env.sh
ok ".env.dev et .env.prod générés"

log "Activation de l'environnement ${TARGET_ENV}"
./scripts/env-switch.sh "$TARGET_ENV"
ok ".env -> .env.${TARGET_ENV}"

log "Vérification des invariants"
./scripts/check-invariants.sh
ok "Invariants validés"

log "Démarrage des conteneurs"
./scripts/up.sh

log "Statut des conteneurs"
./scripts/ps.sh

ok "Initialisation terminée"
