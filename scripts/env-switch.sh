#!/usr/bin/env bash
set -euo pipefail

ENV="${1:-}"

if [ "$ENV" = "dev" ]; then
  ln -sf .env.dev .env
elif [ "$ENV" = "prod" ]; then
  ln -sf .env.prod .env
else
  echo "Usage: ./scripts/env-switch.sh [dev|prod]"
  exit 1
fi

echo ".env -> .env.$ENV"
