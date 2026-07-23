# Spécification — calendrier

<!--
Document généré en aperçu par project-assistant.
Le contenu est dérivé de l’état actuel du dépôt.
Toute exigence métier non détectable dans le code doit être validée manuellement.
-->

## Objectifs

`calendrier` est une application auto-hébergée dont l’architecture détectée sépare l’interface, la logique applicative et la persistance.

Cette spécification décrit uniquement les capacités et contraintes observables dans le dépôt.

## Portée

La portée technique détectée comprend :

- une interface utilisateur React;
- un backend Django;
- une persistance PostgreSQL;
- une orchestration Docker Compose;
- une exposition de production par Traefik.
- une API contenant `16` route(s) détectée(s).

Les fonctionnalités métier précises doivent être complétées à partir des vues, modèles et parcours utilisateur propres au projet.

## Exigences fonctionnelles

Les domaines fonctionnels suivants sont exposés dans les routes détectées :

- `admin`
- `api`
- `auth`
- `calendars`
- `contact-integrations`
- `events`
- `health`
- `integrations`
- `racine`
- `token`

Exigences générales observables :

- l’utilisateur doit pouvoir accéder à une interface web;
- le backend doit appliquer la logique métier et valider les requêtes;
- les échanges entre le frontend et le backend doivent passer par les routes API détectées;
- les données persistantes doivent être stockées dans PostgreSQL.

## Exigences techniques

- Langages : `CSS`, `HTML`, `JSON`, `JavaScript`, `Markdown`, `Python`, `Shell`, `YAML`.
- Frameworks : `Django`, `React`, `Vite`.
- Technologies : `Django`, `Docker Compose`, `PostgreSQL`, `React`, `Traefik`, `Vite`.
- Services frontend : `frontend`.
- Services backend : `backend`.
- Services de données : `db`.
- Fichiers Compose : `docker-compose.dev.yml`, `docker-compose.prod.yml`.
- Environnements détectés : `dev`, `prod`.

## Contraintes

- les services doivent être démarrés avec Docker Compose;
- Traefik doit rester le point d’entrée HTTP/HTTPS de production;
- PostgreSQL doit assurer la persistance relationnelle;
- les environnements de développement et de production doivent rester séparés;

Les invariants globaux applicables restent définis par `app-template/INVARIANTS.md`.

## Critères d’acceptation

- les fichiers obligatoires du projet sont présents;
- la configuration locale est valide;
- les services Docker démarrent sans erreur;
- les migrations applicables réussissent;
- les contrôles du Makefile réussissent;
- la commande `make check` réussit;
- la commande `make ps` confirme que les services attendus sont actifs;

## Points à valider manuellement

- les objectifs métier détaillés;
- les rôles et permissions des utilisateurs;
- les règles métier non exprimées directement dans les routes;
- les scénarios d’erreur fonctionnels;
- les exigences de performance et de disponibilité;
- les critères d’acceptation propres au produit.
