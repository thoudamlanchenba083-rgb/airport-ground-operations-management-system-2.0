"""
ML-driven resource optimization.

Unlike the old rule-based version (which only looked at the CURRENT snapshot
of gates/staff/equipment and flagged a "shortage" if something was already at
zero), this forecasts DEMAND over the next few hours using the already-trained
staff and equipment-failure models, then compares that forecast to real
supply from the DB. That means it can warn about a shortage before it
happens, not just after every seat is already full.

Reuses trained models already sitting in saved_models/ - no new training
pipeline needed:
  - predict_staff()            -> per-flight ground crew / security / baggage demand
  - predict_equipment_failure()-> which equipment is likely to go out of
                                   service soon (so it shouldn't be counted
                                   as available supply)
  - predict_best_gate()        -> how well upcoming flights fit into
                                   available gates

Known limitation: gate/staff/equipment "demand" for a flight is estimated
per-flight from predict_staff/predict_best_gate, which themselves fall back
to deterministic seeded proxies for a few features the DB doesn't capture
yet (see predictor.py docstrings). Good enough to rank relative pressure
across resource types; treat absolute numbers as estimates, not guarantees.
"""
from django.utils import timezone
from datetime import timedelta

from .predictor import predict_staff, predict_equipment_failure

# How far ahead to forecast demand, when optimize_resources() is called on
# its own (e.g. the standalone RESOURCE prediction handler) with no flights
# supplied. When called from the dashboard, dashboard_intelligence.py passes
# in its own already-fetched flight sample + window so every widget on the
# dashboard reasons about the exact same set of flights instead of each
# panel silently re-querying the DB with a different horizon.
DEFAULT_FORECAST_WINDOW_HOURS = 4

# _upcoming_flights() / _forecast_equipment_risk() previously ran predict()
# across EVERY matching row with no limit - fine with a handful of test
# flights/equipment, but on a fuller dataset this is what actually made
# dashboard loads slow (each one is a real RandomForest predict() call).
# Capped the same way dashboard_intelligence.py already caps its own
# per-flight forecasts, for the same "keep a dashboard load fast" reason
# stated below.
MAX_FLIGHTS_FOR_STAFF_FORECAST = 20
MAX_EQUIPMENT_FOR_RISK_FORECAST = 30


def _upcoming_flights(window_hours):
    """Flights not yet departed/cancelled/arrived, departing within the
    forecast window (or already in progress)."""
    from flights.models import Flight

    inactive = ('DEPARTED', 'CANCELLED', 'ARRIVED')
    now = timezone.now()
    horizon = now + timedelta(hours=window_hours)
    return list(
        Flight.objects.exclude(status__in=inactive)
        .filter(departure_time__lte=horizon)
        .select_related('aircraft')
        .order_by('departure_time')[:MAX_FLIGHTS_FOR_STAFF_FORECAST]
    )


def _forecast_staff_demand(flights):
    """Sums predicted staff demand across upcoming flights. Confidence is
    fixed at 0.9 by predict_staff() itself, so we just average across calls
    that returned a valid result."""
    totals = {'GROUND': 0, 'SECURITY': 0, 'MAINTENANCE': 0, 'BAGGAGE': 0}
    confidences = []

    for flight in flights:
        try:
            result, confidence = predict_staff(flight)
        except Exception:
            continue
        totals['GROUND'] += result.get('ground_crew_required', 0)
        totals['SECURITY'] += result.get('security_staff_required', 0)
        # predict_staff() also returns baggage_handlers_required - it was
        # being computed and thrown away before, so baggage staffing could
        # never show up as a forecasted shortage. Count it like the others.
        totals['BAGGAGE'] += result.get('baggage_handlers_required', 0)
        confidences.append(confidence)

    avg_confidence = sum(confidences) / \
        len(confidences) if confidences else 0.5
    return totals, avg_confidence


def _forecast_gate_pressure(flights):
    """Buckets upcoming flights by departure hour and finds the busiest
    hour - that's the peak concurrent gate demand, which is a better signal
    than "total flights today" for whether gates will actually run out."""
    from collections import Counter

    buckets = Counter()
    for flight in flights:
        bucket = flight.departure_time.replace(
            minute=0, second=0, microsecond=0)
        buckets[bucket] += 1

    peak_demand = max(buckets.values()) if buckets else 0
    peak_hour = max(buckets, key=buckets.get) if buckets else None
    return peak_demand, peak_hour


def _forecast_equipment_risk():
    """Flags equipment the model predicts will need maintenance soon
    (IMMEDIATE/SOON), so it can be excluded from "effectively available"
    supply even though its DB status still says 'available'."""
    from ground_equipment.models import GroundEquipment

    at_risk_by_type = {}
    confidences = []

    for equipment in (
        GroundEquipment.objects.filter(status='available')
        .select_related('equipment_type')
        .order_by('id')[:MAX_EQUIPMENT_FOR_RISK_FORECAST]
    ):
        try:
            result, confidence = predict_equipment_failure(equipment)
        except Exception:
            continue
        confidences.append(confidence)
        if result.get('urgency') in ('IMMEDIATE', 'SOON'):
            type_name = equipment.equipment_type.get_name_display()
            at_risk_by_type[type_name] = at_risk_by_type.get(type_name, 0) + 1

    avg_confidence = sum(confidences) / \
        len(confidences) if confidences else 0.5
    return at_risk_by_type, avg_confidence


def optimize_resources(flights=None, window_hours=None):
    """
    ML-based replacement for the old rule-based optimizer. Same return shape
    (dict, confidence) as before, but 'recommendations' now reflect forecast
    demand rather than only the current instant.

    flights: optionally pass in an already-fetched list of upcoming Flight
    objects (e.g. from dashboard_intelligence.py) so this reasons about the
    exact same flights as the rest of the dashboard, instead of running its
    own separate DB query with its own horizon. When omitted (e.g. the
    standalone RESOURCE prediction handler in views.py), it fetches its own
    sample using window_hours (or DEFAULT_FORECAST_WINDOW_HOURS).
    """
    from staff.models import Staff, StaffAssignment
    from gates.models import Gate
    from ground_equipment.models import GroundEquipment, EquipmentType

    window_hours = window_hours or DEFAULT_FORECAST_WINDOW_HOURS
    if flights is None:
        flights = _upcoming_flights(window_hours)[
            :MAX_FLIGHTS_FOR_STAFF_FORECAST]
    active_statuses = [
        'SCHEDULED',
        'GATE_ASSIGNED',
        'CREW_ASSIGNED',
        'FUELING',
        'CLEANING',
        'MAINTENANCE_CHECK',
        'BAGGAGE_LOADING',
        'BOARDING',
        'GATE_CLOSED',
        'PUSHBACK',
        'TAXIING']
    active_flights_now = sum(1 for f in flights if f.status in active_statuses)

    staff_demand, staff_confidence = _forecast_staff_demand(flights)
    peak_gate_demand, peak_hour = _forecast_gate_pressure(flights)
    equipment_at_risk, equipment_confidence = _forecast_equipment_risk()

    # --- Gates: current availability vs forecast peak-hour demand ---
    total_gates = Gate.objects.count()
    available_gates = Gate.objects.filter(is_available=True).count()
    gate_utilization_pct = round(
        (1 - available_gates / total_gates) * 100,
        1) if total_gates else 0.0

    # --- Staff: current supply vs forecast demand, per type ---
    staff_breakdown = {}
    for staff_type, label in Staff.STAFF_TYPES:
        total = Staff.objects.filter(
            staff_type=staff_type,
            is_active=True).count()
        assigned = StaffAssignment.objects.filter(
            staff__staff_type=staff_type, flight__status__in=active_statuses
        ).values('staff').distinct().count()
        available = max(0, total - assigned)
        forecast_needed = staff_demand.get(staff_type, 0)
        staff_breakdown[label] = {
            'total': total,
            'assigned': assigned,
            'available': available,
            'forecast_demand_next_{}h'.format(window_hours): forecast_needed,
            'utilization_pct': round(
                (assigned / total) * 100,
                1) if total else 0.0,
        }

    # --- Equipment: current supply, minus predicted at-risk units ---
    equipment_breakdown = {}
    for etype in EquipmentType.objects.all():
        qs = GroundEquipment.objects.filter(equipment_type=etype)
        total = qs.count()
        available = qs.filter(status='available').count()
        in_use = qs.filter(status='in_use').count()
        maintenance = qs.filter(status='maintenance').count()
        damaged = qs.filter(status='damaged').count()
        at_risk = equipment_at_risk.get(etype.get_name_display(), 0)
        equipment_breakdown[etype.get_name_display()] = {
            'total': total,
            'available': available,
            'predicted_at_risk_soon': at_risk,
            'effective_available': max(0, available - at_risk),
            'in_use': in_use,
            'maintenance': maintenance,
            'damaged': damaged,
            'utilization_pct': round((in_use / total) * 100, 1) if total else 0.0,
        }

    # --- Recommendations, driven by forecast rather than just the instant ---
    recommendations = []

    if peak_gate_demand > available_gates:
        when = peak_hour.strftime('%H:%M') if peak_hour else 'soon'
        recommendations.append(
            f'Predicted gate shortfall around {when} - {peak_gate_demand} flights need gates, '
            f'only {available_gates} currently available')

    for label, data in staff_breakdown.items():
        demand_key = f'forecast_demand_next_{window_hours}h'
        forecast_needed = data[demand_key]
        if data['total'] > 0 and forecast_needed > data['available']:
            recommendations.append(
                f"{label} shortfall forecast in next {window_hours}h - "
                f"predicted need {forecast_needed}, only {data['available']} available now")
        elif data['total'] > 0 and data['available'] == 0 and active_flights_now > 0:
            recommendations.append(
                f'{label} shortage - all staff currently assigned')

    for name, data in equipment_breakdown.items():
        if data['total'] > 0 and data['effective_available'] == 0:
            reason = 'none available' if data['available'] == 0 else 'remaining units predicted to need maintenance soon'
            recommendations.append(f'{name} shortage - {reason}')

    if not recommendations:
        recommendations.append(
            'All resources within forecast-safe range for the next '
            f'{window_hours}h')

    overall_confidence = round(
        (staff_confidence + equipment_confidence) / 2, 2)

    return {
        'forecast_window_hours': window_hours,
        'gates': {
            'total': total_gates,
            'available': available_gates,
            'active_flights_now': active_flights_now,
            'peak_forecast_demand': peak_gate_demand,
            'utilization_pct': gate_utilization_pct,
        },
        'staff': staff_breakdown,
        'equipment': equipment_breakdown,
        'recommendations': recommendations,
        'model': 'Forecast (RandomForest staff + equipment models) + real-time DB supply',
    }, overall_confidence
