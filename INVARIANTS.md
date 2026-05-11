# INVARIANTS.md

## Rôle

Ce fichier est le contrat technique du projet.

Il définit les règles obligatoires que doivent respecter :

* le code ;
* Docker Compose ;
* les fichiers `.env` ;
* les scripts ;
* la documentation ;
* Codex.

En cas de contradiction, ce fichier prévaut.

---

## 1. Identité du projet

Les variables suivantes doivent être définies dans `.env.dev` et `.env.prod` :

```env
APP_NAME=
APP_SLUG=
APP_DEPOT=
APP_NO=
APP_ENV=
```

Règles :

* `APP_NAME` = nom lisible de l’application ;
* `APP_SLUG` = identifiant technique court ;
* `APP_DEPOT` = nom du dépôt Git et du dossier projet ;
* `APP_NO` = numéro unique utilisé pour dériver les ports ;
* `APP_ENV` = `dev` ou `prod`.

---

## 2. Fichiers d’environnement

Structure obligatoire :

```text
.env.template.example
.env.template
.env.dev
.env.prod
.env.local
.env
```

Règles :

* `.env.template.example` est versionné ;
* `.env.template` est local et n’est jamais versionné ;
* `.env.dev` est versionné ;
* `.env.prod` est versionné ;
* `.env.local` n’est jamais versionné ;
* `.env` n’est jamais versionné ;
* `.env` doit être un lien symbolique vers `.env.dev` ou `.env.prod` ;
* `.env` ne doit jamais être modifié directement.

Le contenu canonique de `.env.template.example` est :

```env
APP_NAME=
APP_SLUG=
APP_DEPOT=
APP_NO=
ADMIN_USERNAME=
ADMIN_PASSWORD=
ADMIN_EMAIL=
```

`ADMIN_USERNAME`, `ADMIN_PASSWORD` et `ADMIN_EMAIL` servent au bootstrap initial puis doivent se retrouver dans `.env.local`.

---

## 3. Secrets

Les secrets doivent être définis uniquement dans `.env.local`.

Exemples :

```env
POSTGRES_PASSWORD=
DJANGO_SECRET_KEY=
ADMIN_USERNAME=
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

Interdit :

* secret dans `.env.dev` ;
* secret dans `.env.prod` ;
* secret dans Git ;
* secret dans README, AGENTS.md ou CODEX_START.md.

---

## 4. PostgreSQL

Convention obligatoire :

```env
POSTGRES_USER=${APP_SLUG}_pg_user
POSTGRES_DB=${APP_SLUG}_pg_db
```

`POSTGRES_PASSWORD` doit rester dans `.env.local`.

---

## 5. Ports de développement

Les ports de développement sont dérivés de `APP_NO`.

Aucun port ne doit être choisi arbitrairement.

```text
DEV_DB_PORT   = 5432 + APP_NO
DEV_VITE_PORT = 5173 + APP_NO
DEV_API_PORT  = 8000 + (APP_NO + 1)
```

Exemple avec `APP_NO=2` :

```env
DEV_DB_PORT=5434
DEV_VITE_PORT=5175
DEV_API_PORT=8003
```

---

## 6. Docker Compose

Fichiers obligatoires :

```text
docker-compose.dev.yml
docker-compose.prod.yml
```

Services standards :

```text
db
backend
frontend
```

Les noms de services ne doivent pas être modifiés sans justification explicite.

---

## 7. Noms de conteneurs

Convention :

```text
${APP_SLUG}_${SERVICE}_${APP_ENV}
```

Exemples :

```text
cal_db_dev
cal_backend_dev
cal_frontend_dev
```

---

## 8. Scripts obligatoires

Le dossier `scripts/` doit contenir exactement les 15 scripts standards du template applicatif :

```text
scripts/
├── backup-db.sh
├── check-invariants.sh
├── down.sh
├── env-switch.sh
├── generate-env.sh
├── generate-secrets.sh
├── init.sh
├── logs.sh
├── migrate.sh
├── ps.sh
├── rebuild.sh
├── restart.sh
├── restore-db.sh
├── up.sh
└── update.sh
```

Aucun script standard du template ne doit manquer ou être remplacé par une variante parallèle.
Le changement d’environnement doit se faire avec :

```bash
./scripts/env-switch.sh dev
./scripts/env-switch.sh prod
```

`init.sh` ne doit jamais modifier ce lien. Il doit utiliser l’environnement déjà pointé par `.env`, fonctionner aussi bien en `dev` qu’en `prod`, et pouvoir être relancé sans écraser les conteneurs déjà actifs.

## 9. Commandes Docker

Les commandes Docker Compose doivent passer par les scripts standards.

Commande de référence :

```bash
docker compose \
  --env-file .env \
  --env-file .env.local \
  -f docker-compose.${APP_ENV}.yml up
```

---

## 10. Frontend

Variable obligatoire :

```env
VITE_API_BASE=/api
```

Règles :

* pas d’URL backend absolue dans le code frontend ;
* pas de `localhost` codé dans le frontend ;
* le frontend appelle l’API via `/api`.

---

## 11. Backend

Règles :

* toutes les routes API doivent être sous `/api/` ;
* les routes privées doivent utiliser JWT ;
* le backend écoute dans le conteneur sur le port `8000` ;
* les données privées doivent être isolées par utilisateur.

---

## 12. Production

Règles :

* Traefik assure le routage public ;
* HTTPS est obligatoire ;
* les conteneurs applicatifs utilisent le réseau Docker externe `edge` ;
* `/api/` route vers le backend ;
* le frontend est servi par le service `frontend` ;
* aucun port applicatif ne doit être exposé publiquement sans justification.

---

## 13. Contrat anniversaires

* `Calendrier` est la source du dashboard pour les événements à venir et les anniversaires à venir.
* L’application garantit un calendrier système `Anniversaires` par usager.
* Ce calendrier porte `kind=birthdays`.
* Un anniversaire synchronisé doit rester visible d’une année à l’autre via une récurrence annuelle réelle.
* Les autres calendriers portent `kind=personal`.
* L’API des événements doit exposer un `kind` explicite :

  * `event`
  * `birthday`
