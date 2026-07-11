# Airport Ground Operations Management System

A full-stack web application for managing day-to-day airport ground operations — flights, gates, staff, baggage, maintenance, equipment, HR, fuel, catering, cleaning, cargo, incidents, ramp operations, passenger boarding, notifications, reports — with an integrated AI module for predictions, a digital-twin what-if simulator, and an LLM-backed operations chatbot.

Built as a real operations platform, not a toy CRUD app: role-based access control, httpOnly-cookie JWT auth with CSRF protection, rate limiting, audit logs, ML-driven forecasting, and a REST API documented with Swagger.

---

## Live Deployment

| Piece | URL |
|---|---|
| Frontend (Vercel) | [airport-ground-operations-managemen.vercel.app](https://airport-ground-operations-managemen.vercel.app) |
| Backend API (Railway) | [web-production-d42cc.up.railway.app](https://web-production-d42cc.up.railway.app) |
| API Docs (Swagger) | [web-production-d42cc.up.railway.app/swagger/](https://web-production-d42cc.up.railway.app/swagger/) |
| Database | PostgreSQL (Railway, same project as backend) |

See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for the full deployment setup and how to redeploy.

---

## What This Project Does

Think of it as the internal software an airport's ground operations team would use to run a terminal day-to-day:

- **Flights** — schedule flights, track their status through the ground-handling pipeline (scheduled → gate assigned → crew assigned → fueling → boarding → departed), and manage airlines/aircraft.
- **Gates** — assign flights to gates, track availability, prevent double-booking.
- **Turnaround** — tracks every ground-ops activity happening between an aircraft's arrival and departure (task-by-task turnaround tracking).
- **Staff** — manage ground crew profiles, shifts, and schedules.
- **HR Management** — departments, designations, employee HR profiles, leave types and leave requests.
- **Baggage** — track baggage from check-in to claim, with a full status history per bag.
- **Cargo Management** — ULDs (unit load devices/containers/pallets), cargo manifests per flight, and individual cargo item tracking.
- **Passenger Boarding** — boarding sessions and group/zone-based boarding call tracking.
- **Maintenance** — log and track maintenance requests for aircraft/equipment.
- **Ground Equipment** — manage equipment inventory, usage, and condition.
- **Fuel Management** — fuel companies, fuel trucks, and fueling operations per flight.
- **Aircraft Cleaning** — cleaning task tracking per aircraft turnaround.
- **Water & Lavatory Service** — servicing task tracking per aircraft turnaround.
- **Catering** — catering companies and meal orders per flight.
- **Incident Management** — log incidents (fuel spills, etc.) with a timeline of follow-up updates.
- **Ramp Operations** — ramp safety inspections and pushback operation tracking.
- **Digital Twin** — read-only "what happens if X closes" simulation engine (e.g. gate closure impact), plus a live gate-congestion heatmap.
- **Notifications** — in-app notifications for relevant events (flight updates, maintenance alerts, etc.).
- **Reports** — generate operational reports.
- **AI Module** — machine-learning predictions (flight delay, maintenance urgency, gate recommendation, staffing needs, weather risk, passenger rush, equipment failure risk) plus an LLM-backed chatbot that answers operational questions using live data.

Every meaningful action (create/update/delete) is written to an **audit log**, so there's a record of who did what and when.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 5, Django REST Framework |
| Auth | SimpleJWT, tokens issued as httpOnly cookies (not exposed to frontend JS) with CSRF double-submit protection, rate-limited login |
| Database | PostgreSQL (production/CI), SQLite (local dev) — auto-switches based on `DATABASE_URL` |
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Charts | Recharts |
| Machine Learning | scikit-learn (RandomForest Regressor/Classifier) — 7 predictive models |
| Chatbot | Tiered LLM engine — Claude (Anthropic API) → Gemini (Google Generative Language API) → offline rule-based fallback — with tool-calling into live app data |
| Static Files | WhiteNoise (compressed manifest storage) |
| API Docs | Swagger UI / ReDoc (drf-yasg) |
| CI/CD | GitHub Actions — per-app test suite + dedicated security-test job + integration tests, against a real PostgreSQL service container, plus flake8 lint and frontend UI tests |
| Rate Limiting | django-ratelimit |

---

## Architecture

```
┌─────────────────────┐   REST API (JWT via httpOnly cookies)   ┌──────────────────────┐
│   React + Vite SPA  │  ──────────────────────────────────────▶ │   Django + DRF API   │
│   (Tailwind CSS)    │  ◀────────────────────────────────────── │                      │
└─────────────────────┘                                          └──────────┬───────────┘
                                                                              │
                                       ┌───────────────────────────┬─────────┼─────────┬───────────────────────┐
                                       │                           │                   │                       │
                              ┌────────▼────────┐         ┌────────▼────────┐ ┌────────▼────────┐   ┌──────────▼──────────┐
                              │  PostgreSQL /    │         │   AI Module      │ │  Digital Twin    │   │   Audit Logging     │
                              │  SQLite Database │         │  (scikit-learn + │ │  (what-if sim +  │   │  + Notifications    │
                              │                   │         │   Claude/Gemini  │ │   congestion     │   │                      │
                              │                   │         │   chatbot)       │ │   heatmap)       │   │                      │
                              └───────────────────┘         └──────────────────┘ └──────────────────┘   └──────────────────────┘
```

The frontend is a separate single-page app (React) that talks to the Django backend purely through the REST API — it's not server-rendered by Django.

---

## 📁 Project Structure

```
airport-ground-operations-management-system-2.0/
│
├── backend/                   # Django project settings, root urls.py, wsgi/asgi
│
├── accounts/                  # Custom User model, cookie-based JWT login/register, roles
├── core_app/                  # Shared utilities, permissions, audit log, exception handler, security_tests.py
├── flights/                   # Airlines, aircraft, flights, service checklist
├── gates/                     # Gates and gate assignments
├── turnaround/                 # Per-flight turnaround task tracking
├── staff/                     # Staff profiles, shifts, schedules
├── hr_management/              # Departments, designations, HR profiles, leave
├── baggage/                   # Baggage records + tracking history
├── cargo_management/           # ULDs, cargo manifests, cargo items
├── passenger_boarding/         # Boarding sessions and boarding groups
├── maintenance/                # Maintenance requests and logs
├── ground_equipment/           # Ground equipment inventory and usage
├── fuel_management/            # Fuel companies, trucks, fueling operations
├── aircraft_cleaning/          # Cleaning task tracking
├── water_lavatory_service/     # Water/lavatory servicing task tracking
├── catering/                   # Catering companies and orders
├── incident_management/        # Incidents + timeline updates
├── ramp_operations/             # Ramp inspections, pushback operations
├── digital_twin/                # What-if simulation engine + gate heatmap (no models — reads live state)
├── notifications/               # In-app notifications
├── reports/                     # Report generation
├── ai_module/                   # ML predictions + LLM chatbot
│   ├── ml/
│   │   ├── train_models.py         # Trains all 7 ML models
│   │   ├── predictor.py            # Loads trained models, runs inference
│   │   ├── dataset_generator.py    # Synthetic training data
│   │   ├── real_data_extractor.py  # Pulls real data for training once enough exists
│   │   ├── resource_optimizer.py   # Cross-model resource optimization
│   │   ├── dashboard_intelligence.py # Live dashboard KPIs + forecasts
│   │   └── saved_models/           # Trained .pkl model files
│   ├── ai_tools.py             # Shared tool definitions + live-data lookups for the chatbot
│   ├── llm_engine.py           # Claude-backed chatbot engine (primary)
│   ├── gemini_engine.py        # Gemini-backed chatbot engine (fallback)
│   └── chatbot.py              # Offline rule-based chatbot engine (final fallback)
│
├── frontend/                   # React + Vite + Tailwind SPA
│   └── src/
│       ├── pages/               # Dashboard, Flights, Gates, Staff, Baggage, etc.
│       ├── components/          # Reusable UI components (per-module subfolders)
│       ├── api/                 # Axios API client
│       ├── context/             # React context (auth, etc.)
│       └── hooks/                # Custom hooks
│
├── .github/workflows/ci.yml    # CI: per-app tests + security tests + integration tests + lint + frontend tests
├── logs/                        # Runtime logs (general/error/warning) — gitignored
├── ER_DIAGRAM.md                # Entity-relationship documentation
├── manage.py
├── requirements.txt
└── README.md
```

---

## ⚙️ Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/thoudamlanchenba083-rgb/airport-ground-operations-management-system-2.0.git
cd airport-ground-operations-management-system-2.0
```

### 2. Backend setup

```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
```

Create a `.env` file in the project root:

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
CORS_ALLOWED_ORIGINS=http://localhost:5173
CSRF_TRUSTED_ORIGINS=http://localhost:5173

# Optional — omit to use SQLite locally
# DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Optional — for email features (welcome emails, etc.)
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=

# Optional — chatbot LLM backends (falls back to offline rule-based engine if unset)
ANTHROPIC_API_KEY=
AI_CHAT_MODEL=claude-sonnet-4-6
GEMINI_API_KEY=
GEMINI_CHAT_MODEL=gemini-2.5-flash

# Optional — used by the weather-risk ML model
OPENWEATHER_API_KEY=
```

Run migrations and start the server:

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend runs at **http://127.0.0.1:8000**.

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**.

### 4. (Optional) Train the AI models

The repo ships without pre-trained model files by default. To generate them:

```bash
python ai_module/ml/train_models.py
```

This trains all 7 models (delay, maintenance, passenger rush, weather risk, staff requirement, gate recommendation, equipment failure) and saves them to `ai_module/ml/saved_models/`.

---

## 🔑 Authentication

Login via `POST /api/token/` with `username` + `password`. On success, the access and refresh JWTs are set as **httpOnly cookies** (`access_token` / `refresh_token`) — they are never exposed in the response body or to frontend JavaScript, which mitigates token theft via XSS. A non-httpOnly `csrftoken` cookie is issued at the same time.

- **Reading data (GET)** — the cookie alone is enough; no extra headers needed.
- **Writing data (POST/PUT/PATCH/DELETE)** — the request must also include the CSRF cookie's value as an `X-CSRFToken` header (Django's standard double-submit-cookie pattern). Axios can be configured to do this automatically via `xsrfCookieName` / `xsrfHeaderName`.
- Non-browser clients (Swagger's "Authorize" button, Postman, server-to-server calls) can still authenticate the traditional way with `Authorization: Bearer <access_token>` — no CSRF check applies to header-based auth, since only same-origin JS can set custom headers.

Refresh via `POST /api/token/refresh/` — reads the refresh token from its cookie automatically, no request body needed.

Login is rate-limited to 5 attempts/minute per IP; token refresh to 10/minute.

---

## API Documentation

Once the backend is running, interactive API docs are available at:

- Swagger UI: `http://127.0.0.1:8000/swagger/`
- ReDoc: `http://127.0.0.1:8000/redoc/`

(Requires authentication — the schema isn't fully public.)

### Main API routes

| Prefix | App |
|---|---|
| `/api/token/` | Login / token refresh |
| `/api/accounts/` | User accounts |
| `/api/flights/` | Flights, airlines, aircraft |
| `/api/gates/` | Gates, gate assignments |
| `/api/turnaround/` | Turnaround task tracking |
| `/api/staff/` | Staff, shifts |
| `/api/hr/` | HR management |
| `/api/maintenance/` | Maintenance requests |
| `/api/baggage/` | Baggage tracking |
| `/api/cargo/` | ULDs, cargo manifests, cargo items |
| `/api/ground-equipment/` | Equipment |
| `/api/fuel/` | Fuel companies, trucks, fueling operations |
| `/api/cleaning/` | Aircraft cleaning tasks |
| `/api/water-lavatory/` | Water/lavatory servicing |
| `/api/catering/` | Catering companies and orders |
| `/api/incidents/` | Incident management |
| `/api/ramp-operations/` | Ramp inspections, pushback operations |
| `/api/digital-twin/` | What-if simulation, gate heatmap |
| `/api/notifications/` | Notifications |
| `/api/reports/` | Reports |
| `/api/core/` | Shared/audit utilities |
| `/api/ai/` | AI predictions + chatbot |


---

## AI Module

### Predictive models
Seven ML models (scikit-learn RandomForest) provide operational forecasts:

| Model | Predicts |
|---|---|
| Flight Delay | Delay minutes + likelihood |
| Predictive Maintenance | Urgency score + maintenance-required flag |
| Passenger Rush | Expected rush factor |
| Weather Risk | Risk score + delay-likely flag |
| Staff Requirement | Ground crew / security / baggage handler counts needed |
| Gate Recommendation | Best-fit gate, ranked |
| Equipment Failure | Failure risk + maintenance-required flag |

Delay and maintenance models automatically switch from synthetic to **real historical data** once enough records exist in the database.

### Chatbot
The chatbot (`/api/ai/chat/send/`) answers operational questions using live flight/gate/staff data via a tiered engine, falling through automatically if a step is unavailable or errors:

1. **Claude** (`llm_engine.py`) — primary, via the Anthropic API, using `ai_tools.py`'s shared tool definitions to query live app data mid-conversation.
2. **Gemini** (`gemini_engine.py`) — fallback if `ANTHROPIC_API_KEY` isn't set or the Claude call fails, using the same tool set against Google's Generative Language API.
3. **Offline rule-based engine** (`chatbot.py`) — final fallback if neither LLM key is configured, using regex/intent matching against live DB lookups.

### Digital Twin
`digital_twin/simulation.py` is a read-only "what happens if X closes" engine — it never writes to the database, only reads current state and projects impact (e.g. `simulate_gate_closure()` finds alternative gates, estimates delayed flights, and reports staff/equipment knock-on effects). Paired with a live gate-congestion heatmap endpoint.

---

## ✅ Testing

Run the full test suite:

```bash
python manage.py test
```

Run tests for a single app:

```bash
python manage.py test flights
```

Run just the security test suite (authentication enforcement, role-based authorization, rate limiting, information disclosure):

```bash
python manage.py test core_app.security_tests --verbosity=2
```

CI (GitHub Actions) runs three parallel jobs on every push/PR to `main` and `develop`:

- **Run Tests** — every app's test suite individually, plus `core_app.security_tests` and `core_app.integration_tests`, against a real PostgreSQL service container.
- **Lint Check** — flake8 across the whole repo (excluding `venv`, `env`, `node_modules`, `migrations`, `__pycache__`, `.git`), max line length 120.
- **Frontend UI Tests** — `npm run test` in `frontend/`.

> Local tip: your `venv/` and `frontend/node_modules/` folders are gitignored so CI never sees them, but if you run flake8 locally be sure to exclude them yourself (`--exclude=venv,env,migrations,__pycache__,.git,node_modules`) — some installed packages (e.g. PyYAML, pywin32) fail default lint rules and aren't your code.

---

##  Logging

Logs are written to `logs/` (gitignored, created automatically):

- `logs/general.log` — all INFO-level activity
- `logs/error.log` — errors only
- `logs/warning.log` — warnings only

Each app has its own named logger (e.g. `logging.getLogger('gates')`, `logging.getLogger('accounts')`).

---

## 🗺️ Entity Relationships

See [`ER_DIAGRAM.md`](./ER_DIAGRAM.md) for the full database schema and relationships between models.

---

## 🚧 Roadmap / Known Gaps

**Open:**
- ML models: 5 of 7 still train on synthetic data only (real-data training exists for delay & maintenance; the other five fall back to synthetic distributions until enough real historical outcomes accumulate in the database).
- `digital_twin` is read-only by design — no persistence of simulation runs/history yet (snapshot/heatmap/what-if endpoints have full test coverage).

**Resolved since last review:**
- Redis caching layer — see `CACHES` in `backend/settings.py` (Redis via `REDIS_URL` in production, in-process `LocMemCache` locally/in CI).
- Rate limiting on chatbot/AI endpoints — `django-ratelimit` on `ai_module` chat/predictions and `accounts` login/register.
- CI coverage for `aircraft_cleaning`, `cargo_management`, `catering`, `digital_twin`, `fuel_management`, `incident_management`, `passenger_boarding`, `ramp_operations`, `turnaround`, `water_lavatory_service` — all 22 apps now run individually in the **Run Tests** CI job.

---

## 📄 License

MIT License.


