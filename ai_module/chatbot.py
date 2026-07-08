"""
Retrieval-based AI chatbot for ground operations queries.

No external LLM API. Works by:
1. Extracting entities (flight numbers, gate numbers) from the message via regex.
2. Matching intent via keyword scoring.
3. Looking up live data from the DB (Flight, Gate, AIPrediction, etc.).
4. Filling a response template with that data.

This is intentionally swappable: ChatbotEngine.respond() is the only entry
point views.py calls. To later switch to a real LLM API, replace the body
of respond() with an API call and keep the same signature.
"""
import re
import difflib
from datetime import timedelta
from django.utils import timezone

from flights.models import Flight
from gates.models import Gate
from .models import FlightScheduleUpload, FlightScheduleRow, AIChatMessage

try:
    from staff.models import Staff
except Exception:
    Staff = None

try:
    from ground_equipment.models import Equipment
except Exception:
    Equipment = None


FLIGHT_NUMBER_RE = re.compile(r'\b([A-Z]{1,6}\d{2,5})\b', re.IGNORECASE)
GATE_NUMBER_RE = re.compile(r'\bgate\s*([A-Z]?\d{1,3})\b', re.IGNORECASE)

INTENTS = {
    'schedule_check': [
        'is there a flight', 'is there any flight', 'any flight at', 'any flights at',
        'flight at', 'flights at', 'flight around', 'flights around', 'flights between',
        'flight between', 'flight schedule', 'check the schedule', 'check schedule',
        'according to the excel', 'according to the sheet', 'in the excel', 'uploaded schedule',
        'any flight', 'any flights', 'flight options', 'flights available', 'flight available',
        'available flight', 'available flights', 'departing between', 'flights departing',
        'flight departing', 'flights are there', 'flight are there', 'flights there',
    ],
    'flight_status': ['status', 'where is', 'flight info', 'flight detail', 'when does', 'departure', 'arrival'],
    'delay_prediction': ['delay', 'late', 'on time', 'predict delay'],
    'gate_info': ['gate', 'which gate', 'gate number'],
    'gate_availability': ['available gate', 'free gate', 'open gate'],
    'maintenance': ['maintenance', 'repair', 'service due', 'grounded'],
    'staff_count': ['staff', 'crew', 'how many staff', 'ground crew'],
    'weather': ['weather', 'visibility', 'wind', 'storm', 'fog'],
    'greeting': ['hello', 'hi', 'hey', 'good morning', 'good evening'],
    'help': ['help', 'what can you do', 'commands'],
}


def _score_intent(text_lower):
    best_intent, best_score = None, 0
    for intent, keywords in INTENTS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > best_score:
            best_intent, best_score = intent, score
    return best_intent


def _extract_flight(text):
    """
    Find a flight the message refers to. Tries an exact match first; if the
    token looks like a flight number but doesn't exist (a typo like "A1202"
    or "AI20" for "AI202"), falls back to the closest real flight number.
    """
    matches = FLIGHT_NUMBER_RE.findall(text)
    for m in matches:
        flight = Flight.objects.filter(flight_number__iexact=m).first()
        if flight:
            return flight
    return None


def _extract_flight_with_suggestion(text):
    """
    Same as _extract_flight, but if nothing matches exactly, also returns the
    closest existing flight number (for typo suggestions) as a second value.
    Returns (flight_or_None, suggested_flight_number_or_None).
    """
    matches = FLIGHT_NUMBER_RE.findall(text)
    if not matches:
        return None, None

    all_numbers = list(Flight.objects.values_list('flight_number', flat=True))
    for m in matches:
        flight = Flight.objects.filter(flight_number__iexact=m).first()
        if flight:
            return flight, None

    for m in matches:
        close = difflib.get_close_matches(m.upper(), [n.upper() for n in all_numbers], n=1, cutoff=0.6)
        if close:
            real_number = next((n for n in all_numbers if n.upper() == close[0]), None)
            if real_number:
                return None, real_number
    return None, None


def _extract_gate(text):
    m = GATE_NUMBER_RE.search(text)
    if m:
        return Gate.objects.filter(gate_number__iexact=m.group(1)).first()
    return None


def _recent_user_messages(user, session_id, exclude_last=True, limit=6):
    """
    Last few user messages in this session, most recent first. The message
    the user just sent has already been saved to the DB by the time
    respond() runs, so by default we skip it (it's the current turn, not
    history) and return the ones before it.
    """
    if not user or not session_id:
        return []
    qs = AIChatMessage.objects.filter(
        user=user, session_id=session_id, role='user'
    ).order_by('-id')
    start = 1 if exclude_last else 0
    return list(qs[start:start + limit])


def _last_context_flight(user, session_id):
    """Find the most recently mentioned valid flight in this session's history."""
    for msg in _recent_user_messages(user, session_id):
        flight = _extract_flight(msg.content)
        if flight:
            return flight
    return None


DAY_REFERENCES = [
    ('day after tomorrow', 2),
    ('tomorrow', 1),
    ('today', 0),
    ('tonight', 0),
]


def _extract_day_reference(text_lower):
    """Find a relative day mention ("today", "tomorrow", "day after tomorrow").
    Tries an exact substring match first, then falls back to fuzzy matching
    each word against the day phrases so typos like "tommorrow" still work.
    Returns a date, or None if no such mention exists."""
    for phrase, offset in DAY_REFERENCES:
        if phrase in text_lower:
            return timezone.localdate() + timedelta(days=offset)

    words = re.findall(r"[a-z]+", text_lower)
    single_word_phrases = [(p, o) for p, o in DAY_REFERENCES if ' ' not in p]
    for word in words:
        if len(word) < 4:
            continue
        for phrase, offset in single_word_phrases:
            if difflib.SequenceMatcher(None, word, phrase).ratio() >= 0.75:
                return timezone.localdate() + timedelta(days=offset)
    return None


def _day_label(day_ref):
    today = timezone.localdate()
    if day_ref == today:
        return 'today'
    if day_ref == today + timedelta(days=1):
        return 'tomorrow'
    return day_ref.strftime('%d %b %Y')


TIME_PATTERNS = [
    # e.g. "3:45 pm", "15:45", "8.00 pm", "08.00PM" - colon or dot as the separator
    re.compile(r'\b(?P<h>\d{1,2})[:.](?P<m>\d{2})\s*(?P<ap>am|pm)?\b', re.IGNORECASE),
    # e.g. "3 pm", "11am", "8.00PM" (fallback if no minutes given)
    re.compile(r'\b(?P<h>\d{1,2})\s*(?P<ap>am|pm)\b', re.IGNORECASE),
    # e.g. "at 15", "at 9"
    re.compile(r'\bat\s+(?P<h>\d{1,2})\b', re.IGNORECASE),
]


def _parse_time_match(m):
    """Turn a TIME_PATTERNS regex match into (hour, minute) 24h, or None if invalid."""
    hour = int(m.group('h'))
    minute = int(m.group('m')) if 'm' in m.groupdict() and m.group('m') else 0
    ap = (m.groupdict().get('ap') or '').lower()
    if hour > 23 or minute > 59:
        return None
    if ap == 'pm' and hour < 12:
        hour += 12
    if ap == 'am' and hour == 12:
        hour = 0
    return hour, minute


def _extract_time_of_day(text):
    """Find a clock-time mention in free text. Returns (hour, minute) 24h or None."""
    for pattern in TIME_PATTERNS:
        m = pattern.search(text)
        if not m:
            continue
        result = _parse_time_match(m)
        if result:
            return result
    return None


def _extract_time_range(text):
    """
    Find a "between X and Y" / "from X to Y" / "X to Y" style time range
    mention, where X and Y are both clock times (not routes). Returns
    ((h1, m1), (h2, m2)) or None.
    """
    m = re.search(r'between\s+(.+?)\s+and\s+(.+?)(?:[?!]|\s*$)', text, re.IGNORECASE)
    if not m:
        m = re.search(r'\bfrom\s+(.+?)\s+to\s+(.+?)(?:[?!]|\s*$)', text, re.IGNORECASE)
    if not m:
        # plain "8pm to 9pm" / "08.00PM to 9.00PM" without a leading from/between
        m = re.search(r'\b(\d[\d:.\s]*(?:am|pm)?)\s+to\s+(\d[\d:.\s]*(?:am|pm)?)\b', text, re.IGNORECASE)
    if not m:
        return None

    start_text, end_text = m.group(1), m.group(2)
    start = None
    end = None
    for pattern in TIME_PATTERNS:
        sm = pattern.search(start_text)
        if sm:
            start = _parse_time_match(sm)
            break
    for pattern in TIME_PATTERNS:
        em = pattern.search(end_text)
        if em:
            end = _parse_time_match(em)
            break

    if start and end:
        return start, end
    return None


def _extract_route(text_lower):
    """Find an optional "from X to Y" mention. Returns (origin, destination) or (None, None)."""
    m = re.search(r'from\s+([a-z\s]+?)\s+to\s+([a-z\s]+?)(?:\s+at\b|\s*[?.]|\s*$)', text_lower)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return None, None


def _explain_flight_delay(flight):
    """Real (non-ML) delay explanation, using actual recorded turnaround
    task delay reasons - what answers 'why is AI204 delayed'."""
    delayed_tasks = list(flight.turnaround_tasks.filter(status='DELAYED').order_by('scheduled_time'))
    if not delayed_tasks:
        return (
            f"Flight {flight.flight_number} has no delayed turnaround tasks recorded — "
            f"it's currently on schedule for {flight.departure_time.strftime('%d %b %Y, %H:%M')}."
        )
    lines = [f"- {t.get_task_type_display()}: {t.get_delay_reason_display()}" for t in delayed_tasks]
    estimated_delay = len(delayed_tasks) * 15
    new_eta = flight.departure_time + timedelta(minutes=estimated_delay)
    return (
        f"Flight {flight.flight_number} is delayed. Causes:\n"
        + "\n".join(lines)
        + f"\n\nNew expected departure: {new_eta.strftime('%d %b %Y, %H:%M')} "
        + f"(+{estimated_delay} min vs scheduled {flight.departure_time.strftime('%H:%M')})"
    )


def _explain_gate_congestion(gate):
    """Live congestion explanation for a gate - same scoring as the Heat Map page."""
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

    reasons = []
    if gate.is_under_maintenance:
        reasons.append("under maintenance")
    if is_occupied:
        reasons.append("currently occupied by a flight")
    if assignments_count:
        reasons.append(f"handled {assignments_count} flight(s) today")
    if delayed_tasks_count:
        reasons.append(f"{delayed_tasks_count} delayed turnaround task(s) today")

    return (
        f"Gate {gate.gate_number} congestion: {score}% ({level})\n"
        + ("Why: " + ", ".join(reasons) if reasons else "No notable activity today.")
    )


def _check_schedule(text, text_lower):
    """
    Answers "is there a flight at this time" style questions by looking at
    the most recently uploaded flight schedule sheet (FlightScheduleRow).
    Also supports day-only queries like "flights tomorrow" / "what flights
    are there today" — these list every flight on that day, no time needed.
    """
    upload = FlightScheduleUpload.objects.filter(status='PROCESSED').order_by('-uploaded_at').first()
    if not upload or upload.row_count == 0:
        return ("I don't have a flight schedule uploaded yet. Go to the AI Assistant page, "
                "upload an Excel/CSV sheet with flight times, and then ask me again.")

    day_ref = _extract_day_reference(text_lower)
    time_range = _extract_time_range(text)
    time_of_day = None if time_range else _extract_time_of_day(text)

    if not time_range and not time_of_day and not day_ref:
        return ("What time (or day) should I check? For example: \"is there a flight at 3:30 pm\", "
                "\"any flights between 8pm and 9pm\", or \"flights tomorrow\".")

    origin, destination = _extract_route(text_lower)

    rows = upload.rows.exclude(scheduled_time__isnull=True)
    if origin:
        rows = rows.filter(origin__icontains=origin)
    if destination:
        rows = rows.filter(destination__icontains=destination)
    if day_ref:
        rows = rows.filter(scheduled_time__date=day_ref)

    route_label = f" from {origin} to {destination}" if origin and destination else ""
    day_label = f" on {_day_label(day_ref)}" if day_ref else ""

    # Day-only query (no specific time): list every flight that day.
    if day_ref and not time_range and not time_of_day:
        matches = list(rows.order_by('scheduled_time'))
        if matches:
            lines = []
            for r in matches[:10]:
                fn = r.flight_number or 'Flight'
                route = f"{r.origin} → {r.destination}" if (r.origin or r.destination) else ""
                lines.append(f"- {fn}: {route} at {r.scheduled_time.strftime('%H:%M')}".rstrip(': '))
            extra = f"\n(+{len(matches) - 10} more)" if len(matches) > 10 else ""
            return (
                f"Flights{day_label}{route_label} — {len(matches)} found "
                f"(schedule: {upload.original_filename}):\n" + "\n".join(lines) + extra
            )
        return f"No flights found{day_label}{route_label} in the uploaded schedule ({upload.original_filename})."

    if time_range:
        (h1, m1), (h2, m2) = time_range
        start_minutes = h1 * 60 + m1
        end_minutes = h2 * 60 + m2
        if end_minutes < start_minutes:
            start_minutes, end_minutes = end_minutes, start_minutes
        time_label = f"{h1:02d}:{m1:02d}\u2013{h2:02d}:{m2:02d}"
    else:
        hour, minute = time_of_day
        start_minutes = hour * 60 + minute - 30
        end_minutes = hour * 60 + minute + 30
        time_label = f"{hour:02d}:{minute:02d}"

    matches = []
    for r in rows:
        row_minutes = r.scheduled_time.hour * 60 + r.scheduled_time.minute
        if start_minutes <= row_minutes <= end_minutes:
            matches.append(r)

    time_word = "between" if time_range else "around"

    if matches:
        matches.sort(key=lambda r: r.scheduled_time)
        lines = []
        for r in matches[:10]:
            fn = r.flight_number or 'Flight'
            route = f"{r.origin} → {r.destination}" if (r.origin or r.destination) else ""
            lines.append(f"- {fn}: {route} at {r.scheduled_time.strftime('%H:%M')}".rstrip(': '))
        extra = f"\n(+{len(matches) - 10} more)" if len(matches) > 10 else ""
        return (
            f"Yes — {len(matches)} flight{'s' if len(matches) != 1 else ''} {time_word} {time_label}"
            f"{day_label}{route_label} (schedule: {upload.original_filename}):\n"
            + "\n".join(lines) + extra
        )

    return (
        f"No flights {time_word} {time_label}{day_label}{route_label} "
        f"in the uploaded schedule ({upload.original_filename})."
    )


FLIGHT_DEPENDENT_INTENTS = {
    'flight_status', 'delay_prediction', 'gate_info',
    'maintenance', 'staff_count', 'weather',
}

INTENT_LABELS = {
    'flight_status': 'flight status',
    'delay_prediction': 'delay risk',
    'gate_info': 'gate info',
    'maintenance': 'maintenance check',
    'staff_count': 'staffing numbers',
    'weather': 'weather risk',
}


def _last_context_intent(user, session_id):
    """What flight-related question was the user last asking about in this
    session? Lets short replies like "no for AI202" reuse the same kind of
    check (e.g. delay risk) instead of falling back to a generic overview."""
    for msg in _recent_user_messages(user, session_id):
        found = _score_intent(msg.content.lower())
        if found in FLIGHT_DEPENDENT_INTENTS:
            return found
    return None


def _recently_asked_schedule_check(user, session_id):
    """Was the user's last message in this session a schedule_check query
    (e.g. "check any flights tomorrow?")? Lets a bare follow-up like "day
    after tomorrow?" or "what about 6pm?" - which has no "flight" keyword of
    its own - be understood as still asking about the schedule."""
    for msg in _recent_user_messages(user, session_id, limit=1):
        return _score_intent(msg.content.lower()) == 'schedule_check'
    return False


class ChatbotEngine:

    @staticmethod
    def respond(message, user=None, session_id=''):
        text = message.strip()
        text_lower = text.lower()
        intent = _score_intent(text_lower)
        flight, corrected_from = _extract_flight_with_suggestion(text)
        gate = _extract_gate(text)

        used_correction = False
        if not flight and corrected_from:
            flight = Flight.objects.filter(flight_number__iexact=corrected_from).first()
            used_correction = flight is not None

        day_ref = _extract_day_reference(text_lower)
        if intent is None and 'flight' in text_lower and (_extract_time_range(text) or _extract_time_of_day(text) or day_ref):
            intent = 'schedule_check'

        # Bare follow-up to a schedule check, e.g. user asked "check any
        # flights tomorrow?" then just "day after tomorrow?" or "what about
        # 6pm?" next - no "flight" keyword, but it's clearly continuing the
        # same schedule question.
        if (intent is None and not flight and not gate
                and (day_ref or _extract_time_range(text) or _extract_time_of_day(text))
                and _recently_asked_schedule_check(user, session_id)):
            intent = 'schedule_check'

        # Shortcut replies: a bare flight mention with no intent keywords,
        # e.g. "no for AI202" after asking about delay risk, means "do that
        # same check, but for AI202 instead". Reuse the last flight-dependent
        # intent from this session rather than falling back to a generic
        # status overview.
        used_shortcut_intent = False
        if intent is None and flight is not None:
            shortcut_intent = _last_context_intent(user, session_id)
            if shortcut_intent:
                intent = shortcut_intent
                used_shortcut_intent = True

        # Follow-up handling: if this message doesn't name a flight but the
        # intent needs one, fall back to whatever flight was last discussed
        # in this session (e.g. "AI202 status?" then "is it delayed?").
        used_context_flight = False
        if not flight and not gate and intent in FLIGHT_DEPENDENT_INTENTS:
            flight = _last_context_flight(user, session_id)
            used_context_flight = flight is not None

        def note(answer):
            if used_correction and flight:
                return f"(Assuming you meant {flight.flight_number}) {answer}"
            if used_shortcut_intent and flight:
                return f"(Checking {INTENT_LABELS.get(intent, intent)} for {flight.flight_number}) {answer}"
            if used_context_flight and flight:
                return f"(Still talking about {flight.flight_number}) {answer}"
            return answer

        # "Why" phrasing gets the real explanation instead of the generic
        # ML risk-score answer or gate-availability answer.
        if flight and 'why' in text_lower and any(k in text_lower for k in ['delay', 'late']):
            return note(_explain_flight_delay(flight))

        if gate and 'why' in text_lower and any(k in text_lower for k in ['congest', 'busy', 'crowded']):
            return _explain_gate_congestion(gate)

        if intent == 'greeting':
            return f"Hello{' ' + user.first_name if user and user.first_name else ''}! I can check flight status, delays, gate availability, maintenance alerts, and staffing. What do you need?"

        if intent == 'help':
            return (
                "I can help with:\n"
                "- Flight status (e.g. \"what's the status of AI202\")\n"
                "- Delay predictions (e.g. \"is AI202 going to be delayed\")\n"
                "- Why a flight is delayed (e.g. \"why is AI202 delayed\")\n"
                "- Gate info and recommendations (e.g. \"which gate is AI202 at\")\n"
                "- Available gates (e.g. \"show available gates\")\n"
                "- Why a gate is congested (e.g. \"why is gate A1 busy\")\n"
                "- Maintenance alerts\n"
                "- Staffing requirements"
            )

        if intent == 'schedule_check':
            return _check_schedule(text, text_lower)

        if intent == 'flight_status':
            if flight:
                return note(
                    f"Flight {flight.flight_number} ({flight.airline.name})\n"
                    f"- Status: {flight.get_status_display()}\n"
                    f"- Departure: {flight.departure_time.strftime('%d %b %Y, %H:%M')}\n"
                    f"- Arrival: {flight.arrival_time.strftime('%d %b %Y, %H:%M')}\n"
                    f"- Route: {flight.origin} → {flight.destination}"
                )
            return "I couldn't find that flight. Please give me a valid flight number, e.g. 'status of AI202'."

        if intent == 'delay_prediction':
            if flight:
                from .ml.predictor import predict_delay
                result, confidence = predict_delay(flight)
                return note(
                    f"Delay prediction for {flight.flight_number}\n"
                    f"- Risk level: {result['risk_level']}\n"
                    f"- Estimated delay: {result['estimated_delay_minutes']} minutes\n"
                    f"- Confidence: {int(confidence*100)}%\n"
                    f"- Reason: {result['reason']}"
                )
            return "Tell me which flight you want a delay prediction for, e.g. 'will AI202 be delayed'."

        if intent == 'gate_info':
            if flight:
                gate_step = flight.workflow_steps.filter(step='GATE_ASSIGNED').first()
                if gate_step:
                    return note(
                        f"Flight {flight.flight_number}\n"
                        f"- Gate assignment recorded at: {gate_step.completed_at.strftime('%H:%M')}\n"
                        f"- Check the Gates module for the current gate number."
                    )
                from .views import recommend_gate
                result, confidence = recommend_gate(flight)
                if result.get('recommended_gate'):
                    return note(
                        f"Flight {flight.flight_number} — no gate assigned yet\n"
                        f"- Recommended gate: {result['recommended_gate']}\n"
                        f"- Suitability: {result['suitability_score']}/100\n"
                        f"- Confidence: {int(confidence*100)}%"
                    )
                return note(f"Flight {flight.flight_number} hasn't been assigned a gate yet, and no gates are currently available to recommend.")
            if gate:
                status = 'available' if gate.is_available else 'occupied'
                return f"Gate {gate.gate_number} ({gate.terminal})\n- Status: {status}"
            return "Which flight or gate are you asking about?"

        if intent == 'gate_availability':
            available = Gate.objects.filter(is_available=True)
            if available.exists():
                lines = '\n'.join(f"- {g.gate_number}" for g in available[:10])
                extra = f"\n(+{available.count() - 10} more)" if available.count() > 10 else ""
                return f"{available.count()} gate(s) available:\n{lines}{extra}"
            return "No gates are currently available."

        if intent == 'maintenance':
            from .ml.predictor import predict_maintenance
            if flight:
                result, confidence = predict_maintenance(flight)
                components = '\n'.join(f"  - {c}" for c in result['components_at_risk'])
                return note(
                    f"Maintenance check for {flight.flight_number}'s aircraft\n"
                    f"- Urgency: {result['urgency']} (score {result['urgency_score']}/100)\n"
                    f"- Components at risk:\n{components}"
                )
            return "Which flight's aircraft do you want a maintenance check on?"

        if intent == 'staff_count':
            from .ml.predictor import predict_staff
            if flight:
                result, _ = predict_staff(flight)
                return note(
                    f"Staffing required for {flight.flight_number}\n"
                    f"- Ground crew: {result['ground_crew_required']}\n"
                    f"- Security: {result['security_staff_required']}\n"
                    f"- Baggage handlers: {result['baggage_handlers_required']}\n"
                    f"- Total: {result['total_staff_required']}"
                )
            return "Tell me which flight you need staffing numbers for."

        if intent == 'weather':
            from .ml.predictor import predict_weather_risk
            if flight:
                result, confidence = predict_weather_risk(flight)
                return note(
                    f"Weather risk for {flight.flight_number}\n"
                    f"- Risk level: {result['risk_level']}\n"
                    f"- Conditions: {result['conditions']}\n"
                    f"- Visibility: {result['visibility_km']} km\n"
                    f"- Delay likely: {'Yes' if result['delay_likely'] else 'No'}"
                )
            return "Which flight's weather risk do you want to check?"

        # fallback
        if flight:
            return note(
                f"Flight {flight.flight_number}\n"
                f"- Status: {flight.get_status_display()}\n"
                f"- Ask me about: delay risk, gate, maintenance, weather, or staffing"
            )
        return "I'm not sure I understood that. Try asking about a flight's status, delay risk, gate, maintenance, weather, or staffing. Type 'help' for examples."