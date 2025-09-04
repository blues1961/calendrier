#!/usr/bin/env bash
set -euo pipefail
. "$(dirname "$0")/../common/lib.sh"
[ "$(detect_env)" = "dev" ] || { echo "Refusé: script DEV seulement."; exit 2; }
load_env
echo ">> Seed DEV (si commande existe)"
compose exec -T backend bash -lc "python - <<'PY'
import sys, subprocess
from django.core.management import call_command
try:
    call_command('seed_dev')  # si tu as une mgmt command
    print('seed_dev exécuté')
except Exception as e:
    print('seed_dev indisponible, rien à faire:', e)
PY"
echo "OK."
