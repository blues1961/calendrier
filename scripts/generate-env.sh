#!/usr/bin/env bash
set -euo pipefail

TEMPLATE=".env.template"

[ -f "$TEMPLATE" ] || {
  echo "ERREUR: .env.template manquant"
  echo "Copiez d'abord .env.template.example :"
  echo "  cp .env.template.example .env.template"
  exit 1
}

load_template() {
  local file="$1"
  local line key value

  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|\#*)
        continue
        ;;
    esac

    key=${line%%=*}
    value=${line#*=}
    key=$(printf '%s' "$key" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')
    value=$(printf '%s' "$value" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')

    if [ -n "$key" ]; then
      printf -v "$key" '%s' "$value"
      export "$key"
    fi
  done < "$file"
}

read_env_value() {
  local file="$1"
  local key="$2"

  if [ ! -f "$file" ]; then
    return
  fi

  sed -n "s/^${key}=//p" "$file" | tail -n 1
}

append_csv_value() {
  local list="${1:-}"
  local value="${2:-}"

  if [ -z "$value" ]; then
    printf '%s' "$list"
    return
  fi

  case ",$list," in
    *,"$value",*)
      printf '%s' "$list"
      ;;
    *)
      if [ -n "$list" ]; then
        printf '%s,%s' "$list" "$value"
      else
        printf '%s' "$value"
      fi
      ;;
  esac
}

ensure_local_key() {
  local key="$1"

  if ! grep -q "^${key}=" .env.local; then
    printf '%s=\n' "$key" >> .env.local
    echo "• .env.local complété avec ${key}"
  fi
}

normalize_app_depot() {
  local depot="$1"

  printf '%s' "$depot" \
    | tr '[:lower:]' '[:upper:]' \
    | sed 's/[^A-Z0-9]/_/g'
}

load_template "$TEMPLATE"

[ -n "${APP_NAME:-}" ] || { echo "APP_NAME manquant"; exit 1; }
[ -n "${APP_SLUG:-}" ] || { echo "APP_SLUG manquant"; exit 1; }
[ -n "${APP_DEPOT:-}" ] || { echo "APP_DEPOT manquant"; exit 1; }
[ -n "${APP_NO:-}" ] || { echo "APP_NO manquant"; exit 1; }

LOCAL_API_TOKEN_KEY="$(normalize_app_depot "$APP_DEPOT")_API_TOKEN"

APP_HOST_TEMPLATE="${APP_HOST:-}"
if [ -z "$APP_HOST_TEMPLATE" ]; then
  APP_HOST_TEMPLATE="${APP_SLUG}.mon-site.ca"
fi

DEV_DB_PORT=$((5432 + APP_NO))
DEV_VITE_PORT=$((5173 + APP_NO))
DEV_API_PORT=$((8000 + APP_NO + 1))

VITE_API_BASE=${VITE_API_BASE:-$(read_env_value .env.dev VITE_API_BASE)}
VITE_API_BASE=${VITE_API_BASE:-$(read_env_value .env.prod VITE_API_BASE)}
VITE_API_BASE=${VITE_API_BASE:-/api}

DEV_DJANGO_DEBUG=${DJANGO_DEBUG:-$(read_env_value .env.dev DJANGO_DEBUG)}
DEV_DJANGO_DEBUG=${DEV_DJANGO_DEBUG:-true}
PROD_DJANGO_DEBUG=false

DEV_DJANGO_ALLOWED_HOSTS=${DJANGO_ALLOWED_HOSTS:-$(read_env_value .env.dev DJANGO_ALLOWED_HOSTS)}
DEV_DJANGO_ALLOWED_HOSTS=${DEV_DJANGO_ALLOWED_HOSTS:-localhost,127.0.0.1}
DEV_DJANGO_ALLOWED_HOSTS=$(append_csv_value "$DEV_DJANGO_ALLOWED_HOSTS" "backend")
DEV_DJANGO_ALLOWED_HOSTS=$(append_csv_value "$DEV_DJANGO_ALLOWED_HOSTS" "frontend")
DEV_DJANGO_ALLOWED_HOSTS=$(append_csv_value "$DEV_DJANGO_ALLOWED_HOSTS" "0.0.0.0")
DEV_DJANGO_ALLOWED_HOSTS=$(append_csv_value "$DEV_DJANGO_ALLOWED_HOSTS" "host.docker.internal")

DEV_CORS_ALLOWED_ORIGINS=${CORS_ALLOWED_ORIGINS:-$(read_env_value .env.dev CORS_ALLOWED_ORIGINS)}
DEV_CORS_ALLOWED_ORIGINS=$(append_csv_value "$DEV_CORS_ALLOWED_ORIGINS" "http://localhost:${DEV_VITE_PORT}")
DEV_CORS_ALLOWED_ORIGINS=$(append_csv_value "$DEV_CORS_ALLOWED_ORIGINS" "http://127.0.0.1:${DEV_VITE_PORT}")

DEV_DJANGO_CSRF_TRUSTED_ORIGINS=${DJANGO_CSRF_TRUSTED_ORIGINS:-$(read_env_value .env.dev DJANGO_CSRF_TRUSTED_ORIGINS)}
DEV_DJANGO_CSRF_TRUSTED_ORIGINS=$(append_csv_value "$DEV_DJANGO_CSRF_TRUSTED_ORIGINS" "http://localhost:${DEV_VITE_PORT}")
DEV_DJANGO_CSRF_TRUSTED_ORIGINS=$(append_csv_value "$DEV_DJANGO_CSRF_TRUSTED_ORIGINS" "http://127.0.0.1:${DEV_VITE_PORT}")

PROD_DJANGO_ALLOWED_HOSTS=${DJANGO_ALLOWED_HOSTS:-$(read_env_value .env.prod DJANGO_ALLOWED_HOSTS)}
PROD_DJANGO_ALLOWED_HOSTS=$(append_csv_value "$PROD_DJANGO_ALLOWED_HOSTS" "$APP_HOST_TEMPLATE")
PROD_DJANGO_ALLOWED_HOSTS=$(append_csv_value "$PROD_DJANGO_ALLOWED_HOSTS" "backend")

PROD_CORS_ALLOWED_ORIGINS=${CORS_ALLOWED_ORIGINS:-$(read_env_value .env.prod CORS_ALLOWED_ORIGINS)}
PROD_CORS_ALLOWED_ORIGINS=$(append_csv_value "$PROD_CORS_ALLOWED_ORIGINS" "https://${APP_HOST_TEMPLATE}")

PROD_DJANGO_CSRF_TRUSTED_ORIGINS=${DJANGO_CSRF_TRUSTED_ORIGINS:-$(read_env_value .env.prod DJANGO_CSRF_TRUSTED_ORIGINS)}
PROD_DJANGO_CSRF_TRUSTED_ORIGINS=$(append_csv_value "$PROD_DJANGO_CSRF_TRUSTED_ORIGINS" "https://${APP_HOST_TEMPLATE}")

DEV_ACCESS_TOKEN_LIFETIME_MIN=${ACCESS_TOKEN_LIFETIME_MIN:-$(read_env_value .env.dev ACCESS_TOKEN_LIFETIME_MIN)}
DEV_ACCESS_TOKEN_LIFETIME_MIN=${DEV_ACCESS_TOKEN_LIFETIME_MIN:-60}
DEV_REFRESH_TOKEN_LIFETIME_DAYS=${REFRESH_TOKEN_LIFETIME_DAYS:-$(read_env_value .env.dev REFRESH_TOKEN_LIFETIME_DAYS)}
DEV_REFRESH_TOKEN_LIFETIME_DAYS=${DEV_REFRESH_TOKEN_LIFETIME_DAYS:-7}

PROD_ACCESS_TOKEN_LIFETIME_MIN=${ACCESS_TOKEN_LIFETIME_MIN:-$(read_env_value .env.prod ACCESS_TOKEN_LIFETIME_MIN)}
PROD_ACCESS_TOKEN_LIFETIME_MIN=${PROD_ACCESS_TOKEN_LIFETIME_MIN:-30}
PROD_REFRESH_TOKEN_LIFETIME_DAYS=${REFRESH_TOKEN_LIFETIME_DAYS:-$(read_env_value .env.prod REFRESH_TOKEN_LIFETIME_DAYS)}
PROD_REFRESH_TOKEN_LIFETIME_DAYS=${PROD_REFRESH_TOKEN_LIFETIME_DAYS:-7}

DEV_VITE_SHOW_ADMIN_LINK=${VITE_SHOW_ADMIN_LINK:-$(read_env_value .env.dev VITE_SHOW_ADMIN_LINK)}
DEV_VITE_SHOW_ADMIN_LINK=${DEV_VITE_SHOW_ADMIN_LINK:-false}
PROD_VITE_SHOW_ADMIN_LINK=${VITE_SHOW_ADMIN_LINK:-$(read_env_value .env.prod VITE_SHOW_ADMIN_LINK)}
PROD_VITE_SHOW_ADMIN_LINK=${PROD_VITE_SHOW_ADMIN_LINK:-false}

DEV_VITE_ADMIN_URL=${VITE_ADMIN_URL:-$(read_env_value .env.dev VITE_ADMIN_URL)}
DEV_VITE_ADMIN_URL=${DEV_VITE_ADMIN_URL:-/admin/}
PROD_VITE_ADMIN_URL=${VITE_ADMIN_URL:-$(read_env_value .env.prod VITE_ADMIN_URL)}
PROD_VITE_ADMIN_URL=${PROD_VITE_ADMIN_URL:-/admin/}

cat > .env.dev <<ENVDEV
APP_ENV=dev

APP_NAME=$APP_NAME
APP_SLUG=$APP_SLUG
APP_DEPOT=$APP_DEPOT
APP_NO=$APP_NO
POSTGRES_USER=${APP_SLUG}_pg_user
POSTGRES_DB=${APP_SLUG}_pg_db

DEV_DB_PORT=$DEV_DB_PORT
DEV_VITE_PORT=$DEV_VITE_PORT
DEV_API_PORT=$DEV_API_PORT

VITE_API_BASE=$VITE_API_BASE
VITE_SHOW_ADMIN_LINK=$DEV_VITE_SHOW_ADMIN_LINK
VITE_ADMIN_URL=$DEV_VITE_ADMIN_URL

DJANGO_DEBUG=$DEV_DJANGO_DEBUG
DJANGO_ALLOWED_HOSTS=$DEV_DJANGO_ALLOWED_HOSTS
DJANGO_CSRF_TRUSTED_ORIGINS=$DEV_DJANGO_CSRF_TRUSTED_ORIGINS
CORS_ALLOWED_ORIGINS=$DEV_CORS_ALLOWED_ORIGINS
ACCESS_TOKEN_LIFETIME_MIN=$DEV_ACCESS_TOKEN_LIFETIME_MIN
REFRESH_TOKEN_LIFETIME_DAYS=$DEV_REFRESH_TOKEN_LIFETIME_DAYS
ENVDEV

echo "✔ .env.dev généré"

cat > .env.prod <<ENVPROD
APP_ENV=prod

APP_NAME=$APP_NAME
APP_SLUG=$APP_SLUG
APP_DEPOT=$APP_DEPOT
APP_NO=$APP_NO
APP_HOST=$APP_HOST_TEMPLATE

POSTGRES_USER=${APP_SLUG}_pg_user
POSTGRES_DB=${APP_SLUG}_pg_db

VITE_API_BASE=$VITE_API_BASE
VITE_SHOW_ADMIN_LINK=$PROD_VITE_SHOW_ADMIN_LINK
VITE_ADMIN_URL=$PROD_VITE_ADMIN_URL

DJANGO_DEBUG=$PROD_DJANGO_DEBUG
DJANGO_ALLOWED_HOSTS=$PROD_DJANGO_ALLOWED_HOSTS
DJANGO_CSRF_TRUSTED_ORIGINS=$PROD_DJANGO_CSRF_TRUSTED_ORIGINS
CORS_ALLOWED_ORIGINS=$PROD_CORS_ALLOWED_ORIGINS
ACCESS_TOKEN_LIFETIME_MIN=$PROD_ACCESS_TOKEN_LIFETIME_MIN
REFRESH_TOKEN_LIFETIME_DAYS=$PROD_REFRESH_TOKEN_LIFETIME_DAYS
ENVPROD

echo "✔ .env.prod généré"

if [ ! -f ".env.local" ]; then
cat > .env.local <<ENVLOCAL
# --- Admin ---
ADMIN_USERNAME=${ADMIN_USERNAME:-}
ADMIN_EMAIL=${ADMIN_EMAIL:-}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-}

# --- Secrets (générés ensuite) ---
POSTGRES_PASSWORD=
DJANGO_SECRET_KEY=
ENVLOCAL

echo "✔ .env.local créé"
else
  echo "• .env.local existe déjà (non modifié)"
fi

ensure_local_key "ADMIN_USERNAME"
ensure_local_key "ADMIN_EMAIL"
ensure_local_key "ADMIN_PASSWORD"
ensure_local_key "POSTGRES_PASSWORD"
ensure_local_key "DJANGO_SECRET_KEY"
ensure_local_key "$LOCAL_API_TOKEN_KEY"

./scripts/generate-secrets.sh

echo "✔ Environnement complet prêt"
