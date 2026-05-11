# AGENTS.md

## Rôle de l’agent Codex

Tu aides au développement de l’application auto-hébergée `Calendrier`.

`Calendrier` est la source de vérité des événements affichés dans son UI, et la source du `Dashboard` pour :

* les événements à venir ;
* les anniversaires à venir.

Avant de modifier le code, lis au minimum :

* `README.md`
* `README_DEV.md`
* `INVARIANTS.md`
* `CODEX_START.md`
* `docs/VUE_D_ENSEMBLE_PROJET.md`
* `.env.template` si présent
* `docker-compose.dev.yml`
* `docker-compose.prod.yml`

---

## Priorité des documents

En cas de contradiction, applique cet ordre :

1. `INVARIANTS.md`
2. `docs/VUE_D_ENSEMBLE_PROJET.md`
3. `.env.template`
4. `README_DEV.md`
5. `README.md`
6. `CODEX_START.md`
7. le code existant

---

## Règles métier propres à Calendrier

* chaque utilisateur ne voit que ses propres calendriers et événements ;
* l’application garantit un calendrier système `Anniversaires` par usager ;
* ce calendrier porte `kind=birthdays` ;
* les autres calendriers portent `kind=personal` ;
* les anniversaires synchronisés doivent rester visibles d’une année à l’autre par une vraie récurrence annuelle ;
* l’API des événements doit exposer un `kind` explicite `event` ou `birthday` ;
* le dashboard lit `Calendrier`, pas `Contacts`, pour les anniversaires.

---

## Contrats inter-apps

### Avec Contact

* `Calendrier` expose un endpoint d’intégration admin pour synchroniser les anniversaires ;
* l’événement est identifié par `external_uid=contact-birthday:<owner_username>:<contact_id>` ;
* l’usager propriétaire doit exister dans `Calendrier` ;
* si `name` est vide ou `birthday` est nul, l’événement correspondant est supprimé.

### Avec Dashboard

* `Dashboard` consomme une fenêtre d’événements via `range_start` / `range_end` ;
* les occurrences d’événements récurrents doivent déjà être projetées correctement par l’API ;
* le dashboard ne doit pas deviner la logique anniversaire si `Calendrier` peut l’exposer clairement.

---

## Conventions de projet

* utiliser `docker compose`, jamais `docker-compose` ;
* préférer `make init`, `make up`, `make migrate`, `make backup`, `make restore`, `make update` ;
* ne jamais commiter `.env.local` ;
* ne pas casser la convention `.env.template.example` -> `.env.template` -> `make init`.
