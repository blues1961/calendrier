#!/usr/bin/env bash
set -euo pipefail

# charge nos helpers + env
. "$(dirname "$0")/../common/lib.sh"
[ "$(detect_env)" = "dev" ] || { echo "Refusé: script DEV seulement."; exit 2; }
load_env

: "${ADMIN_USERNAME:?ADMIN_USERNAME manquant dans .env.local}"
: "${ADMIN_PASSWORD:?ADMIN_PASSWORD manquant dans .env.local}"
: "${ADMIN_EMAIL:?ADMIN_EMAIL manquant dans .env.local}"

# passe les ADMIN_* au conteneur et crée/MAJ le superuser via manage.py shell
compose exec -T \
  -e ADMIN_USERNAME="$ADMIN_USERNAME" \
  -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  -e ADMIN_EMAIL="$ADMIN_EMAIL" \
  backend bash -lc "python manage.py shell <<'PY'
import os
from django.contrib.auth import get_user_model
U=get_user_model()
uname=os.getenv('ADMIN_USERNAME')
pwd=os.getenv('ADMIN_PASSWORD')
email=os.getenv('ADMIN_EMAIL')
field=getattr(U,'USERNAME_FIELD','username')
obj,created=U._default_manager.get_or_create(**{field:uname})
obj.is_staff=True; obj.is_superuser=True
if hasattr(obj,'email') and not getattr(obj,'email',None): obj.email=email
obj.set_password(pwd); obj.save()
print('superuser', ('created' if created else 'updated'), f'{field}={uname}')
PY"
