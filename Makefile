.DEFAULT_GOAL := help

SCRIPTS_DIR := ./scripts

.PHONY: help init dev prod up down restart rebuild logs ps check migrate update backup restore

help:
	@printf '%s\n' \
		'Usage: make <target>' \
		'' \
		'Cibles disponibles :' \
		'  help      Affiche cette aide' \
		'  init      Initialise le projet en développement (scripts/init.sh dev)' \
		'  dev       Bascule l’environnement actif vers .env.dev' \
		'  prod      Bascule l’environnement actif vers .env.prod' \
		'  up        Démarre les services de l’environnement actif' \
		'  down      Arrête les services de l’environnement actif' \
		'  restart   Redémarre les services de l’environnement actif' \
		'  rebuild   Reconstruit les images (optionnel : make rebuild SERVICE=backend)' \
		'  logs      Affiche les logs (optionnel : make logs SERVICE=backend)' \
		'  ps        Affiche l’état des services de l’environnement actif' \
		'  check     Vérifie les invariants du template' \
		'  migrate   Applique les migrations Django dans l’environnement actif' \
		'  update    Met à jour l’application dans l’environnement actif' \
		'  backup    Crée un backup PostgreSQL dans ./backup' \
		'  restore   Restaure un backup PostgreSQL' \
		'' \
		'Options pour restore :' \
		'  make restore' \
		'            Restaure automatiquement le backup le plus récent trouvé dans ./backup' \
		'  make restore FILE=./backup/__APP_SLUG___db-YYYYMMDD_HHMMSS.sql.gz' \
		'            Restaure le fichier de backup spécifié'

init:
	$(SCRIPTS_DIR)/init.sh dev

dev:
	$(SCRIPTS_DIR)/env-switch.sh dev

prod:
	$(SCRIPTS_DIR)/env-switch.sh prod

up:
	$(SCRIPTS_DIR)/up.sh

down:
	$(SCRIPTS_DIR)/down.sh

restart:
	$(SCRIPTS_DIR)/restart.sh

rebuild:
	$(SCRIPTS_DIR)/rebuild.sh $(SERVICE)

logs:
	$(SCRIPTS_DIR)/logs.sh $(SERVICE)

ps:
	$(SCRIPTS_DIR)/ps.sh

check:
	$(SCRIPTS_DIR)/check-invariants.sh

migrate:
	$(SCRIPTS_DIR)/migrate.sh

update:
	$(SCRIPTS_DIR)/update.sh

backup:
	$(SCRIPTS_DIR)/backup-db.sh

restore:
	@if [ -n "$(FILE)" ]; then \
		$(SCRIPTS_DIR)/restore-db.sh "$(FILE)"; \
	else \
		$(SCRIPTS_DIR)/restore-db.sh; \
	fi
