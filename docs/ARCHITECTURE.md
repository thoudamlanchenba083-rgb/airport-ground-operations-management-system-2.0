# Backend Architecture: Services Layer

## Pattern
Business logic that goes beyond simple CRUD (multi-step validation, cross-model
rules, orchestration of side effects) lives in a `services.py` file per app,
not in `views.py`. Views stay thin: parse the request, call the service,
translate the result/exception into an HTTP response.
app/
├── models.py       # data + simple model-level helpers
├── services.py     # business rules, orchestration, multi-step operations
├── views.py        # HTTP layer only — calls services, returns Response
├── serializers.py  # request/response shaping + field-level validation
## Why
- **Testability** — service methods can be unit-tested directly with plain
  Python objects, without spinning up request/response cycles.
- **Reuse** — the same business rule can be called from a view, a management
  command, a Celery task, or the AI module without duplicating logic.
- **Readability** — views reveal *what* an endpoint does; services reveal
  *how* the business rule works.

## Convention
- Each service raises a dedicated exception (e.g. `FlightWorkflowError`,
  `GateAssignmentError`, `StaffAssignmentError`) carrying a human-readable
  `.message` (and `.details` where relevant, e.g. rejected candidates).
- Views catch that exception and translate it into the appropriate DRF
  `Response` with a relevant status code — services never touch
  `rest_framework.Response` directly.
- Simple CRUD (create/update/delete with just an audit log call) stays in
  the view via `perform_create`/`perform_update`/`perform_destroy` — it
  isn't moved to a service unless it grows real business logic.

## Applied so far
| App | Service | Extracted logic |
|---|---|---|
| `flights` | `FlightWorkflowService` | Ground-ops workflow step transitions + all validation rules (gate conflict, maintenance clearance, baggage/weather checks, departure sequencing) |
| `gates` | `GateAssignmentService` | Manual + auto gate assignment, availability toggling, candidate selection |
| `staff` | `StaffAssignmentService` | Manual + auto staff assignment, candidate selection, turnaround-task linking |

Other apps (`baggage`, `maintenance`, `hr_management`, etc.) currently keep
simple CRUD directly in views, following the convention above — they can be
migrated to a `services.py` the same way if their logic grows.