# âœˆï¸ Airport Ground Operations Management System

A full-stack web application for managing day-to-day airport ground operations â€” flights, gates, staff, baggage, maintenance, equipment, HR, fuel, catering, cleaning, cargo, incidents, ramp operations, passenger boarding, notifications, reports â€” with an integrated AI module for predictions, a digital-twin what-if simulator, and an LLM-backed operations chatbot.

Built as a real operations platform, not a toy CRUD app: role-based access control, httpOnly-cookie JWT auth with CSRF protection, rate limiting, audit logs, ML-driven forecasting, and a REST API documented with Swagger.

---

## ðŸš€ Live Deployment

| Piece | URL |
|---|---|
| Frontend (Vercel) | [airport-ground-operations-managemen.vercel.app](https://airport-ground-operations-managemen.vercel.app) |
| Backend API (Railway) | [web-production-d42cc.up.railway.app](https://web-production-d42cc.up.railway.app) |
| API Docs (Swagger) | [web-production-d42cc.up.railway.app/swagger/](https://web-production-d42cc.up.railway.app/swagger/) |
| Database | PostgreSQL (Railway, same project as backend) |

See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for the full deployment setup and how to redeploy.

---

## ðŸ“– What This Project Does

Think of it as the internal software an airport's ground operations team would use to run a terminal day-to-day:

- **Flights** â€” schedule flights, track their status through the ground-handling pipeline (scheduled â†’ gate assigned â†’ crew assigned â†’ fueling â†’ boarding â†’ departed), and manage airlines/aircraft.
- **Gates** â€” assign flights to gates, track availability, prevent double-booking.
- **Turnaround** â€” tracks every ground-ops activity happening between an aircraft's arrival and departure (task-by-task turnaround tracking).
- **Staff** â€” manage ground crew profiles, shifts, and schedules.
- **HR Management** â€” departments, designations, employee HR profiles, leave types and leave requests.
- **Baggage** â€” track baggage from check-in to claim, with a full status history per bag.
- **Cargo Management** â€” ULDs (unit load devices/containers/pallets), cargo manifests per flight, and individual cargo item tracking.
- **Passenger Boarding** â€” boarding sessions and group/zone-based boarding call tracking.
- **Maintenance** â€” log and track maintenance requests for aircraft/equipment.
- **Ground Equipment** â€” manage equipment inventory, usage, and condition.
- **Fuel Management** â€” fuel companies, fuel trucks, and fueling operations per flight.
- **Aircraft Cleaning** â€” cleaning task tracking per aircraft turnaround.
- **Water & Lavatory Service** â€” servicing task tracking per aircraft turnaround.
- **Catering** â€” catering companies and meal orders per flight.
- **Incident Management** â€” log incidents (fuel spills, etc.) with a timeline of follow-up updates.
- **Ramp Operations** â€” ramp safety inspections and pushback operation tracking.
- **Digital Twin** â€” read-only "what happens if X closes" simulation engine (e.g. gate closure impact), plus a live gate-congestion heatmap.
- **Notifications** â€” in-app notifications for relevant events (flight updates, maintenance alerts, etc.).
- **Reports** â€” generate operational reports.
- **AI Module** â€” machine-learning predictions (flight delay, maintenance urgency, gate recommendation, staffing needs, weather risk, passenger rush, equipment failure risk) plus an LLM-backed chatbot that answers operational questions using live data.

Every meaningful action (create/update/delete) is written to an **audit log**, so there's a record of who did what and when.

---

## ðŸ§± Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 5, Django REST Framework |
| Auth | SimpleJWT, tokens issued as httpOnly cookies (not exposed to frontend JS) with CSRF double-submit protection, rate-limited login |
| Database | PostgreSQL (production/CI), SQLite (local dev) â€” auto-switches based on `DATABASE_URL` |
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Charts | Recharts |
| Machine Learning | scikit-learn (RandomForest Regressor/Classifier) â€” 7 predictive models |
| Chatbot | Tiered LLM engine â€” Claude (Anthropic API) â†’ Gemini (Google Generative Language API) â†’ offline rule-based fallback â€” with tool-calling into live app data |
| Static Files | WhiteNoise (compressed manifest storage) |
| API Docs | Swagger UI / ReDoc (drf-yasg) |
| CI/CD | GitHub Actions â€” per-app test suite + dedicated security-test job + integration tests, against a real PostgreSQL service container, plus flake8 lint and frontend UI tests |
| Rate Limiting | django-ratelimit |

---

## ðŸ—ï¸ Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   REST API (JWT via httpOnly cookies)   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   React + Vite SPA  â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¶ â”‚   Django + DRF API   â”‚
â”‚   (Tailwind CSS)    â”‚  â—€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚                      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                                          â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                                                              â”‚
                                       â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                                       â”‚                           â”‚                   â”‚                       â”‚
                              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                              â”‚  PostgreSQL /    â”‚         â”‚   AI Module      â”‚ â”‚  Digital Twin    â”‚   â”‚   Audit Logging     â”‚
                              â”‚  SQLite Database â”‚         â”‚  (scikit-learn + â”‚ â”‚  (what-if sim +  â”‚   â”‚  + Notifications    â”‚
                              â”‚                   â”‚         â”‚   Claude/Gemini  â”‚ â”‚   congestion     â”‚   â”‚                      â”‚
                              â”‚                   â”‚         â”‚   chatbot)       â”‚ â”‚   heatmap)       â”‚   â”‚                      â”‚
                              â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

The frontend is a separate single-page app (React) that talks to the Django backend purely through the REST API â€” it's not server-rendered by Django.

---

## ðŸ“ Project Structure

```
airport-ground-operations-management-system-2.0/
â”‚
â”œâ”€â”€ backend/                   # Django project settings, root urls.py, wsgi/asgi
â”‚
â”œâ”€â”€ accounts/                  # Custom User model, cookie-based JWT login/register, roles
â”œâ”€â”€ core_app/                  # Shared utilities, permissions, audit log, exception handler, security_tests.py
â”œâ”€â”€ flights/                   # Airlines, aircraft, flights, service checklist
â”œâ”€â”€ gates/                     # Gates and gate assignments
â”œâ”€â”€ turnaround/                 # Per-flight turnaround task tracking
â”œâ”€â”€ staff/                     # Staff profiles, shifts, schedules
â”œâ”€â”€ hr_management/              # Departments, designations, HR profiles, leave
â”œâ”€â”€ baggage/                   # Baggage records + tracking history
â”œâ”€â”€ cargo_management/           # ULDs, cargo manifests, cargo items
â”œâ”€â”€ passenger_boarding/         # Boarding sessions and boarding groups
â”œâ”€â”€ maintenance/                # Maintenance requests and logs
â”œâ”€â”€ ground_equipment/           # Ground equipment inventory and usage
â”œâ”€â”€ fuel_management/            # Fuel companies, trucks, fueling operations
â”œâ”€â”€ aircraft_cleaning/          # Cleaning task tracking
â”œâ”€â”€ water_lavatory_service/     # Water/lavatory servicing task tracking
â”œâ”€â”€ catering/                   # Catering companies and orders
â”œâ”€â”€ incident_management/        # Incidents + timeline updates
â”œâ”€â”€ ramp_operations/             # Ramp inspections, pushback operations
â”œâ”€â”€ digital_twin/                # What-if simulation engine + gate heatmap (no models â€” reads live state)
â”œâ”€â”€ notifications/               # In-app notifications
â”œâ”€â”€ reports/                     # Report generation
â”œâ”€â”€ ai_module/                   # ML predictions + LLM chatbot
â”‚   â”œâ”€â”€ ml/
â”‚   â”‚   â”œâ”€â”€ train_models.py         # Trains all 7 ML models
â”‚   â”‚   â”œâ”€â”€ predictor.py            # Loads trained models, runs inference
â”‚   â”‚   â”œâ”€â”€ dataset_generator.py    # Synthetic training data
â”‚   â”‚   â”œâ”€â”€ real_data_extractor.py  # Pulls real data for training once enough exists
â”‚   â”‚   â”œâ”€â”€ resource_optimizer.py   # Cross-model resource optimization
â”‚   â”‚   â”œâ”€â”€ dashboard_intelligence.py # Live dashboard KPIs + forecasts
â”‚   â”‚   â””â”€â”€ saved_models/           # Trained .pkl model files
â”‚   â”œâ”€â”€ ai_tools.py             # Shared tool definitions + live-data lookups for the chatbot
â”‚   â”œâ”€â”€ llm_engine.py           # Claude-backed chatbot engine (primary)
â”‚   â”œâ”€â”€ gemini_engine.py        # Gemini-backed chatbot engine (fallback)
â”‚   â””â”€â”€ chatbot.py              # Offline rule-based chatbot engine (final fallback)
â”‚
â”œâ”€â”€ frontend/                   # React + Vite + Tailwind SPA
â”‚   â””â”€â”€ src/
â”‚       â”œâ”€â”€ pages/               # Dashboard, Flights, Gates, Staff, Baggage, etc.
â”‚       â”œâ”€â”€ components/          # Reusable UI components (per-module subfolders)
â”‚       â”œâ”€â”€ api/                 # Axios API client
â”‚       â”œâ”€â”€ context/             # React context (auth, etc.)
â”‚       â””â”€â”€ hooks/                # Custom hooks
â”‚
â”œâ”€â”€ .github/workflows/ci.yml    # CI: per-app tests + security tests + integration tests + lint + frontend tests
â”œâ”€â”€ logs/                        # Runtime logs (general/error/warning) â€” gitignored
â”œâ”€â”€ ER_DIAGRAM.md                # Entity-relationship documentation
â”œâ”€â”€ manage.py
â”œâ”€â”€ requirements.txt
â””â”€â”€ README.md
```

---

## âš™ï¸ Local Setup

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

# Optional â€” omit to use SQLite locally
# DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Optional â€” for email features (welcome emails, etc.)
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=

# Optional â€” chatbot LLM backends (falls back to offline rule-based engine if unset)
ANTHROPIC_API_KEY=
AI_CHAT_MODEL=claude-sonnet-4-6
GEMINI_API_KEY=
GEMINI_CHAT_MODEL=gemini-2.5-flash

# Optional â€” used by the weather-risk ML model
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

## ðŸ”‘ Authentication

Login via `POST /api/token/` with `username` + `password`. On success, the access and refresh JWTs are set as **httpOnly cookies** (`access_token` / `refresh_token`) â€” they are never exposed in the response body or to frontend JavaScript, which mitigates token theft via XSS. A non-httpOnly `csrftoken` cookie is issued at the same time.

- **Reading data (GET)** â€” the cookie alone is enough; no extra headers needed.
- **Writing data (POST/PUT/PATCH/DELETE)** â€” the request must also include the CSRF cookie's value as an `X-CSRFToken` header (Django's standard double-submit-cookie pattern). Axios can be configured to do this automatically via `xsrfCookieName` / `xsrfHeaderName`.
- Non-browser clients (Swagger's "Authorize" button, Postman, server-to-server calls) can still authenticate the traditional way with `Authorization: Bearer <access_token>` â€” no CSRF check applies to header-based auth, since only same-origin JS can set custom headers.

Refresh via `POST /api/token/refresh/` â€” reads the refresh token from its cookie automatically, no request body needed.

Login is rate-limited to 5 attempts/minute per IP; token refresh to 10/minute.

---

## ðŸ“š API Documentation

Once the backend is running, interactive API docs are available at:

- Swagger UI: `http://127.0.0.1:8000/swagger/`
- ReDoc: `http://127.0.0.1:8000/redoc/`

(Requires authentication â€” the schema isn't fully public.)

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

## ðŸ¤– AI Module

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

1. **Claude** (`llm_engine.py`) â€” primary, via the Anthropic API, using `ai_tools.py`'s shared tool definitions to query live app data mid-conversation.
2. **Gemini** (`gemini_engine.py`) â€” fallback if `ANTHROPIC_API_KEY` isn't set or the Claude call fails, using the same tool set against Google's Generative Language API.
3. **Offline rule-based engine** (`chatbot.py`) â€” final fallback if neither LLM key is configured, using regex/intent matching against live DB lookups.

### Digital Twin
`digital_twin/simulation.py` is a read-only "what happens if X closes" engine â€” it never writes to the database, only reads current state and projects impact (e.g. `simulate_gate_closure()` finds alternative gates, estimates delayed flights, and reports staff/equipment knock-on effects). Paired with a live gate-congestion heatmap endpoint.

---

## âœ… Testing

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

- **Run Tests** â€” every app's test suite individually, plus `core_app.security_tests` and `core_app.integration_tests`, against a real PostgreSQL service container.
- **Lint Check** â€” flake8 across the whole repo (excluding `venv`, `env`, `node_modules`, `migrations`, `__pycache__`, `.git`), max line length 120.
- **Frontend UI Tests** â€” `npm run test` in `frontend/`.

> Local tip: your `venv/` and `frontend/node_modules/` folders are gitignored so CI never sees them, but if you run flake8 locally be sure to exclude them yourself (`--exclude=venv,env,migrations,__pycache__,.git,node_modules`) â€” some installed packages (e.g. PyYAML, pywin32) fail default lint rules and aren't your code.

---

## ðŸ“ Logging

Logs are written to `logs/` (gitignored, created automatically):

- `logs/general.log` â€” all INFO-level activity
- `logs/error.log` â€” errors only
- `logs/warning.log` â€” warnings only

Each app has its own named logger (e.g. `logging.getLogger('gates')`, `logging.getLogger('accounts')`).

---

## ðŸ—ºï¸ Entity Relationships

See [`ER_DIAGRAM.md`](./ER_DIAGRAM.md) for the full database schema and relationships between models.

---

## ðŸš§ Roadmap / Known Gaps

- ML models: 5 of 7 still train on synthetic data only (real-data training exists for delay & maintenance).
- No caching layer (Redis) yet.
- Rate limiting not yet applied to chatbot/AI endpoints.
- `digital_twin` is read-only by design â€” no persistence of simulation runs/history yet (snapshot/heatmap/what-if endpoints now have full test coverage).

---

## ðŸ“„ License

MIT License.


