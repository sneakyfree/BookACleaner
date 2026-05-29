# BookACleaner Deployment Guide

Production runs as a Docker Compose stack: **Postgres + Redis + API (gunicorn/uvicorn) +
Celery worker + Celery beat + Next.js web**, fronted by nginx (`nginx/bookacleaner.conf`).

> Stack reality: backend is **FastAPI + SQLAlchemy 2.0 (async) + Alembic** (not Prisma).
> Database schema is managed by Alembic migrations, applied automatically by the
> one-shot `migrate` service before the API/Celery containers start.

## 1. Prerequisites
- A host with Docker Engine + the Compose plugin (`docker compose version`)
- DNS A records for `bookacleaner.ai` / `www` pointing at the host
- nginx + certbot on the host (or a managed TLS terminator)

## 2. Configure environment
```bash
cp .env.prod.example .env
$EDITOR .env          # fill in DB_PASS, REDIS_PASS, JWT_SECRET, NEXTAUTH_SECRET,
                      # INTERNAL_API_KEY (openssl rand -hex 32) + integration keys
```
The API refuses to boot in production (`DEV_MODE=false`) unless `JWT_SECRET`,
`NEXTAUTH_SECRET`, and `INTERNAL_API_KEY` are set to non-default values. Stripe/Twilio/
OpenAI/AWS keys are optional — those features stay in mock/disabled mode if unset.

## 3. Build & launch
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
Startup order is enforced by `depends_on`:
`db` + `redis` (healthy) → `migrate` (runs `alembic upgrade head`, exits) →
`api` + `celery-worker` + `celery-beat` → `web`.

## 4. Database migrations
Applied automatically by the `migrate` service on every `up`. To run manually:
```bash
docker compose -f docker-compose.prod.yml run --rm migrate          # alembic upgrade head
docker compose -f docker-compose.prod.yml run --rm api alembic history
```
Optional demo seed (dev/staging only):
```bash
docker compose -f docker-compose.prod.yml run --rm api python scripts/seed_demo.py
```

## 5. nginx + TLS (on the host)
```bash
sudo cp nginx/bookacleaner.conf /etc/nginx/sites-available/bookacleaner.conf
sudo ln -s /etc/nginx/sites-available/bookacleaner.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d bookacleaner.ai -d www.bookacleaner.ai
sudo nginx -t && sudo systemctl reload nginx
```
nginx proxies `/api/`, `/health`, `/ws/` → API (:8000) and everything else → web (:3000),
with rate limiting and security headers already configured.

## 6. Verify
```bash
docker compose -f docker-compose.prod.yml ps
curl -f http://localhost:8000/health/ready     # API + DB + Redis readiness
curl -f http://localhost:8000/health/celery    # Celery worker reachable
```
- [ ] All containers `healthy` / `migrate` exited 0
- [ ] `/health/ready` returns 200
- [ ] Registration + login work
- [ ] Cleaner search returns results
- [ ] Booking wizard submits

## Ports
| Service | Container | Host (default) |
|---------|-----------|----------------|
| Web (Next.js) | 3000 | `${WEB_PORT:-3000}` |
| API (gunicorn) | 8000 | `${API_PORT:-8000}` |
| Postgres | 5432 | `${DB_PORT:-5432}` |
| Redis | 6379 | `${REDIS_PORT:-6379}` |
