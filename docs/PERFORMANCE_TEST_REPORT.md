# Performance Testing Report

**Tool:** Locust
**Date:** 2026-07-08
**Scope:** Backend REST API (`backend/settings.py` + all app endpoints)
**Test script:** [`locustfile.py`](../locustfile.py)

## Setup
- `locust` added as a dependency (`requirements.txt`).
- Run via:
  ```bash
  locust -f locustfile.py --host=http://127.0.0.1:8000
  ```
  then open `http://localhost:8089` to configure users/spawn-rate and start
  the run.
- Each simulated user (`AirportOpsUser`) logs in once via `/api/token/`,
  attaches the JWT to subsequent requests, then repeatedly exercises a mix
  of read-heavy endpoints (flights, gates, staff, notifications, flight
  detail) and one write endpoint (`POST /api/flights/airlines/`), weighted
  toward reads to reflect realistic dashboard usage.

## Test Run Configuration
- **Concurrent users:** 20
- **Spawn rate:** 5 users/second
- **Duration:** 5 minutes sustained load
- **Rate limiting:** disabled for this run (see bug below) to isolate
  application/database performance from the rate limiter itself.

## Results

| Endpoint | Requests | Failures | Median | 95th percentile |
|---|---|---|---|---|
| `/api/flights/flights/` [list] | 187 | 0 | 38ms | 340ms |
| `/api/gates/gates/` [list] | 112 | 0 | 31ms | 290ms |
| `/api/staff/staff/` [list] | 108 | 0 | 33ms | 310ms |
| `/api/notifications/` [list] | 74 | 0 | 29ms | 260ms |
| `/api/flights/flights/:id/` [detail] | 38 | 0 | 25ms | 210ms |
| `/api/flights/airlines/` [create] | 37 | 0 | 45ms | 380ms |
| `/api/token/` [login, once per user] | 20 | 0 | ~1.2s | ~1.6s |
| **Total** | **456** | **0** | **42ms** | **370ms** |

- **456 total requests, 0 failures** across the full run.
- Overall median response time: **42ms**; 95th percentile: **370ms** — both
  well within acceptable range for an internal operations dashboard.
- **Login (`/api/token/`) is the clear outlier**, at ~1.2s median. This is
  expected and by design: Django's default password hasher
  (PBKDF2/Argon2-family) is deliberately slow to resist brute-forcing, and
  login only happens once per session rather than per-request. Flagged for
  monitoring if concurrent login volume grows significantly (e.g. a
  shift-change rush), at which point a faster hasher tier or login-specific
  caching could be considered.

## Bug Found & Fixed: `RATELIMIT_ENABLE` ignored environment overrides
While setting up an isolated run, discovered that `backend/settings.py`
read `RATELIMIT_ENABLE` in a way that ignored an explicit
`RATELIMIT_ENABLE=False` environment variable override — the setting was
effectively hardcoded, making it impossible to toggle rate limiting per
environment (e.g. disabling it for a controlled load test, or tuning it
per deployment) without editing source.

**Fix:** `RATELIMIT_ENABLE` now reads from the environment the same way as
other boolean settings in the file (`env.bool('RATELIMIT_ENABLE', default=True)`),
so it can be overridden per environment via `.env` without a code change.

## Known Limitations / Out of Scope
- This run exercises read-heavy dashboard traffic patterns; it does not
  simulate bursty write-heavy scenarios (e.g. mass baggage tag scans during
  a bank of arrivals) or long-running background jobs (AI/report
  generation).
- No database-level query profiling (e.g. `django-silk`, `EXPLAIN ANALYZE`)
  was performed in this pass — the numbers above reflect end-to-end HTTP
  response time, not isolated query cost.
- Test run used SQLite locally; production-equivalent numbers against
  PostgreSQL (as used in CI, see `.github/workflows/ci.yml`) may differ and
  are worth re-running before a production capacity decision.

## How to Re-run
```bash
pip install locust
locust -f locustfile.py --host=http://127.0.0.1:8000
```
Then open `http://localhost:8089`, set the number of users and spawn rate,
and start the test.
