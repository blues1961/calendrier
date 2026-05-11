#!/usr/bin/env bash
set -euo pipefail

ENV_LOCAL=".env.local"

if [ ! -f ".env.template" ]; then
  echo "ERREUR: .env.template est absent."
  echo "Copiez d'abord .env.template.example :"
  echo "  cp .env.template.example .env.template"
  echo "Puis modifiez APP_NAME, APP_SLUG, APP_DEPOT et APP_NO."
  exit 1
fi

if [ ! -f "$ENV_LOCAL" ]; then
  echo "Erreur: .env.local introuvable."
  echo "Créer d'abord le fichier avec :"
  echo "  ./scripts/generate-env.sh"
  exit 1
fi

generate_secret() {
  openssl rand -base64 48 | tr -d '\n'
}

set_value_if_empty() {
  local key="$1"
  local value="$2"

  if grep -q "^${key}=$" "$ENV_LOCAL"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_LOCAL"
  elif ! grep -q "^${key}=" "$ENV_LOCAL"; then
    echo "${key}=${value}" >> "$ENV_LOCAL"
  fi
}

set_value_if_empty "POSTGRES_PASSWORD" "$(generate_secret)"
set_value_if_empty "DJANGO_SECRET_KEY" "$(generate_secret)"

echo "Secrets générés dans .env.local"
echo "Vérifie ensuite ADMIN_USERNAME, ADMIN_EMAIL et ADMIN_PASSWORD."
