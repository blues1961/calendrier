#!/usr/bin/env bash
set -euo pipefail

./scripts/check-invariants.sh

set -a
source .env
set +a

if [ $# -gt 0 ] && [ -n "${1:-}" ]; then
  docker compose \
    --env-file .env \
    --env-file .env.local \
    -f "docker-compose.${APP_ENV}.yml" \
    logs -f "$1"
else
  docker compose \
    --env-file .env \
    --env-file .env.local \
    -f "docker-compose.${APP_ENV}.yml" \
    logs -f
fi
