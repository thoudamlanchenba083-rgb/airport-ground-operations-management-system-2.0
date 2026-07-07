"""
Shared tool definitions + conversation-history helper for the LLM-backed
chatbot engines (llm_engine.py = Claude, gemini_engine.py = Gemini).

Keeping this in one place means the two providers can't drift apart and
each provider file only has to hold its own API-call plumbing.
"""
from flights.models import Flight
from gates.models import Gate
from .models import AIChatMessage

MAX_HISTORY_MESSAGES = 30  # prior turns from this session sent as real history

SYSTEM_PROMPT = (
    "You are the AI assistant embedded in an Airport Ground Operations Management System. "
    "You help staff check flight status, delay risk, gate assignments/availability, "
    "predictive maintenance, staffing requirements, weather risk, and flight schedules. "
    "Always use the provided tools to look up real data instead of guessing - never invent "
    "flight numbers, times, or statuses. Use the ongoing conversation to resolve follow-up "
    "questions (e.g. 'what about tomorrow?' or 'is it delayed?' referring to a flight named "
    "earlier). Keep answers concise and use the same operational tone as a ground-ops "
    "dashboard: short lines, bullet-style facts, no fluff. If a tool returns an error or no "
    "match, say so plainly and ask for the missing detail (e.g. a valid flight number)."
)


def _find_flight(flight_number):
    return Flight.objects.filter(flight_number__iexact=(flight_number or "").strip()).first()


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
     "description": ("Look up flights in the most recently uploaded flight-schedule sheet by time/day/route. "
                      "Pass the user's question through mostly as-is, e.g. 'any flights between 8pm and 9pm', "
                      "'flights tomorrow', 'flight at 3:30pm from Delhi to Mumbai'."),
     "input_schema": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}},
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
