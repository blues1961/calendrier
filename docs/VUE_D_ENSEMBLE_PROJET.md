# Vue d'ensemble du projet Calendrier

## 1. Résumé

`Calendrier` est une application de calendrier auto-hébergée construite sur le template applicatif commun.

Fonctionnellement, elle permet :

- la gestion de calendriers personnels ;
- la gestion d'événements ;
- l'import `.ics` ;
- l'authentification JWT ;
- l'exposition d'une API REST consommable par d'autres applications ;
- la fourniture des anniversaires au `Dashboard`.

## 2. Stack technique

### Backend

- Python `3.12`
- Django `5`
- Django REST Framework
- `djangorestframework-simplejwt`
- PostgreSQL
- Gunicorn en production
- WhiteNoise pour les fichiers statiques Django

### Frontend

- React `18`
- Vite `5`
- Axios
- `react-big-calendar`
- `date-fns`

### Infra

- Docker Compose
- Nginx pour servir le build frontend en production
- Traefik comme frontal HTTPS en production

## 3. Structure du dépôt

- `backend/` : application Django, API, modèles, migrations, admin
- `frontend/` : SPA React/Vite
- `docs/` : documentation fonctionnelle et technique
- `scripts/` : scripts standard du template
- `Makefile` : façade des commandes d'exploitation
- `docker-compose.dev.yml` et `docker-compose.prod.yml` : exécution Docker
- `INVARIANTS.md` : contrat technique local

## 4. Convention d'environnement

Le bootstrap du projet suit le flux standard :

```bash
cp .env.template.example .env.template
make init
```

Fichiers utilisés :

- `.env.template.example` : identité minimale du projet, versionnée
- `.env.template` : copie locale non versionnée
- `.env.dev` : configuration non secrète de développement
- `.env.prod` : configuration non secrète de production
- `.env.local` : secrets locaux non versionnés
- `.env` : lien symbolique vers `.env.dev` ou `.env.prod`

Variables d'identité :

- `APP_NAME`
- `APP_SLUG`
- `APP_DEPOT`
- `APP_NO`

## 5. Services et exécution

### Développement

La stack `dev` expose trois services standards :

- `db`
- `backend`
- `frontend`

Flux HTTP :

- UI : `http://localhost:${DEV_VITE_PORT}`
- API : `http://localhost:${DEV_API_PORT}`
- le frontend Vite proxifie `/api`, `/admin` et `/static` vers `backend:8000`

### Production

La stack `prod` expose aussi trois services standards :

- `db`
- `backend`
- `frontend`

Routage Traefik :

- `/api/` vers le backend
- `/admin/` vers le backend
- `/static/` vers le backend
- tout le reste vers le frontend

## 6. Authentification et sécurité

Le backend utilise JWT via `rest_framework_simplejwt`.

Endpoints principaux :

- `POST /api/auth/jwt/create/`
- `POST /api/auth/jwt/refresh/`

Les secrets restent dans `.env.local`, notamment :

- `POSTGRES_PASSWORD`
- `DJANGO_SECRET_KEY`
- `ADMIN_USERNAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## 7. Modèle de données

### Calendar

Champs structurants :

- `owner`
- `name`
- `color`
- `is_default`
- `kind`
- `created_at`

Règles :

- unicité `(owner, name)`
- au plus un calendrier `birthdays` par usager

### Event

Champs structurants :

- `calendar`
- `title`
- `description`
- `start`
- `end`
- `all_day`
- `location`
- `external_uid`
- `created_at`
- `updated_at`

L'API expose aussi un `kind` calculé :

- `event`
- `birthday`

## 8. Contrat anniversaires

`Calendrier` est la source utilisée par `Dashboard` pour les événements à venir et les anniversaires à venir.

Règles métier :

- l'application garantit un calendrier système `Anniversaires` par usager ;
- ce calendrier porte `kind=birthdays` ;
- les anniversaires synchronisés y sont stockés avec une récurrence annuelle ;
- les autres calendriers portent `kind=personal` ;
- l'API des événements doit exposer un `kind` explicite `event` ou `birthday`.

Contrat d'intégration avec `Contacts` :

- `POST /api/integrations/contact-birthdays/sync/`
- pas de session usager ; authentification technique via en-tête `X-Calendar-Sync-Token` ;
- accès réservé aux appels inter-apps signés avec `CALENDAR_SYNC_TOKEN`, avec exactement la même valeur que côté `Contact` ;
- payload attendu :

```json
{
  "owner_username": "sylvain",
  "contact_id": "42",
  "name": "Marie",
  "birthday": "1988-04-12"
}
```

- si `name` est vide ou `birthday` est nul, l'événement anniversaire correspondant est supprimé ;
- l'usager `owner_username` doit exister dans `Calendrier` ;
- l'événement est identifié de façon stable par `external_uid=contact-birthday:<owner_username>:<contact_id>`.

## 9. Commandes d'exploitation

Les commandes standard passent par le `Makefile` :

- `make init`
- `make dev`
- `make prod`
- `make up`
- `make down`
- `make restart`
- `make rebuild`
- `make logs`
- `make ps`
- `make check`
- `make migrate`
- `make update`
- `make backup`
- `make restore`

## 10. Référence des invariants

Le contrat technique local est défini dans `INVARIANTS.md`.

En cas de contradiction entre ancien code et nouveau standard template, le standard template prévaut pour l'infra, les scripts, les fichiers d'environnement et Docker Compose.
