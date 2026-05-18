#!/usr/bin/env bash
set -euo pipefail

python manage.py ensure_admin

if [ "${APP_ENV:-dev}" = "prod" ]; then
  python manage.py collectstatic --noinput
fi

exec "$@"
