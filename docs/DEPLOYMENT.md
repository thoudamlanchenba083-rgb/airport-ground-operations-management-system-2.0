# Deployment Guide

## Overview
This app has two deployable pieces:
- **Backend**: Django + DRF API (Gunicorn/WSGI in production)
- **Frontend**: React + Vite SPA (built to static files, served separately or via CDN)

Database: PostgreSQL in production (SQLite is local-dev only).

## Current Production Deployment

| Piece | Platform | URL |
|---|---|---|
| Frontend | Vercel | `https://airport-ground-operations-managemen.vercel.app` |
| Backend API | Railway | `https://web-production-d42cc.up.railway.app` |
| Database | Railway (Postgres add-on, same project) | internal `DATABASE_URL`, not publicly exposed |
| Source | GitHub | `https://github.com/thoudamlanchenba083-rgb/airport-ground-operations-management-system-2.0` |

**How it's wired up:**
- Both Vercel and Railway deploy automatically on every push to the `main` branch of the GitHub repo above.
- Railway's `web` service runs the Django backend (Gunicorn) and has "Public Networking" enabled to expose the `*.up.railway.app` domain.
- Railway's `Postgres` service is attached to the `web` service, which injects `DATABASE_URL` automatically — no manual connection string needed.
- Vercel builds `frontend/` (`npm run build`) and serves the static `dist/` output. Its API base URL is configured to point at the Railway backend domain above.
- On Railway, `ALLOWED_HOSTS` includes the `web-production-d42cc.up.railway.app` domain, and on the backend `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` include the Vercel frontend domain.

**To redeploy:** just push to `main` — both platforms pick it up automatically. To roll back, use Railway's deployment history / Vercel's "Instant Rollback" button rather than a manual redeploy.

## 1. Environment Variables (Production)

Create a `.env` (or configure these in your host's environment settings — never commit this file):

```env
SECRET_KEY=<generate a long random value>
DEBUG=False
ALLOWED_HOSTS=web-production-d42cc.up.railway.app
CORS_ALLOWED_ORIGINS=https://airport-ground-operations-managemen.vercel.app
CSRF_TRUSTED_ORIGINS=https://airport-ground-operations-managemen.vercel.app

# On Railway this is injected automatically when Postgres is attached to the service —
# no need to set it manually there. Only set it yourself for other hosts.
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<dbname>

EMAIL_HOST_USER=<your-smtp-user>
EMAIL_HOST_PASSWORD=<your-smtp-password>

OPENWEATHER_API_KEY=<optional>
ANTHROPIC_API_KEY=<optional>
GEMINI_API_KEY=<optional>
```

> Replace the `ALLOWED_HOSTS` / `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` values above with your own domains if you fork or redeploy this project elsewhere.

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

Status for the current live deployment (Vercel + Railway):

- [x] `DEBUG=False` confirmed in production env
- [x] `ALLOWED_HOSTS` set to real domain (`web-production-d42cc.up.railway.app`), not `*`
- [x] `CORS_ALLOWED_ORIGINS` restricted to real frontend domain (Vercel)
- [x] HTTPS enforced (both Vercel and Railway terminate TLS for you automatically)
- [x] Static files collected (`collectstatic`) and served correctly
- [x] Superuser account created
- [x] Swagger/ReDoc reachable at `/swagger/` and `/redoc/`
- [x] Logs directory (`logs/`) writable by the app process
- [x] `.env` file is NOT committed to git (check `.gitignore`)

Use this same checklist when standing up a new environment (staging, a fork, etc.) — reset the boxes above and work through them again.

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