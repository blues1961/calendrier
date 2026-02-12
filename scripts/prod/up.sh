#!/usr/bin/env bash
set -euo pipefail
set -a; . .env.prod; [ -f .env.local ] && . .env.local; set +a
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
