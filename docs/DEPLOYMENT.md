# Deployment Guide

## Overview
This app has two deployable pieces:
- **Backend**: Django + DRF API (Gunicorn/WSGI in production)
- **Frontend**: React + Vite SPA (built to static files, served separately or via CDN)

Database: PostgreSQL in production (SQLite is local-dev only).

## 1. Environment Variables (Production)

Create a `.env` (or configure these in your host's environment settings — never commit this file):

```env
SECRET_KEY=<generate a long random value>
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com

DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<dbname>

EMAIL_HOST_USER=<your-smtp-user>
EMAIL_HOST_PASSWORD=<your-smtp-password>

OPENWEATHER_API_KEY=<optional>
ANTHROPIC_API_KEY=<optional>
GEMINI_API_KEY=<optional>
```

Generate a strong `SECRET_KEY`:
```powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## 2. Backend Deployment Steps

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

Run with Gunicorn (Linux server / container):
```bash
gunicorn backend.wsgi:application --bind 0.0.0.0:8000 --workers 3
```
## 3. Frontend Build & Deployment

```bash
cd frontend
npm install
npm run build
```

This produces a `frontend/dist/` folder of static files. Two common ways to serve it:

**Option A — Separate static host (recommended)**
Deploy `frontend/dist/` to Netlify, Vercel, or an S3+CloudFront bucket. Point its
API base URL (in `frontend/src/api/` axios config) at your deployed backend domain.

**Option B — Served by Django itself**
Copy `frontend/dist/*` into a dedicated Django static folder (not the raw `frontend/`
source) and let WhiteNoise serve it. This requires updating `STATICFILES_DIRS` in
`backend/settings.py` to point at `frontend/dist` instead of `frontend`, so Django
isn't trying to collect your React source files as static assets.

## 4. Database Migration Checklist (Production)

- [ ] Take a backup before running migrations on production data
- [ ] Run `python manage.py migrate --plan` first to review pending migrations
- [ ] Run `python manage.py migrate`
- [ ] Verify with `python manage.py showmigrations`

## 5. Post-Deployment Checklist

- [ ] `DEBUG=False` confirmed in production env
- [ ] `ALLOWED_HOSTS` set to real domain(s), not `*`
- [ ] `CORS_ALLOWED_ORIGINS` restricted to real frontend domain
- [ ] HTTPS enforced (via reverse proxy — Nginx/Caddy — or hosting platform)
- [ ] Static files collected (`collectstatic`) and served correctly
- [ ] Superuser account created
- [ ] Swagger/ReDoc reachable at `/swagger/` and `/redoc/`
- [ ] Logs directory (`logs/`) writable by the app process
- [ ] `.env` file is NOT committed to git (check `.gitignore`)

## 6. Environment Management

| Environment | Database | DEBUG | Purpose |
|---|---|---|---|
| Local dev | SQLite (or local Postgres) | True | Development on a laptop |
| Staging | Postgres (staging instance) | False | Pre-release testing |
| Production | Postgres (production instance) | False | Live traffic |

Each environment should have its own `.env` / hosting-platform env vars — never share
a `SECRET_KEY` or database between environments.

## 7. Rollback Plan

If a deployment breaks production:
1. Redeploy the previous known-good git tag/commit on `main`
2. If a migration caused the issue, restore the pre-migration database backup
3. Investigate on a branch, fix, and redeploy through the normal CI/PR process