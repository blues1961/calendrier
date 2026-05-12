# Calendrier — README_DEV

Application basée sur les invariants standards du template applicatif.

Ce fichier décrit le démarrage local en développement.

---

## Démarrage rapide

Depuis la racine du projet :

```bash
make init
```

Le `Makefile` est la méthode recommandée pour les commandes courantes. Il délègue aux scripts standards du projet, qui restent la source de vérité.

`make init` appelle :

```bash
./scripts/init.sh
```

Ce script lit `.env.template`, respecte le lien `.env` déjà en place, génère ou complète les fichiers d’environnement, valide les invariants et ne démarre les services que si nécessaire.

---

## Commandes courantes

### Aide

```bash
make help
```

### Démarrer les services

```bash
make up
```

### Voir l’état des services

```bash
make ps
```

### Voir les logs

```bash
make logs
```

Ou pour un service précis :

```bash
make logs SERVICE=backend
make logs SERVICE=frontend
make logs SERVICE=db
```

### Redémarrer

```bash
make restart
```

### Reconstruire les images

```bash
make rebuild
```

Ou pour un service précis :

```bash
make rebuild SERVICE=backend
make rebuild SERVICE=frontend
```

Important :

* `make rebuild` reconstruit les images mais ne redémarre pas à lui seul les conteneurs ;
* après un rebuild, utiliser `make up` pour relancer les services avec les nouvelles images ;
* si le backend change, exécuter ensuite `make migrate`.

### Appliquer les migrations

```bash
make migrate
```

Cette cible exécute `python manage.py migrate` dans le service `backend` de l’environnement actif.

### Backup PostgreSQL

```bash
make backup
```

Le backup est écrit dans `./backup/` avec un nom de la forme :

```text
__APP_SLUG___db-YYYYMMDD_HHMMSS.sql.gz
```

### Restaurer un backup PostgreSQL

```bash
make restore
make restore FILE=./backup/__APP_SLUG___db-YYYYMMDD_HHMMSS.sql.gz
```

Comportement :

* le backup le plus récent est utilisé si `FILE` n’est pas fourni ;
* une confirmation interactive est demandée ;
* le schéma `public` est recréé avant import ;
* la restauration remplace les données actuelles de la base active ;
* la commande s’arrête au premier incident PostgreSQL.

### Mise à jour standard de l’application

```bash
make update
```

Séquence exécutée :

1. `make backup`
2. `git pull --ff-only`
3. `make check`
4. `make rebuild`
5. `make up`
6. `make migrate`
7. `make ps`

Prérequis :

* `.env` doit pointer vers le bon environnement avant `make init` ;
* l’arbre Git local doit permettre `git pull --ff-only` ;
* Docker et les services requis doivent être disponibles.

### Arrêter

```bash
make down
```

---

## Environnements

Le projet utilise :

```text
.env.dev
.env.prod
.env.local
.env
```

Rôle des fichiers :

```text
.env.dev      Variables non secrètes pour le développement
.env.prod     Variables non secrètes pour la production
.env.local    Secrets locaux non versionnés
.env          Lien symbolique vers .env.dev ou .env.prod
```

Le fichier `.env.local` ne doit jamais être commité.

---

## Changer d’environnement

### Développement

```bash
make dev
```

### Production

```bash
make prod
```

Le lien symbolique `.env` détermine l’environnement actif utilisé par :

```bash
make up
make rebuild
make migrate
make backup
make restore
make update
```

---

## Génération des environnements

Normalement, cette étape est faite automatiquement par :

```bash
make init
```

En cas de besoin :

```bash
cp .env.template.example .env.template
```

Puis remplir les variables du projet dans `.env.template` :

```bash
APP_NAME=
APP_SLUG=
APP_DEPOT=
APP_NO=
ADMIN_USERNAME=
ADMIN_PASSWORD=
ADMIN_EMAIL=
```

Puis choisir l’environnement actif :

```bash
make dev
# ou
make prod
```

Ensuite :

```bash
./scripts/generate-env.sh
```

`./scripts/generate-env.sh` lit l’identité du projet et les variables `ADMIN_*` de bootstrap depuis `.env.template`, puis régénère `.env.dev` et `.env.prod` et y recalcule notamment :

* `POSTGRES_USER` et `POSTGRES_DB` à partir de `APP_SLUG` ;
* `DEV_DB_PORT`, `DEV_VITE_PORT` et `DEV_API_PORT` à partir de `APP_NO` ;
* `DJANGO_ALLOWED_HOSTS` et `DJANGO_CSRF_TRUSTED_ORIGINS` pour les environnements dev et prod ;
* `VITE_API_BASE` ainsi que les variables de stack non secrètes du template.

Le script crée aussi `.env.local` si nécessaire et ajoute sans écraser les clés manquantes suivantes :

* `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
* `POSTGRES_PASSWORD`, `DJANGO_SECRET_KEY`
* `CALENDRIER_API_TOKEN`

Les secrets sont générés par :

```bash
./scripts/generate-secrets.sh
```

---

## Validation

Pour vérifier que le projet respecte les invariants :

```bash
make check
```
