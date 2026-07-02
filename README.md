# ✈️ Airport Ground Operations Management System

A full-stack web application for managing day-to-day airport ground operations — flights, gates, staff, baggage, maintenance, equipment, HR, notifications, reports — with an integrated AI module for predictions and a chatbot.

Built as a real operations platform, not a toy CRUD app: role-based access control, JWT auth, rate limiting, audit logs, ML-driven forecasting, and a REST API documented with Swagger.

---

## 📖 What This Project Does

Think of it as the internal software an airport's ground operations team would use to run a terminal day-to-day:

- **Flights** — schedule flights, track their status through the ground-handling pipeline (scheduled → gate assigned → crew assigned → fueling → boarding → departed), and manage airlines/aircraft.
- **Gates** — assign flights to gates, track availability, prevent double-booking.
- **Staff** — manage ground crew profiles, shifts, and schedules.
- **HR Management** — departments, designations, employee HR profiles, leave types and leave requests.
- **Baggage** — track baggage from check-in to claim, with a full status history per bag.
- **Maintenance** — log and track maintenance requests for aircraft/equipment.
- **Ground Equipment** — manage equipment inventory, usage, and condition.
- **Notifications** — in-app notifications for relevant events (flight updates, maintenance alerts, etc.).
- **Reports** — generate operational reports.
- **AI Module** — machine-learning predictions (flight delay, maintenance urgency, gate recommendation, staffing needs, weather risk, passenger rush, equipment failure risk) plus a chatbot that answers operational questions using live data.

Every meaningful action (create/update/delete) is written to an **audit log**, so there's a record of who did what and when.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 5, Django REST Framework |
| Auth | SimpleJWT (access + refresh tokens), rate-limited login |
| Database | PostgreSQL (production), SQLite (local dev) — auto-switches based on `DATABASE_URL` |
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Charts | Recharts |
| Machine Learning | scikit-learn (RandomForest Regressor/Classifier) |
| Chatbot | Rule-based retrieval engine (regex + intent matching + live DB lookups) |
| API Docs | Swagger UI / ReDoc (drf-yasg) |
| CI/CD | GitHub Actions (tests across every app + flake8 lint) |
| Rate Limiting | django-ratelimit |

---

## 🏗️ Architecture

```
┌─────────────────────┐        REST API (JWT)        ┌──────────────────────┐
│   React + Vite SPA  │  ───────────────────────────▶ │   Django + DRF API   │
│   (Tailwind CSS)    │  ◀─────────────────────────── │                      │
└─────────────────────┘                                └──────────┬───────────┘
                                                                    │
                                       ┌────────────────────────────┼────────────────────────────┐
                                       │                            │                            │
                              ┌────────▼────────┐         ┌─────────▼─────────┐        ┌─────────▼─────────┐
                              │  PostgreSQL /    │         │   AI Module        │        │   Audit Logging   │
                              │  SQLite Database │         │  (scikit-learn +   │        │  + Notifications  │
                              │                   │         │   chatbot)         │        │                    │
                              └───────────────────┘         └────────────────────┘        └────────────────────┘
```

The frontend is a separate single-page app (React) that talks to the Django backend purely through the REST API — it's not server-rendered by Django.

---

## 📁 Project Structure

```
airport-ground-operations-management-system-2.0/
│
├── backend/                # Django project settings, root urls.py, wsgi/asgi
│
├── accounts/                # Custom User model, JWT login/register, roles
├── core_app/                 # Shared utilities, permissions, audit log, exception handler
├── flights/                   # Airlines, aircraft, flights, service checklist
├── gates/                     # Gates and gate assignments
├── staff/                     # Staff profiles, shifts, schedules
├── hr_management/            # Departments, designations, HR profiles, leave
├── baggage/                   # Baggage records + tracking history
├── maintenance/               # Maintenance requests and logs
├── ground_equipment/          # Ground equipment inventory and usage
├── notifications/             # In-app notifications
├── reports/                   # Report generation
├── ai_module/                 # ML predictions + chatbot
│   ├── ml/
│   │   ├── train_models.py         # Trains all 7 ML models
│   │   ├── predictor.py            # Loads trained models, runs inference
│   │   ├── dataset_generator.py    # Synthetic training data
│   │   ├── real_data_extractor.py  # Pulls real data for training once enough exists
│   │   ├── resource_optimizer.py   # Cross-model resource optimization
│   │   ├── dashboard_intelligence.py # Live dashboard KPIs + forecasts
│   │   └── saved_models/           # Trained .pkl model files
│   └── chatbot.py             # Rule-based chatbot engine
│
├── frontend/                  # React + Vite + Tailwind SPA
│   └── src/
│       ├── pages/              # Dashboard, Flights, Gates, Staff, Baggage, etc.
│       ├── components/         # Reusable UI components (per-module subfolders)
│       ├── api/                # Axios API client
│       ├── context/            # React context (auth, etc.)
│       └── hooks/               # Custom hooks
│
├── .github/workflows/ci.yml   # CI: runs tests for every app + lint
├── logs/                       # Runtime logs (general/error/warning) — gitignored
├── ER_DIAGRAM.md              # Entity-relationship documentation
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
git clone https://github.com/your-username/airport-ground-operations-management-system.git
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

# Optional — omit to use SQLite locally
# DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Optional — for email features (welcome emails, etc.)
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
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

Login via `POST /api/token/` with `username` + `password` to receive a JWT access + refresh token pair. Include the access token on subsequent requests:

```
Authorization: Bearer <access_token>
```

Login is rate-limited to 5 attempts/minute per IP; token refresh to 10/minute.

---

## 📚 API Documentation

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
| `/api/staff/` | Staff, shifts |
| `/api/hr/` | HR management |
| `/api/maintenance/` | Maintenance requests |
| `/api/baggage/` | Baggage tracking |
| `/api/ground-equipment/` | Equipment |
| `/api/notifications/` | Notifications |
| `/api/reports/` | Reports |
| `/api/core/` | Shared/audit utilities |
| `/api/ai/` | AI predictions + chatbot |

---

## 🤖 AI Module

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

Delay and maintenance models automatically switch from synthetic to **real historical data** once enough records exist in the database. The chatbot (`/api/ai/chat/send/`) is a separate rule-based engine that answers questions using live flight/gate/staff data — architected so it can later be swapped for a real LLM API.

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

CI (GitHub Actions) runs the full suite — every app individually plus integration tests — against a real PostgreSQL service container on every push/PR to `main` and `develop`, along with a flake8 lint check.

---

## 📝 Logging

Logs are written to `logs/` (gitignored, created automatically):

- `logs/general.log` — all INFO-level activity
- `logs/error.log` — errors only
- `logs/warning.log` — warnings only

Each app has its own named logger (e.g. `logging.getLogger('gates')`).

---

## 🗺️ Entity Relationships

See [`ER_DIAGRAM.md`](./ER_DIAGRAM.md) for the full database schema and relationships between models.

---

## 🚧 Roadmap / Known Gaps

- ML models: 5 of 7 still train on synthetic data only (real-data training exists for delay & maintenance).
- No caching layer (Redis) yet.
- Rate limiting not yet applied to chatbot/AI endpoints.
- Static file serving for production (WhiteNoise) not yet configured.

---

## 📄 License

MIT License.
