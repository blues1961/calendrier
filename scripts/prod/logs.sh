#!/usr/bin/env bash
set -euo pipefail
SVC="${SVC:-backend}"
docker compose -f docker-compose.prod.yml logs -f "$SVC"
