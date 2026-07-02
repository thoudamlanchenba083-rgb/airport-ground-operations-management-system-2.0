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
from django.utils import timezone

from flights.models import Flight
from gates.models import Gate
from .models import FlightScheduleUpload, FlightScheduleRow

try:
    from staff.models import Staff
except Exception:
    Staff = None

try:
    from ground_equipment.models import Equipment
except Exception:
    Equipment = None


FLIGHT_NUMBER_RE = re.compile(r'\b([A-Z]{1,3}\d{2,5})\b', re.IGNORECASE)
GATE_NUMBER_RE = re.compile(r'\bgate\s*([A-Z]?\d{1,3})\b', re.IGNORECASE)

INTENTS = {
    'schedule_check': [
        'is there a flight', 'is there any flight', 'any flight at', 'any flights at',
        'flight at', 'flights at', 'flight around', 'flights around', 'flights between',
        'flight between', 'flight schedule', 'check the schedule', 'check schedule',
        'according to the excel', 'according to the sheet', 'in the excel', 'uploaded schedule',
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
    matches = FLIGHT_NUMBER_RE.findall(text)
    for m in matches:
        flight = Flight.objects.filter(flight_number__iexact=m).first()
        if flight:
            return flight
    return None


def _extract_gate(text):
    m = GATE_NUMBER_RE.search(text)
    if m:
        return Gate.objects.filter(gate_number__iexact=m.group(1)).first()
    return None


TIME_PATTERNS = [
    # e.g. "3:45 pm", "15:45"
    re.compile(r'\b(?P<h>\d{1,2}):(?P<m>\d{2})\s*(?P<ap>am|pm)?\b', re.IGNORECASE),
    # e.g. "3 pm", "11am"
    re.compile(r'\b(?P<h>\d{1,2})\s*(?P<ap>am|pm)\b', re.IGNORECASE),
    # e.g. "at 15", "at 9"
    re.compile(r'\bat\s+(?P<h>\d{1,2})\b', re.IGNORECASE),
]


def _extract_time_of_day(text):
    """Find a clock-time mention in free text. Returns (hour, minute) 24h or None."""
    for pattern in TIME_PATTERNS:
        m = pattern.search(text)
        if not m:
            continue
        hour = int(m.group('h'))
        minute = int(m.group('m')) if 'm' in m.groupdict() and m.group('m') else 0
        ap = (m.groupdict().get('ap') or '').lower()
        if hour > 23 or minute > 59:
            continue
        if ap == 'pm' and hour < 12:
            hour += 12
        if ap == 'am' and hour == 12:
            hour = 0
        return hour, minute
    return None


def _extract_route(text_lower):
    """Find an optional "from X to Y" mention. Returns (origin, destination) or (None, None)."""
    m = re.search(r'from\s+([a-z\s]+?)\s+to\s+([a-z\s]+?)(?:\s+at\b|\s*[?.]|\s*$)', text_lower)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return None, None


def _check_schedule(text, text_lower):
    """
    Answers "is there a flight at this time" style questions by looking at
    the most recently uploaded flight schedule sheet (FlightScheduleRow).
    """
    upload = FlightScheduleUpload.objects.filter(status='PROCESSED').order_by('-uploaded_at').first()
    if not upload or upload.row_count == 0:
        return ("I don't have a flight schedule uploaded yet. Go to the AI Assistant page, "
                "upload an Excel/CSV sheet with flight times, and then ask me again.")

    time_of_day = _extract_time_of_day(text)
    if not time_of_day:
        return ("What time should I check? For example: \"is there a flight at 3:30 pm\" "
                "or \"any flights at 15:00\".")

    hour, minute = time_of_day
    origin, destination = _extract_route(text_lower)

    rows = upload.rows.exclude(scheduled_time__isnull=True)
    if origin:
        rows = rows.filter(origin__icontains=origin)
    if destination:
        rows = rows.filter(destination__icontains=destination)

    target_minutes = hour * 60 + minute
    window = 30  # minutes
    matches = []
    for r in rows:
        row_minutes = r.scheduled_time.hour * 60 + r.scheduled_time.minute
        if abs(row_minutes - target_minutes) <= window:
            matches.append(r)

    time_label = f"{hour:02d}:{minute:02d}"
    route_label = f" from {origin} to {destination}" if origin and destination else ""

    if matches:
        matches.sort(key=lambda r: r.scheduled_time)
        lines = []
        for r in matches[:8]:
            fn = r.flight_number or 'Flight'
            route = f"{r.origin} -> {r.destination}" if (r.origin or r.destination) else ""
            lines.append(f"- {fn}: {route} at {r.scheduled_time.strftime('%H:%M')}".rstrip(': '))
        extra = f" (+{len(matches) - 8} more)" if len(matches) > 8 else ""
        return (
            f"Yes, according to the uploaded schedule ({upload.original_filename}), "
            f"there {'is a flight' if len(matches)==1 else 'are flights'} around {time_label}{route_label}:\n"
            + "\n".join(lines) + extra
        )

    return (
        f"No, according to the uploaded schedule ({upload.original_filename}), "
        f"there are no flights around {time_label}{route_label}."
    )


class ChatbotEngine:

    @staticmethod
    def respond(message, user=None):
        text = message.strip()
        text_lower = text.lower()
        intent = _score_intent(text_lower)
        flight = _extract_flight(text)
        gate = _extract_gate(text)

        if intent == 'greeting':
            return f"Hello{' ' + user.first_name if user and user.first_name else ''}! I can check flight status, delays, gate availability, maintenance alerts, and staffing. What do you need?"

        if intent == 'help':
            return (
                "I can help with:\n"
                "- Flight status (e.g. \"what's the status of AI202\")\n"
                "- Delay predictions (e.g. \"is AI202 going to be delayed\")\n"
                "- Gate info and recommendations (e.g. \"which gate is AI202 at\")\n"
                "- Available gates (e.g. \"show available gates\")\n"
                "- Maintenance alerts\n"
                "- Staffing requirements"
            )

        if intent == 'schedule_check':
            return _check_schedule(text, text_lower)

        if intent == 'flight_status':
            if flight:
                return (
                    f"Flight {flight.flight_number} ({flight.airline.name}) is currently "
                    f"'{flight.get_status_display()}'. Departure: {flight.departure_time.strftime('%d %b %Y, %H:%M')}, "
                    f"Arrival: {flight.arrival_time.strftime('%d %b %Y, %H:%M')}, "
                    f"Route: {flight.origin} -> {flight.destination}."
                )
            return "I couldn't find that flight. Please give me a valid flight number, e.g. 'status of AI202'."

        if intent == 'delay_prediction':
            if flight:
                from .ml.predictor import predict_delay
                result, confidence = predict_delay(flight)
                return (
                    f"Delay prediction for {flight.flight_number}: {result['risk_level']} risk, "
                    f"estimated delay {result['estimated_delay_minutes']} minutes "
                    f"(confidence {int(confidence*100)}%). Reason: {result['reason']}."
                )
            return "Tell me which flight you want a delay prediction for, e.g. 'will AI202 be delayed'."

        if intent == 'gate_info':
            if flight:
                gate_step = flight.workflow_steps.filter(step='GATE_ASSIGNED').first()
                if gate_step:
                    return f"Flight {flight.flight_number} gate assignment was recorded at {gate_step.completed_at.strftime('%H:%M')}. Check the Gates module for the current gate number."
                from .views import recommend_gate
                result, confidence = recommend_gate(flight)
                if result.get('recommended_gate'):
                    return (
                        f"Flight {flight.flight_number} hasn't been assigned a gate yet. "
                        f"Based on availability and utilization, I'd recommend Gate {result['recommended_gate']} "
                        f"(suitability {result['suitability_score']}/100, confidence {int(confidence*100)}%)."
                    )
                return f"Flight {flight.flight_number} hasn't been assigned a gate yet, and no gates are currently available to recommend."
            if gate:
                status = 'available' if gate.is_available else 'occupied'
                return f"Gate {gate.gate_number} ({gate.terminal}) is currently {status}."
            return "Which flight or gate are you asking about?"

        if intent == 'gate_availability':
            available = Gate.objects.filter(is_available=True)
            if available.exists():
                names = ', '.join(g.gate_number for g in available[:10])
                return f"{available.count()} gate(s) available: {names}."
            return "No gates are currently available."

        if intent == 'maintenance':
            from .ml.predictor import predict_maintenance
            if flight:
                result, confidence = predict_maintenance(flight)
                urgency = result['urgency']
                return (
                    f"Maintenance check for {flight.flight_number}'s aircraft: urgency is {urgency} "
                    f"(score {result['urgency_score']}/100). Components at risk: {', '.join(result['components_at_risk'])}."
                )
            return "Which flight's aircraft do you want a maintenance check on?"

        if intent == 'staff_count':
            from .ml.predictor import predict_staff
            if flight:
                result, _ = predict_staff(flight)
                return (
                    f"Staffing for {flight.flight_number}: {result['ground_crew_required']} ground crew, "
                    f"{result['security_staff_required']} security, {result['baggage_handlers_required']} baggage handlers "
                    f"(total {result['total_staff_required']})."
                )
            return "Tell me which flight you need staffing numbers for."

        if intent == 'weather':
            from .ml.predictor import predict_weather_risk
            if flight:
                result, confidence = predict_weather_risk(flight)
                return (
                    f"Weather risk for {flight.flight_number}: {result['risk_level']} "
                    f"({result['conditions']}, visibility {result['visibility_km']}km). "
                    f"Delay likely: {'Yes' if result['delay_likely'] else 'No'}."
                )
            return "Which flight's weather risk do you want to check?"

        # fallback
        if flight:
            return (
                f"I found flight {flight.flight_number}, status '{flight.get_status_display()}'. "
                "Ask me about its delay risk, gate, maintenance, weather, or staffing for more detail."
            )
        return "I'm not sure I understood that. Try asking about a flight's status, delay risk, gate, maintenance, weather, or staffing. Type 'help' for examples."