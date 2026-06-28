# ✈️ Airport Ground Operations Management System

A full-stack web application for managing airport ground operations including flights, staff, gates, baggage, maintenance, and incidents.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 5, Django REST Framework |
| Auth | SimpleJWT (access + refresh tokens) |
| Database | PostgreSQL (production), SQLite (local dev) |
| Frontend | Plain HTML / CSS / JS |
| Docs | Swagger UI / ReDoc (drf-yasg) |
| Deployment | Railway (backend), Render (frontend) |

---

## 📁 Project Structure
myproject/

├── backend/          # Django settings, urls, wsgi

├── accounts/         # Custom user model, auth, registration

├── core_app/         # Shared utils, permissions, audit logs, tests

├── flights/          # Airlines, aircraft, flights

├── gates/            # Gates and gate assignments

├── baggage/          # Baggage tracking

├── maintenance/      # Maintenance requests and logs

├── staff/            # Staff profiles, shifts, schedules

├── notifications/    # System notifications

├── reports/          # Report generation and CSV export

├── frontend/         # HTML/CSS/JS frontend (served by Django)

├── .env              # Environment variables (never commit this)

├── manage.py

└── requirements.txt

---

## ⚙️ Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/airport-ground-operations-management-system.git
cd airport-ground-operations-management-system
```

### 2. Create and activate virtual environment

```bash
# Windows
python -m venv env
env\Scripts\activate

# Mac/Linux
python -m venv env
source env/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Create `.env` file

Create a `.env` file in the root `myproject/` directory:

```env
SECRET_KEY=your-secret-key-here-change-this-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5501,http://127.0.0.1:5501
DATABASE_URL=
```

> Leave `DATABASE_URL` empty to use SQLite locally.  
> For PostgreSQL, set it to: `postgresql://user:password@host:port/dbname`

### 5. Run migrations

```bash
python manage.py migrate
```

### 6. Create a superuser (ADMIN)

```bash
python manage.py createsuperuser
```

### 7. Run the development server

```bash
python manage.py runserver
```

Visit: `http://127.0.0.1:8000`

---

## 🔐 Authentication

All API endpoints require JWT authentication except `/api/accounts/register/` and `/api/token/`.

### Get tokens

```http
POST /api/token/
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

### Use token in requests

```http
Authorization: Bearer <access_token>
```

### Refresh token

```http
POST /api/token/refresh/
Content-Type: application/json

{
  "refresh": "<refresh_token>"
}
```

### Logout (blacklist token)

```http
POST /api/accounts/logout/
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refresh": "<refresh_token>"
}
```

---

## 👥 Roles

| Role | Description |
|---|---|
| `ADMIN` | Full access. Created only via `createsuperuser`. |
| `SUPERVISOR` | Can manage operations. |
| `MAINTENANCE` | Access to maintenance endpoints. |
| `GROUND_STAFF` | Read-only access to most endpoints. |

> ⚠️ Self-registration as `ADMIN` is blocked by the API.

---

## 📡 API Endpoints

| Resource | Endpoint |
|---|---|
| Register | `POST /api/accounts/register/` |
| Login | `POST /api/token/` |
| Refresh | `POST /api/token/refresh/` |
| Logout | `POST /api/accounts/logout/` |
| Profile | `GET/PUT /api/accounts/profile/` |
| Flights | `/api/flights/` |
| Gates | `/api/gates/` |
| Baggage | `/api/baggage/` |
| Maintenance | `/api/maintenance/` |
| Staff | `/api/staff/` |
| Notifications | `/api/notifications/` |
| Reports | `/api/reports/` |

Full interactive docs available at:
- Swagger UI: `http://127.0.0.1:8000/swagger/`
- ReDoc: `http://127.0.0.1:8000/redoc/`

> 🔒 Swagger requires authentication. Use the Bearer token via the Authorize button.

---

## 🧪 Running Tests

### Unit + edge case tests

```bash
python manage.py test core_app --verbosity=2
```

### Integration tests

```bash
python manage.py test core_app.integration_tests --verbosity=2
```

### All tests

```bash
python manage.py test --verbosity=2
```

---

## 🚀 Production Deployment

### Railway (Backend)

1. Push code to GitHub
2. Create a new Railway project → connect your repo
3. Add PostgreSQL plugin → copy `DATABASE_URL`
4. Set environment variables in Railway dashboard:
   - `SECRET_KEY`
   - `DEBUG=False`
   - `ALLOWED_HOSTS=your-railway-domain.up.railway.app`
   - `CORS_ALLOWED_ORIGINS=https://your-frontend.onrender.com`
   - `DATABASE_URL` (auto-set by Railway PostgreSQL plugin)
5. Add start command: `python manage.py migrate && gunicorn backend.wsgi`

### Render (Frontend)

The frontend is served as static files by Django — no separate Render deployment needed unless you split it out.

---

## 🔒 Security Features

- JWT authentication with token blacklisting on logout
- Rate limiting on login: 5 attempts/minute per IP
- ADMIN role blocked from self-registration
- Explicit CORS allowed origins (no wildcard)
- PostgreSQL in production (not SQLite)
- DB indexes on frequently filtered fields
- Password validation enforced

---

## 📦 Dependencies

Install all with:

```bash
pip install -r requirements.txt
```

Key packages: `django`, `djangorestframework`, `djangorestframework-simplejwt`, `django-cors-headers`, `drf-yasg`, `django-filter`, `django-ratelimit`, `dj-database-url`, `python-decouple`, `gunicorn`, `psycopg2-binary`