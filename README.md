# Calendrier — Docker • Django • React • Apache2

Suivre `docker compose` avec `--env-file` (.env.dev en dev / .env.prod en prod).

## Démarrage (dev)

```bash
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d --build
docker compose -f docker-compose.dev.yml --env-file .env.dev exec backend python manage.py createsuperuser
```

Frontend: http://localhost:5173  
API: http://localhost:8000/api/
