"""
Shared tool definitions + conversation-history helper for the LLM-backed
chatbot engines (llm_engine.py = Claude, gemini_engine.py = Gemini).

Keeping this in one place means the two providers can't drift apart and
each provider file only has to hold its own API-call plumbing.
"""
from flights.models import Flight
from gates.models import Gate
from .models import AIChatMessage

try:
    from staff.models import Staff
except Exception:
    Staff = None

MAX_HISTORY_MESSAGES = 30  # prior turns from this session sent as real history

SYSTEM_PROMPT = (
    "You are AeroGround AI, the assistant embedded in an Airport Ground Operations Management "
    "System. You have two jobs, and you do both in the same conversation without making the user "
    "pick a mode:\n\n"
    "1) OPS DATA: You help staff check flight status, delay risk, gate assignments/availability, "
    "predictive maintenance, staffing requirements, weather risk, flight schedules, real delay "
    "causes, gate congestion, baggage tracking, open maintenance requests, staff info, "
    "notifications, cargo/ULD status, incidents, ramp inspections, fuel operations, catering, "
    "cabin cleaning, water/lavatory service, and passenger boarding. Always use the provided "
    "tools to look up real data instead of guessing - never invent flight numbers, times, or "
    "statuses. For any question about flight availability or schedule (e.g. 'any flights "
    "available?', 'flights today?', 'is there a flight at 3pm?', 'flights tomorrow'), call the "
    "check_schedule tool - pass the user's question through as the query, mostly as-is. That tool "
    "already checks BOTH the uploaded Excel/CSV sheet AND the system's own live flight database "
    "internally, and returns its answer pre-formatted as two sections headed 'According to sheet:' "
    "and 'According to database:'. Reply with that returned answer text completely verbatim - do "
    "NOT summarize it, reformat it, translate it into prose, drop either section, or add your own "
    "framing around it. Just return exactly what the tool gave you, as your entire response. Use "
    "list_flights only for other flight-database lookups that are not availability/schedule "
    "questions (e.g. filtering by route alone with no schedule intent). When someone asks WHY a "
    "flight is delayed or WHY a gate is congested, prefer "
    "explain_delay / get_gate_congestion over the plain predict_delay tool, since those give real "
    "recorded causes instead of just a risk score. Use the ongoing conversation to resolve "
    "follow-up questions (e.g. 'what about tomorrow?' or 'is it delayed?' referring to a flight "
    "named earlier). Keep these answers concise and in an operational tone: short lines, "
    "bullet-style facts, no fluff. If a tool returns an error or no match, say so plainly and ask "
    "for the missing detail (e.g. a valid flight number).\n\n"
    "2) GENERAL QUESTIONS: You're also a normal, capable AI assistant. If someone asks something "
    "with nothing to do with airport ops - general knowledge, explaining a concept, coding help, "
    "writing/drafting help, math, advice, casual conversation, etc. - just answer it directly and "
    "helpfully, in whatever length and tone actually fits the question (not forced into the terse "
    "ops style). Don't refuse or redirect general questions back to ops topics, and don't claim "
    "you can only help with airport operations - that's no longer true. Only reach for the ops "
    "tools when the question is actually about this system's data."
)


def _find_flight(flight_number):
    return Flight.objects.filter(flight_number__iexact=(flight_number or "").strip()).first()


# ---------------------------------------------------------------------------
# Core flight / gate tools
# ---------------------------------------------------------------------------

def _tool_get_flight_status(args):
    flight = _find_flight(args.get("flight_number", ""))
    if not flight:
        return {"error": f"No flight found with number '{args.get('flight_number')}'."}
    return {
        "flight_number": flight.flight_number,
        "airline": flight.airline.name,
        "status": flight.get_status_display(),
        "departure_time": flight.departure_time.strftime("%Y-%m-%d %H:%M"),
        "arrival_time": flight.arrival_time.strftime("%Y-%m-%d %H:%M"),
        "origin": flight.origin,
        "destination": flight.destination,
    }


def _tool_predict_delay(args):
    flight = _find_flight(args.get("flight_number", ""))
    if not flight:
        return {"error": f"No flight found with number '{args.get('flight_number')}'."}
    from .ml.predictor import predict_delay
    result, confidence = predict_delay(flight)
    return {"flight_number": flight.flight_number, "confidence": confidence, **result}


def _tool_gate_info(args):
    flight_number, gate_number = args.get("flight_number"), args.get("gate_number")
    if flight_number:
        flight = _find_flight(flight_number)
        if not flight:
            return {"error": f"No flight found with number '{flight_number}'."}
        gate_step = flight.workflow_steps.filter(step='GATE_ASSIGNED').first()
        if gate_step:
            return {"flight_number": flight.flight_number, "gate_assigned": True,
                     "assigned_at": gate_step.completed_at.strftime("%Y-%m-%d %H:%M")}
        from .views import recommend_gate
        result, confidence = recommend_gate(flight)
        return {"flight_number": flight.flight_number, "gate_assigned": False,
                 "recommendation": result, "confidence": confidence}
    if gate_number:
        gate = Gate.objects.filter(gate_number__iexact=gate_number).first()
        if not gate:
            return {"error": f"No gate found with number '{gate_number}'."}
        return {"gate_number": gate.gate_number, "terminal": gate.terminal, "available": gate.is_available}
    return {"error": "Provide a flight_number or gate_number."}


def _tool_gate_availability(args):
    available = list(Gate.objects.filter(is_available=True).values_list('gate_number', flat=True))
    return {"available_count": len(available), "gates": available[:20]}


def _predict_tool(predictor_name):
    def _run(args):
        flight = _find_flight(args.get("flight_number", ""))
        if not flight:
            return {"error": f"No flight found with number '{args.get('flight_number')}'."}
        from .ml import predictor as p
        result, confidence = getattr(p, predictor_name)(flight)
        return {"flight_number": flight.flight_number, "confidence": confidence, **result}
    return _run


def _tool_check_schedule(args):
    from .chatbot import _check_schedule
    query = args.get("query", "")
    return {"answer": _check_schedule(query, query.lower())}


def _tool_list_flights(args):
    """
    Looks up real flights already recorded in this system's database (the
    Flights module - flights created/tracked in the app itself), as opposed
    to check_schedule which only reads an uploaded Excel/CSV reference sheet.
    Use this whenever someone asks about flights/availability without
    clearly meaning the uploaded sheet - this is the actual live data.
    """
    import datetime as _dt
    from django.utils import timezone as _tz

    day = (args.get("day") or "").strip().lower()
    origin = (args.get("origin") or "").strip()
    destination = (args.get("destination") or "").strip()
    start_time = (args.get("start_time") or "").strip()  # "HH:MM" 24h
    end_time = (args.get("end_time") or "").strip()      # "HH:MM" 24h

    qs = Flight.objects.select_related('airline').all()

    if origin:
        qs = qs.filter(origin__icontains=origin)
    if destination:
        qs = qs.filter(destination__icontains=destination)

    target_date = None
    if day in ("today", ""):
        target_date = _tz.localdate()
    elif day == "tomorrow":
        target_date = _tz.localdate() + _dt.timedelta(days=1)
    elif day:
        try:
            target_date = _dt.datetime.strptime(day, "%Y-%m-%d").date()
        except ValueError:
            target_date = None

    if target_date:
        qs = qs.filter(departure_time__date=target_date)

    matches = list(qs.order_by('departure_time'))

    if start_time and end_time:
        try:
            h1, m1 = map(int, start_time.split(":"))
            h2, m2 = map(int, end_time.split(":"))
            lo, hi = h1 * 60 + m1, h2 * 60 + m2
            if hi < lo:
                lo, hi = hi, lo
            matches = [
                f for f in matches
                if lo <= (f.departure_time.hour * 60 + f.departure_time.minute) <= hi
            ]
        except ValueError:
            pass

    if not matches:
        return {"found": 0, "flights": [], "note": "No matching flights in the database."}

    return {
        "found": len(matches),
        "flights": [
            {
                "flight_number": f.flight_number,
                "airline": f.airline.name,
                "origin": f.origin,
                "destination": f.destination,
                "departure_time": f.departure_time.strftime("%Y-%m-%d %H:%M"),
                "status": f.get_status_display(),
            }
            for f in matches[:15]
        ],
    }


def _tool_explain_delay(args):
    """
    Real (non-ML) delay explanation for a flight - pulls the actual
    turnaround tasks marked DELAYED, their delay_reason, and estimates a
    new expected departure. This is what answers "why is AI204 delayed?"
    with real data instead of a risk score.
    """
    flight = _find_flight(args.get("flight_number", ""))
    if not flight:
        return {"error": f"No flight found with number '{args.get('flight_number')}'."}

    delayed_tasks = list(
        flight.turnaround_tasks.filter(status='DELAYED').order_by('scheduled_time')
    )

    if not delayed_tasks:
        return {
            "flight_number": flight.flight_number,
            "on_time": True,
            "scheduled_departure": flight.departure_time.strftime("%Y-%m-%d %H:%M"),
            "message": "No delayed turnaround tasks recorded - this flight is currently on schedule.",
        }

    reasons = [
        {"task": t.get_task_type_display(), "reason": t.get_delay_reason_display()}
        for t in delayed_tasks
    ]
    estimated_delay_minutes = len(delayed_tasks) * 15
    from datetime import timedelta
    new_eta = flight.departure_time + timedelta(minutes=estimated_delay_minutes)

    return {
        "flight_number": flight.flight_number,
        "on_time": False,
        "scheduled_departure": flight.departure_time.strftime("%Y-%m-%d %H:%M"),
        "new_expected_departure": new_eta.strftime("%Y-%m-%d %H:%M"),
        "estimated_delay_minutes": estimated_delay_minutes,
        "causes": reasons,
    }


def _tool_gate_congestion(args):
    """
    Congestion score/level for a specific gate - same scoring the Heat
    Map page uses, exposed here so the assistant can explain *why* a gate
    is busy (e.g. "why is gate A1 congested?").
    """
    gate_number = args.get("gate_number", "")
    gate = Gate.objects.filter(gate_number__iexact=gate_number.strip()).first()
    if not gate:
        return {"error": f"No gate found with number '{gate_number}'."}

    from django.utils import timezone
    from gates.models import GateAssignment
    from turnaround.models import TurnaroundTask

    today = timezone.now().date()
    todays_assignments = GateAssignment.objects.filter(gate=gate, assigned_at__date=today)
    assignments_count = todays_assignments.count()
    flight_ids = list(todays_assignments.values_list('flight_id', flat=True))
    delayed_tasks_count = TurnaroundTask.objects.filter(
        flight_id__in=flight_ids, status='DELAYED'
    ).count() if flight_ids else 0
    is_occupied = GateAssignment.objects.filter(gate=gate, status='assigned').exists()

    score = 0
    if is_occupied:
        score += 30
    score += min(assignments_count * 15, 45)
    score += min(delayed_tasks_count * 10, 40)
    if gate.is_under_maintenance:
        score = 100
    score = min(score, 100)
    level = 'high' if score >= 66 else ('medium' if score >= 33 else 'low')

    return {
        "gate_number": gate.gate_number,
        "congestion_score": score,
        "level": level,
        "is_under_maintenance": gate.is_under_maintenance,
        "is_occupied": is_occupied,
        "flights_handled_today": assignments_count,
        "delayed_tasks_today": delayed_tasks_count,
    }


# ---------------------------------------------------------------------------
# Batch 1: Baggage, Maintenance, Staff, Notifications
# ---------------------------------------------------------------------------

def _tool_get_baggage_status(args):
    from baggage.models import Baggage
    tag = (args.get("baggage_tag") or "").strip()
    bag = Baggage.objects.filter(baggage_tag__iexact=tag).select_related('flight').first()
    if not bag:
        return {"error": f"No baggage found with tag '{tag}'."}
    latest = bag.tracking_history.order_by('-updated_at').first()
    return {
        "baggage_tag": bag.baggage_tag,
        "passenger_name": bag.passenger_name,
        "flight_number": bag.flight.flight_number,
        "current_status": latest.get_status_display() if latest else "No tracking history yet",
        "location": latest.location if latest else None,
        "last_updated": latest.updated_at.strftime("%Y-%m-%d %H:%M") if latest else None,
    }


def _tool_get_maintenance_requests(args):
    from maintenance.models import MaintenanceRequest
    reg = (args.get("aircraft_registration") or "").strip()
    flight_number = (args.get("flight_number") or "").strip()
    qs = MaintenanceRequest.objects.select_related('aircraft').exclude(status__in=['RESOLVED', 'CLOSED'])
    if flight_number:
        flight = _find_flight(flight_number)
        if not flight:
            return {"error": f"No flight found with number '{flight_number}'."}
        qs = qs.filter(aircraft=flight.aircraft)
    elif reg:
        qs = qs.filter(aircraft__registration_number__iexact=reg)
    else:
        return {"error": "Provide a flight_number or aircraft_registration."}
    requests = list(qs.order_by('-priority')[:10])
    if not requests:
        return {"open_requests": [], "message": "No open maintenance requests."}
    return {"open_requests": [
        {"aircraft": r.aircraft.registration_number, "issue": r.issue_description,
         "priority": r.priority, "status": r.get_status_display()}
        for r in requests
    ]}


def _tool_get_staff_info(args):
    if Staff is None:
        return {"error": "Staff module unavailable."}
    query = (args.get("name_or_employee_id") or "").strip()
    staff = Staff.objects.filter(employee_id__iexact=query).first() \
        or Staff.objects.filter(name__icontains=query).first()
    if not staff:
        return {"error": f"No staff member found matching '{query}'."}
    return {
        "name": staff.name,
        "employee_id": staff.employee_id,
        "staff_type": staff.get_staff_type_display(),
        "is_active": staff.is_active,
    }


def _tool_get_unread_notifications(args):
    username = (args.get("username") or "").strip()
    from notifications.models import Notification
    from accounts.models import User
    user_obj = User.objects.filter(username__iexact=username).first()
    if not user_obj:
        return {"error": f"No user found with username '{username}'."}
    unread = Notification.objects.filter(user=user_obj, is_read=False).order_by('-created_at')
    return {
        "unread_count": unread.count(),
        "recent": [{"type": n.get_type_display(), "message": n.message} for n in unread[:5]],
    }


# ---------------------------------------------------------------------------
# Batch 2: Cargo (ULD), Incidents, Ramp Inspections, Fuel
# ---------------------------------------------------------------------------

def _tool_get_uld_status(args):
    from cargo_management.models import ULD
    uld_id = (args.get("uld_id") or "").strip()
    uld = ULD.objects.filter(uld_id__iexact=uld_id).select_related('flight').first()
    if not uld:
        return {"error": f"No ULD found with id '{uld_id}'."}
    return {
        "uld_id": uld.uld_id,
        "type": uld.get_uld_type_display(),
        "status": uld.get_status_display(),
        "flight_number": uld.flight.flight_number if uld.flight else None,
        "position": uld.position,
        "weight_kg": float(uld.weight_kg),
    }


def _tool_get_incidents(args):
    from incident_management.models import Incident
    flight_number = (args.get("flight_number") or "").strip()
    qs = Incident.objects.exclude(status__in=['RESOLVED', 'CLOSED']).order_by('-occurred_at')
    if flight_number:
        flight = _find_flight(flight_number)
        if not flight:
            return {"error": f"No flight found with number '{flight_number}'."}
        qs = qs.filter(flight=flight)
    incidents = list(qs[:10])
    if not incidents:
        return {"incidents": [], "message": "No open incidents found."}
    return {"incidents": [
        {"type": i.get_incident_type_display(), "severity": i.get_severity_display(),
         "status": i.get_status_display(), "location": i.location,
         "occurred_at": i.occurred_at.strftime("%Y-%m-%d %H:%M")}
        for i in incidents
    ]}


def _tool_get_ramp_inspection(args):
    from ramp_operations.models import RampInspection
    flight = _find_flight(args.get("flight_number", ""))
    if not flight:
        return {"error": f"No flight found with number '{args.get('flight_number')}'."}
    inspection = flight.ramp_inspections.order_by('-created_at').first()
    if not inspection:
        return {"message": f"No ramp inspection recorded yet for {flight.flight_number}."}
    return {
        "flight_number": flight.flight_number,
        "stand": inspection.stand,
        "status": inspection.get_status_display(),
        "cone_placement_ok": inspection.cone_placement_ok,
        "safety_zone_clear": inspection.safety_zone_clear,
        "fod_check_clear": inspection.fod_check_clear,
        "findings": inspection.findings or None,
    }


def _tool_get_fuel_status(args):
    flight = _find_flight(args.get("flight_number", ""))
    if not flight:
        return {"error": f"No flight found with number '{args.get('flight_number')}'."}
    op = flight.fuel_operations.order_by('-created_at').first()
    if not op:
        return {"message": f"No fuel operation recorded yet for {flight.flight_number}."}
    return {
        "flight_number": flight.flight_number,
        "status": op.get_status_display(),
        "quantity_liters": float(op.quantity_liters),
        "fuel_truck": op.fuel_truck.truck_code if op.fuel_truck else None,
        "fuel_company": op.fuel_company.name if op.fuel_company else None,
    }


# ---------------------------------------------------------------------------
# Batch 3: Catering, Cleaning, Water/Lavatory, Boarding
# ---------------------------------------------------------------------------

def _tool_get_catering_status(args):
    flight = _find_flight(args.get("flight_number", ""))
    if not flight:
        return {"error": f"No flight found with number '{args.get('flight_number')}'."}
    orders = list(flight.catering_orders.order_by('-created_at')[:5])
    if not orders:
        return {"message": f"No catering orders recorded yet for {flight.flight_number}."}
    return {"flight_number": flight.flight_number, "orders": [
        {"meal_type": o.get_meal_type_display(), "meal_count": o.meal_count,
         "status": o.get_status_display(), "loading_completed": o.loading_completed}
        for o in orders
    ]}


def _tool_get_cleaning_status(args):
    flight = _find_flight(args.get("flight_number", ""))
    if not flight:
        return {"error": f"No flight found with number '{args.get('flight_number')}'."}
    task = flight.cleaning_tasks.order_by('-created_at').first()
    if not task:
        return {"message": f"No cleaning task recorded yet for {flight.flight_number}."}
    return {
        "flight_number": flight.flight_number,
        "status": task.get_status_display(),
        "interior_cleaned": task.interior_cleaned,
        "exterior_wash": task.exterior_wash,
        "waste_removed": task.waste_removed,
        "cabin_ready": task.cabin_ready,
    }


def _tool_get_water_lavatory_status(args):
    flight = _find_flight(args.get("flight_number", ""))
    if not flight:
        return {"error": f"No flight found with number '{args.get('flight_number')}'."}
    service = flight.water_lavatory_services.order_by('-created_at').first()
    if not service:
        return {"message": f"No water/lavatory service recorded yet for {flight.flight_number}."}
    return {
        "flight_number": flight.flight_number,
        "status": service.get_status_display(),
        "potable_water_refilled": service.potable_water_refilled,
        "lavatory_serviced": service.lavatory_serviced,
        "waste_disposed": service.waste_disposed,
    }


def _tool_get_boarding_status(args):
    flight = _find_flight(args.get("flight_number", ""))
    if not flight:
        return {"error": f"No flight found with number '{args.get('flight_number')}'."}
    session = getattr(flight, 'boarding_session', None)
    if not session:
        return {"message": f"No boarding session recorded yet for {flight.flight_number}."}
    return {
        "flight_number": flight.flight_number,
        "status": session.get_status_display(),
        "boarding_gate": session.boarding_gate,
        "passenger_count": session.passenger_count,
        "passengers_boarded": session.passengers_boarded,
    }


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

TOOLS = [
    {"name": "get_flight_status",
     "description": "Get the current status, route, and scheduled times for a specific flight.",
     "input_schema": {"type": "object", "properties": {"flight_number": {"type": "string", "description": "e.g. AI202"}},
                       "required": ["flight_number"]}},
    {"name": "predict_delay",
     "description": "Get the ML delay-risk prediction for a specific flight.",
     "input_schema": {"type": "object", "properties": {"flight_number": {"type": "string"}}, "required": ["flight_number"]}},
    {"name": "get_gate_info",
     "description": "Get gate assignment/recommendation for a flight, or status of a specific gate. Provide exactly one of flight_number or gate_number.",
     "input_schema": {"type": "object", "properties": {"flight_number": {"type": "string"}, "gate_number": {"type": "string"}}}},
    {"name": "get_available_gates",
     "description": "List currently available (unoccupied) gates.",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "predict_maintenance",
     "description": "Get predictive-maintenance urgency and at-risk components for a flight's aircraft.",
     "input_schema": {"type": "object", "properties": {"flight_number": {"type": "string"}}, "required": ["flight_number"]}},
    {"name": "predict_staff",
     "description": "Get required ground crew / security / baggage staffing numbers for a flight.",
     "input_schema": {"type": "object", "properties": {"flight_number": {"type": "string"}}, "required": ["flight_number"]}},
    {"name": "predict_weather",
     "description": "Get weather-risk assessment for a flight.",
     "input_schema": {"type": "object", "properties": {"flight_number": {"type": "string"}}, "required": ["flight_number"]}},
    {"name": "check_schedule",
     "description": ("Answers flight availability/schedule questions by checking BOTH the uploaded "
                      "Excel/CSV reference sheet AND the system's own live flight database, and "
                      "returns a pre-formatted answer with 'According to sheet:' and 'According to "
                      "database:' sections already built in. Pass the user's question through as the "
                      "query, e.g. 'any flights available?', 'any flights between 8pm and 9pm', "
                      "'flights tomorrow', 'flight at 3:30pm from Delhi to Mumbai'. Return the "
                      "resulting answer text verbatim as your whole response - do not rewrite it."),
     "input_schema": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}},
    {"name": "list_flights",
     "description": ("Look up real flights recorded in this system's own database (the Flights module) by day, "
                      "time window, and/or route, returned as raw data (not pre-formatted). Use this only for "
                      "flight lookups that are NOT availability/schedule questions - prefer check_schedule "
                      "for anything like 'any flights available?' or 'flights today?'."),
     "input_schema": {"type": "object", "properties": {
         "day": {"type": "string", "description": "'today', 'tomorrow', or YYYY-MM-DD. Omit for no date filter."},
         "origin": {"type": "string"},
         "destination": {"type": "string"},
         "start_time": {"type": "string", "description": "24h HH:MM, start of a time window"},
         "end_time": {"type": "string", "description": "24h HH:MM, end of a time window"},
     }, "required": []}},
    {"name": "explain_delay",
     "description": ("Explain WHY a specific flight is delayed, using real recorded turnaround-task delay "
                      "reasons (not the ML risk score) and a new estimated departure time. Use this whenever "
                      "someone asks 'why is <flight> delayed' or 'what's holding up <flight>'."),
     "input_schema": {"type": "object", "properties": {"flight_number": {"type": "string"}}, "required": ["flight_number"]}},
    {"name": "get_gate_congestion",
     "description": ("Get the live congestion score/level for a specific gate and why it's busy (flights "
                      "handled today, delayed tasks, maintenance status). Use for 'why is gate X congested/busy'."),
     "input_schema": {"type": "object", "properties": {"gate_number": {"type": "string"}}, "required": ["gate_number"]}},
    {"name": "get_baggage_status",
     "description": "Get current tracking status and location for a specific baggage tag.",
     "input_schema": {"type": "object", "properties": {"baggage_tag": {"type": "string"}}, "required": ["baggage_tag"]}},
    {"name": "get_maintenance_requests",
     "description": "List open maintenance requests for an aircraft, identified by flight_number or aircraft_registration.",
     "input_schema": {"type": "object", "properties": {"flight_number": {"type": "string"}, "aircraft_registration": {"type": "string"}}}},
    {"name": "get_staff_info",
     "description": "Look up a staff member's role and active status by name or employee ID.",
     "input_schema": {"type": "object", "properties": {"name_or_employee_id": {"type": "string"}}, "required": ["name_or_employee_id"]}},
    {"name": "get_unread_notifications",
     "description": "Get a user's unread notification count and the most recent ones, by username.",
     "input_schema": {"type": "object", "properties": {"username": {"type": "string"}}, "required": ["username"]}},
    {"name": "get_uld_status",
     "description": "Get status, flight, and position of a cargo ULD (container/pallet) by its ID.",
     "input_schema": {"type": "object", "properties": {"uld_id": {"type": "string"}}, "required": ["uld_id"]}},
    {"name": "get_incidents",
     "description": "List open/unresolved safety incidents, optionally filtered to one flight.",
     "input_schema": {"type": "object", "properties": {"flight_number": {"type": "string"}}}},
    {"name": "get_ramp_inspection",
     "description": "Get the latest ramp safety inspection (cones, safety zone, FOD check) for a flight.",
     "input_schema": {"type": "object", "properties": {"flight_number": {"type": "string"}}, "required": ["flight_number"]}},
    {"name": "get_fuel_status",
     "description": "Get the latest fuel operation status/quantity/truck for a flight.",
     "input_schema": {"type": "object", "properties": {"flight_number": {"type": "string"}}, "required": ["flight_number"]}},
    {"name": "get_catering_status",
     "description": "Get catering order status(es) - meal type, count, loading status - for a flight.",
     "input_schema": {"type": "object", "properties": {"flight_number": {"type": "string"}}, "required": ["flight_number"]}},
    {"name": "get_cleaning_status",
     "description": "Get the aircraft cabin cleaning task status for a flight.",
     "input_schema": {"type": "object", "properties": {"flight_number": {"type": "string"}}, "required": ["flight_number"]}},
    {"name": "get_water_lavatory_status",
     "description": "Get water refill / lavatory servicing status for a flight.",
     "input_schema": {"type": "object", "properties": {"flight_number": {"type": "string"}}, "required": ["flight_number"]}},
    {"name": "get_boarding_status",
     "description": "Get passenger boarding session status, gate, and boarded count for a flight.",
     "input_schema": {"type": "object", "properties": {"flight_number": {"type": "string"}}, "required": ["flight_number"]}},
]

TOOL_FUNCTIONS = {
    "get_flight_status": _tool_get_flight_status,
    "predict_delay": _tool_predict_delay,
    "get_gate_info": _tool_gate_info,
    "get_available_gates": _tool_gate_availability,
    "predict_maintenance": _predict_tool("predict_maintenance"),
    "predict_staff": _predict_tool("predict_staff"),
    "predict_weather": _predict_tool("predict_weather_risk"),
    "check_schedule": _tool_check_schedule,
    "list_flights": _tool_list_flights,
    "explain_delay": _tool_explain_delay,
    "get_gate_congestion": _tool_gate_congestion,
    "get_baggage_status": _tool_get_baggage_status,
    "get_maintenance_requests": _tool_get_maintenance_requests,
    "get_staff_info": _tool_get_staff_info,
    "get_unread_notifications": _tool_get_unread_notifications,
    "get_uld_status": _tool_get_uld_status,
    "get_incidents": _tool_get_incidents,
    "get_ramp_inspection": _tool_get_ramp_inspection,
    "get_fuel_status": _tool_get_fuel_status,
    "get_catering_status": _tool_get_catering_status,
    "get_cleaning_status": _tool_get_cleaning_status,
    "get_water_lavatory_status": _tool_get_water_lavatory_status,
    "get_boarding_status": _tool_get_boarding_status,
}


def run_tool(name, args):
    """Execute a tool by name, always returning a JSON-safe dict (never raises)."""
    func = TOOL_FUNCTIONS.get(name)
    if not func:
        return {"error": f"Unknown tool {name}"}
    try:
        return func(args or {})
    except Exception as e:
        return {"error": str(e)}


def fetch_history(user, session_id):
    """This session's past turns as (role, content) pairs - the actual
    conversation memory each provider formats into its own message shape."""
    if not user or not session_id:
        return []
    msgs = list(
        AIChatMessage.objects.filter(user=user, session_id=session_id)
        .order_by('-id')[:MAX_HISTORY_MESSAGES]
    )
    msgs.reverse()
    return [(m.role, m.content) for m in msgs]