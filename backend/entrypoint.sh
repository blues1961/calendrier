#!/usr/bin/env bash
set -euo pipefail

wait_for_migrations() {
  local attempts=0

  until python manage.py migrate --noinput; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 20 ]; then
      echo "ERREUR: impossible d'appliquer les migrations."
      exit 1
    fi
    echo "Base de données indisponible, nouvelle tentative..."
    sleep 2
  done
}

wait_for_migrations
python manage.py ensure_admin

if [ "${APP_ENV:-dev}" = "prod" ]; then
  python manage.py collectstatic --noinput
fi

exec "$@"
