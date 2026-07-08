# Security Testing Report

**Date:** 2026-07-08
**Scope:** Backend (Django + DRF)

## 1. Static Code Analysis (Bandit)
Tool: `bandit -r . -x .\venv,.\frontend,.\migrations --severity-level medium`

| Metric | Result |
|---|---|
| Lines scanned | 11,953 |
| High severity issues | 0 |
| Medium severity issues | 0 |
| Low severity issues | 55 (informational, no action required) |

Full report: `security_bandit_report.txt`

## 2. Dependency Vulnerability Scan (pip-audit)
Initial scan found 12 known CVEs in `pip`, `requests`, and `setuptools`.
All resolved by upgrading to latest versions:
- `pip` 24.0 → 26.1.2
- `requests` 2.32.3 → 2.34.2
- `setuptools` 65.5.0 → 83.0.0

Final result: **No known vulnerabilities found.**

## 3. Application Security Test Suite
Location: `core_app/security_tests.py` — run via
`python manage.py test core_app.security_tests`

| Test | What it verifies |
|---|---|
| `test_flights_list_requires_auth` | Unauthenticated requests are rejected (401) |
| `test_gates_list_requires_auth` | Unauthenticated requests are rejected (401) |
| `test_staff_list_requires_auth` | Unauthenticated requests are rejected (401) |
| `test_invalid_token_rejected` | Malformed/fake JWT tokens are rejected (401) |
| `test_regular_user_cannot_create_airline` | Role-based write restrictions enforced (403) |
| `test_admin_can_create_airline` | Admin role has expected write access |
| `test_wrong_password_rejected` | Invalid credentials rejected (401) |
| `test_404_does_not_leak_debug_traceback` | Error responses don't expose stack traces |
| `test_malformed_request_does_not_leak_secret_key` | `SECRET_KEY` never appears in responses |
| `test_repeated_failed_logins_are_rate_limited` | Login blocked after 5 failed attempts/minute |

**Result: 10/10 passed.**

## 4. Fixes Applied During This Round
- `SECRET_KEY` regenerated to 50 characters (was 20 bytes — below HMAC/SHA256's
  recommended 32-byte minimum, per `InsecureKeyLengthWarning`)
- `pip`, `requests`, `setuptools` upgraded to patch known CVEs

## 5. Known Limitations / Out of Scope
- No penetration testing (manual exploit attempts) performed
- No SAST tool run against the frontend (React) codebase
- Rate limiting confirmed on login only, not yet on chatbot/AI endpoints
  (matches README's documented "Known Gaps")