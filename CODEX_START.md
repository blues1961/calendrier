# CODEX_START.md

## Mandat initial pour Codex

Tu travailles dans le dépôt `Calendrier`.

L’objectif est de faire évoluer une application de calendrier auto-hébergée, en préservant :

* les invariants du template ;
* l’isolation stricte par utilisateur ;
* le contrat anniversaires avec `Contact` et `Dashboard` ;
* la cohérence entre le backend, l’API et la projection des événements récurrents.

Avant toute modification, lis :

1. `AGENTS.md`
2. `INVARIANTS.md`
3. `README_DEV.md`
4. `README.md`
5. `docs/VUE_D_ENSEMBLE_PROJET.md`
6. `.env.template` si présent
7. `.env.dev`
8. `.env.prod`
9. `.env.local` si présent, sans afficher son contenu
10. `docker-compose.dev.yml`
11. `docker-compose.prod.yml`

---

## Points critiques du domaine

* un anniversaire appartient à `Calendrier`, même s’il vient de `Contact` ;
* le calendrier système `Anniversaires` est spécial ;
* les événements anniversaire doivent être annuels, pas juste datés une fois ;
* l’API doit pouvoir projeter les occurrences dans une fenêtre demandée ;
* si tu modifies la projection des événements, vérifie aussi l’impact sur le frontend et sur `Dashboard`.

---

## Workflow standard

Utilise d’abord les commandes du projet :

```bash
make init
make up
make migrate
make check
make backup
make restore
make update
```

---

## Ce qu’il ne faut pas faire

* ne pas casser les services standards `db`, `backend`, `frontend` ;
* ne pas supprimer la distinction `kind=birthdays` / `kind=personal` ;
* ne pas faire dépendre le dashboard d’heuristiques si une information source explicite existe ;
* ne pas exposer de secrets ;
* ne pas commiter `.env.local` ;
* ne pas casser les routes `/api/` ni l’usage de `/api` côté frontend.
