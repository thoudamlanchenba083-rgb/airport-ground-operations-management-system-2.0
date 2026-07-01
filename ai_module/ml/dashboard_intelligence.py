"""
Aggregates live KPIs + ML forecasts into one payload for the dashboard.

Design choice: this is a read-only GET, computed fresh every call - it does
NOT create AIPrediction rows (unlike the other predict_* handlers wired
through PREDICTION_HANDLERS in views.py). A dashboard gets polled/refreshed
often, and writing a DB row on every poll would bloat AIPrediction with
noise that isn't a "prediction a user asked for" so much as ambient status.

Reuses the same trained models as the rest of ai_module - no new training
pipeline. To keep this fast enough to call on every dashboard load, ML
forecasts (delay, weather, passenger rush) are capped to a sample of
upcoming flights rather than running across everything.
"""
from django.utils import timezone
from datetime import timedelta

from .predictor import predict_delay, predict_weather_risk, predict_passenger_rush
from .resource_optimizer import optimize_resources

# Cap on how many flights we run the per-flight ML forecasts (delay,
# weather, passenger rush) against, to keep a dashboard load fast.
MAX_FLIGHTS_FOR_FORECAST = 15


def _todays_flights():
    from flights.models import Flight

    now = timezone.now()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    return list(
        Flight.objects.filter(departure_time__gte=start_of_day, departure_time__lt=end_of_day)
        .select_related('aircraft', 'airline')
    )


def _upcoming_flights_sample():
    from flights.models import Flight

    inactive = ('DEPARTED', 'CANCELLED', 'ARRIVED')
    now = timezone.now()
    horizon = now + timedelta(hours=6)
    return list(
        Flight.objects.exclude(status__in=inactive)
        .filter(departure_time__lte=horizon)
        .select_related('aircraft', 'airline')
        .order_by('departure_time')[:MAX_FLIGHTS_FOR_FORECAST]
    )


def _live_kpis(todays_flights):
    total = len(todays_flights)
    delayed = sum(1 for f in todays_flights if f.status == 'DELAYED')
    cancelled = sum(1 for f in todays_flights if f.status == 'CANCELLED')
    arrived = sum(1 for f in todays_flights if f.status == 'ARRIVED')
    departed_or_later = sum(
        1 for f in todays_flights
        if f.status in ('DEPARTED', 'AIRBORNE', 'LANDING', 'TAXI_TO_GATE', 'ARRIVED')
    )
    active = total - delayed - cancelled - arrived

    resolved = departed_or_later + cancelled  # flights whose outcome is known so far today
    on_time_pct = round((departed_or_later - delayed) / resolved * 100, 1) if resolved else None

    return {
        'total_flights_today': total,
        'active_flights': max(0, active),
        'delayed_flights': delayed,
        'cancelled_flights': cancelled,
        'arrived_flights': arrived,
        'on_time_pct': on_time_pct,
    }


def _delay_forecast(flights):
    if not flights:
        return {'flights_analyzed': 0, 'high_risk_count': 0, 'avg_estimated_delay_min': 0, 'flagged_flights': []}

    high_risk = []
    delays = []
    for flight in flights:
        try:
            result, confidence = predict_delay(flight)
        except Exception:
            continue
        delays.append(result['estimated_delay_minutes'])
        if result['risk_level'] == 'HIGH':
            high_risk.append({
                'flight_number': flight.flight_number,
                'departure_time': flight.departure_time.isoformat(),
                'estimated_delay_minutes': result['estimated_delay_minutes'],
                'confidence': confidence,
            })

    avg_delay = round(sum(delays) / len(delays), 1) if delays else 0
    return {
        'flights_analyzed': len(flights),
        'high_risk_count': len(high_risk),
        'avg_estimated_delay_min': avg_delay,
        'flagged_flights': high_risk[:5],
    }


def _weather_alerts(flights):
    if not flights:
        return {'flights_analyzed': 0, 'high_risk_count': 0, 'flagged_flights': []}

    high_risk = []
    for flight in flights:
        try:
            result, confidence = predict_weather_risk(flight)
        except Exception:
            continue
        if result['risk_level'] == 'HIGH':
            high_risk.append({
                'flight_number': flight.flight_number,
                'departure_time': flight.departure_time.isoformat(),
                'conditions': result['conditions'],
                'visibility_km': result['visibility_km'],
            })

    return {
        'flights_analyzed': len(flights),
        'high_risk_count': len(high_risk),
        'flagged_flights': high_risk[:5],
    }


def _maintenance_alerts():
    from maintenance.models import MaintenanceRequest

    open_statuses = ('OPEN', 'PENDING_APPROVAL', 'APPROVED', 'IN_PROGRESS')
    urgent = list(
        MaintenanceRequest.objects.filter(status__in=open_statuses, priority='HIGH')
        .select_related('aircraft')
        .order_by('-created_at')[:5]
    )
    total_open = MaintenanceRequest.objects.filter(status__in=open_statuses).count()

    return {
        'total_open_requests': total_open,
        'high_priority_count': MaintenanceRequest.objects.filter(status__in=open_statuses, priority='HIGH').count(),
        'flagged_requests': [
            {
                'aircraft': r.aircraft.registration_number,
                'issue': r.issue_description[:80],
                'status': r.status,
            }
            for r in urgent
        ],
    }


def _passenger_prediction(todays_flights):
    sample = todays_flights[:MAX_FLIGHTS_FOR_FORECAST]
    if not sample:
        return {'flights_analyzed': 0, 'total_expected_passengers': 0, 'high_rush_count': 0}

    total_passengers = 0
    high_rush = 0
    for flight in sample:
        try:
            result, confidence = predict_passenger_rush(flight)
        except Exception:
            continue
        total_passengers += result['expected_passengers']
        if result['rush_level'] == 'HIGH':
            high_rush += 1

    return {
        'flights_analyzed': len(sample),
        'total_expected_passengers': total_passengers,
        'high_rush_count': high_rush,
    }


def get_dashboard_intelligence():
    """Single entry point - returns the full dashboard payload."""
    todays = _todays_flights()
    upcoming_sample = _upcoming_flights_sample()

    resource_result, resource_confidence = optimize_resources()
    staff_recommendations = [
        r for r in resource_result['recommendations']
        if 'forecast' in r.lower() or 'shortage' in r.lower()
    ]

    return {
        'generated_at': timezone.now().isoformat(),
        'live_kpis': _live_kpis(todays),
        'delay_forecast': _delay_forecast(upcoming_sample),
        'weather_alerts': _weather_alerts(upcoming_sample),
        'maintenance_alerts': _maintenance_alerts(),
        'passenger_prediction': _passenger_prediction(todays),
        'staff_shortage': {
            'recommendations': staff_recommendations,
            'breakdown': resource_result['staff'],
            'confidence': resource_confidence,
        },
    }