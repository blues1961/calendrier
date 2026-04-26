# Vue d'ensemble du projet Calendrier

## 1. Résumé

`Calendrier` est une application web de calendrier auto-hébergée, organisée en architecture séparée `frontend` / `backend`, avec une base PostgreSQL et une orchestration Docker Compose.

L'objectif fonctionnel est proche d'un calendrier personnel ou partagé de type Google Calendar :

- gestion de calendriers ;
- gestion d'événements ;
- interface web SPA ;
- administration Django ;
- API REST sécurisée par JWT.

Le projet est conçu pour fonctionner en `dev` et en `prod` avec les mêmes invariants d'architecture.

## 2. Stack technique

### Backend

- Python `3.12` via image `python:3.12-slim`
- Django `5.x`
- Django REST Framework
- `djangorestframework-simplejwt` pour l'authentification JWT
- `psycopg` pour PostgreSQL
- `gunicorn` en production
- `whitenoise` pour servir les fichiers statiques Django

### Frontend

- React `18`
- Vite `5`
- Axios pour les appels API
- `react-big-calendar` pour l'affichage du calendrier
- `date-fns` pour la gestion des dates
- `jwt-decode` présent dans les dépendances

### Base de données

- PostgreSQL `16`

### Infra / Exécution

- Docker Compose pour l'orchestration
- Traefik en frontal HTTPS en production
- Nginx pour servir le build frontend en production

## 3. Organisation du dépôt

- `backend/` : projet Django, API REST, modèles, sérialiseurs, vues, migrations
- `frontend/` : application React/Vite
- `docs/` : documentation et invariants d'architecture
- `scripts/` : scripts d'exploitation communs, dev et prod
- `.github/workflows/` : CI GitHub Actions
- `Makefile` : point d'entrée principal pour les commandes d'exploitation

## 4. Environnements

Le projet repose sur une convention d'environnement simple :

- `.env.dev` : variables non sensibles de développement
- `.env.prod` : variables non sensibles de production
- `.env.local` : secrets locaux non versionnés
- `.env` : symlink vers `.env.dev` ou `.env.prod`

Variables structurantes importantes :

- `APP_ENV` : `dev` ou `prod`
- `APP_SLUG` : préfixe de nommage Docker et infra
- `APP_NAME` : nom humain de l'application
- `APP_HOST` : hostname principal
- `DEV_DB_PORT`, `DEV_API_PORT`, `DEV_VITE_PORT` : ports d'exposition en développement
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` : configuration base
- `DJANGO_SECRET_KEY` : secret Django
- `VITE_API_BASE` : base relative de l'API côté frontend, fixée à `/api`

Secrets attendus dans `.env.local` :

- `POSTGRES_PASSWORD`
- `DJANGO_SECRET_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_EMAIL`

## 5. Architecture applicative

### En développement

La stack Docker Compose `dev` contient trois services :

- `db` : PostgreSQL
- `backend` : Django lancé via `runserver`
- `vite` : serveur de dev Vite avec proxy vers le backend

Flux HTTP en dev :

- UI : `http://localhost:${DEV_VITE_PORT}`
- API : `http://localhost:${DEV_API_PORT}`
- Vite proxifie `/api`, `/admin` et `/static` vers `http://backend:8000`

### En production

La stack Docker Compose `prod` contient trois services :

- `db` : PostgreSQL
- `backend` : Django + migrations + `collectstatic` + Gunicorn
- `frontend` : build Vite servi par Nginx

Traefik route :

- `/api/` vers le backend
- `/admin/` vers le backend
- `/static/` vers le backend / WhiteNoise
- tout le reste vers le frontend

La production est pensée en HTTPS avec redirection HTTP vers HTTPS.

## 6. Authentification et sécurité

### Méthode d'authentification

Le backend utilise `JWTAuthentication` comme mécanisme par défaut dans Django REST Framework.

Endpoints principaux :

- `POST /api/auth/jwt/create/`
- `POST /api/auth/jwt/refresh/`

Configuration JWT :

- durée du token d'accès : `ACCESS_TOKEN_LIFETIME_MIN`, par défaut 60 minutes
- durée du token de refresh : `REFRESH_TOKEN_LIFETIME_DAYS`, par défaut 7 jours

### Côté frontend

Le frontend :

- stocke `access` et `refresh` dans `localStorage`
- injecte automatiquement le header `Authorization: Bearer <token>`
- tente un refresh automatique si une requête retourne `401`

### Isolation des données

L'API filtre les données par utilisateur authentifié :

- un `Calendar` appartient à un `owner`
- un `Event` appartient à un `Calendar`
- les viewsets ne retournent que les objets liés à `request.user`

### Sécurité web

Le projet prévoit :

- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `SECURE_SSL_REDIRECT`
- `SESSION_COOKIE_SECURE`
- `CSRF_COOKIE_SECURE`
- HSTS en production

## 7. Modèle de données

### Calendar

Champs principaux :

- `owner`
- `name`
- `color`
- `is_default`
- `created_at`

Contraintes :

- unicité `(owner, name)`

### Event

Champs principaux :

- `calendar`
- `title`
- `description`
- `start`
- `end`
- `all_day`
- `location`
- `created_at`
- `updated_at`

## 8. Gestion des versions

La gestion des versions existe à plusieurs niveaux.

### Version du code

- gestion de source avec Git
- branche observée dans le dépôt : `main`
- tag observé : `v0.1.0-login-ok`

Le frontend déclare actuellement une version applicative `0.0.1` dans `frontend/package.json`.

### Version du schéma

Le schéma de base est versionné via les migrations Django dans `backend/calendar_api/migrations/`.

### Version des images

Les workflows GitHub Actions publient des images Docker backend et frontend sur GHCR avec :

- le tag `latest`
- un tag basé sur le SHA Git

Cela permet de distinguer :

- la version logique du code Git ;
- la version déployable des images Docker ;
- la version du schéma via migrations.

## 9. CI/CD et automatisation

Le dépôt contient trois workflows GitHub Actions :

- `backend.yml` : build/push image backend
- `frontend.yml` : build/push image frontend
- `smoke.yml` : workflow manuel minimal

Le `Makefile` centralise les commandes les plus utiles :

- `make up`, `down`, `restart`, `logs`, `ps`
- `make migrate`
- `make createsuperuser`
- `make backup-db`, `restore-db`
- `make pull-prod-backup`, `refresh-dev-from-prod`
- `make seed-dev`, `reset-dev-db`

Des scripts shell complètent l'exploitation dans :

- `scripts/common/`
- `scripts/dev/`
- `scripts/prod/`

## 10. Convention de déploiement

Le projet suit des invariants documentés dans `docs/INVARIANTS.md` :

- services Compose fixes : `db`, `backend`, `vite`, `frontend`
- nommage Docker basé sur `${APP_SLUG}` et `${APP_ENV}`
- base API frontend toujours relative : `/api`
- secrets exclus des fichiers versionnés
- Traefik comme frontal unique en production

## 11. Points d'attention

- Le dépôt est structuré pour une exploitation Docker-first ; l'exécution hors conteneurs n'est pas le chemin principal.
- La configuration dev/prod est cohérente et homogène, ce qui facilite les déploiements.
- Le versionnement applicatif n'est pas encore formalisé comme une release sémantique complète côté produit ; il s'appuie surtout sur Git, les tags et les images GHCR.
- La documentation d'architecture est déjà bien cadrée par `docs/INVARIANTS.md`, ce qui constitue le contrat technique principal du projet.

## 12. Synthèse

Ce projet repose sur une base moderne et pragmatique :

- SPA React/Vite ;
- API Django REST ;
- authentification JWT ;
- PostgreSQL ;
- Docker Compose en dev et prod ;
- Traefik + Nginx en production ;
- Git + GitHub Actions + GHCR pour la livraison.

L'ensemble est cohérent pour un projet auto-hébergé simple à maintenir, avec une séparation nette entre code, secrets, environnements et exploitation.
