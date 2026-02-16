# DEV standard (cal)

## Démarrer
make init-dev             # symlink .env -> .env.dev + .env.local depuis Linode
set -a; . .env.dev; [ -f .env.local ] && . .env.local; set +a
docker compose -f docker-compose.dev.yml up -d --build

## Commandes utiles
./scripts/common/ps.sh
SVC=backend ./scripts/common/restart.sh
./scripts/common/logs.sh
./scripts/common/psql.sh

## Superuser (variables dans .env.local)
ADMIN_USERNAME=…  ADMIN_PASSWORD=…  ADMIN_EMAIL=…
./scripts/dev/superuser.sh

## URLs (DEV)
UI: http://localhost:5175
API: http://localhost:8004
Admin: http://localhost:8004/admin/
