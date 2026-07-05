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
import threading

from django.utils import timezone
from datetime import timedelta
from concurrent.futures import ThreadPoolExecutor

from .predictor import predict_delay, predict_weather_risk, predict_passenger_rush
from .resource_optimizer import optimize_resources

# Cap on how many flights we run the per-flight ML forecasts (delay,
# weather, passenger rush) against, to keep a dashboard load fast.
MAX_FLIGHTS_FOR_FORECAST = 15

# How far ahead "upcoming" looks for every forecast panel on this dashboard.
# All panels (delay, weather, passenger rush, staff shortage) now share this
# single window and the single flight sample fetched below, instead of the
# staff-shortage panel silently re-querying the DB with its own separate
# horizon (it used to use 4h while everything else used 6h, so two boxes on
# the same dashboard could describe two different sets of flights).
UPCOMING_WINDOW_HOURS = 6


def _todays_flights():
    from flights.models import Flight

    # timezone.now() is always UTC in Django, regardless of TIME_ZONE.
    # Zeroing its hour/minute would give UTC midnight, not local midnight -
    # convert to local time first so "today" matches the operator's actual
    # calendar day (e.g. IST), not the server's UTC day.
    local_now = timezone.localtime(timezone.now())
    start_of_day = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    return list(
        Flight.objects.filter(departure_time__gte=start_of_day, departure_time__lt=end_of_day)
        .select_related('aircraft', 'airline')
    )


def _upcoming_flights_sample():
    from flights.models import Flight

    inactive = ('DEPARTED', 'CANCELLED', 'ARRIVED')
    now = timezone.now()
    horizon = now + timedelta(hours=UPCOMING_WINDOW_HOURS)
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

    # predict_weather_risk() can make a live HTTP call per flight (see
    # weather_service.get_live_weather, timeout=5s each). Run those calls
    # concurrently instead of in a serial loop - up to MAX_FLIGHTS_FOR_FORECAST
    # (15) flights in a loop meant a slow/unreachable weather API could block
    # the whole dashboard load for up to ~75s. Threaded, the worst case is
    # ~5s total (bounded by the single slowest call) regardless of sample size.
    def _safe_predict(flight):
        try:
            return flight, predict_weather_risk(flight)
        except Exception:
            return flight, None

    high_risk = []
    with ThreadPoolExecutor(max_workers=min(len(flights), 15)) as pool:
        for flight, prediction in pool.map(_safe_predict, flights):
            if prediction is None:
                continue
            result, confidence = prediction
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


DASHBOARD_CACHE_KEY = 'ai_dashboard_intelligence'
DASHBOARD_CACHE_SECONDS = 25

# Guards the actual computation below so that two requests arriving at
# (almost) the same moment - e.g. React 18 StrictMode double-mounting the
# dashboard effect in dev, or a manual "Refresh" click landing right after
# the auto-poll fires - don't both see a cache miss and both pay the full
# ML compute cost in parallel. Without this, that pair of concurrent calls
# roughly doubles the CPU work happening at once (every model's predict()
# calls, DB queries, etc. run twice simultaneously), which is exactly the
# kind of extra latency that pushes a call past the frontend's 20s timeout.
# With the lock, the second caller just waits for the first to finish and
# then reads the now-populated cache instead of recomputing from scratch.
_compute_lock = threading.Lock()


def get_dashboard_intelligence():
    """Single entry point - returns the full dashboard payload.

    Cached briefly: this recomputes every ML prediction (delay, weather,
    passenger rush, staff/equipment forecasts) from scratch on every call.
    The dashboard already polls this every 2 minutes on its own, and a
    manual "Refresh" click can land seconds after that poll - without a
    cache, both pay the full cost every time, which is what occasionally
    pushed a call slow enough to hit the frontend's request timeout. A
    short cache means only the first caller in any 25s window computes it;
    everyone else in that window gets the same result back instantly.
    """
    from django.core.cache import cache

    cached = cache.get(DASHBOARD_CACHE_KEY)
    if cached is not None:
        return cached

    # Only one thread actually computes at a time. Anyone else who reaches
    # here while that's in progress blocks on the lock, then re-checks the
    # cache (now populated by whoever held the lock) instead of redoing the
    # same work.
    with _compute_lock:
        cached = cache.get(DASHBOARD_CACHE_KEY)
        if cached is not None:
            return cached

        payload = _compute_dashboard_intelligence()
        cache.set(DASHBOARD_CACHE_KEY, payload, DASHBOARD_CACHE_SECONDS)
        return payload


def _compute_dashboard_intelligence():
    todays = _todays_flights()
    upcoming_sample = _upcoming_flights_sample()

    resource_result, resource_confidence = optimize_resources(
        flights=upcoming_sample, window_hours=UPCOMING_WINDOW_HOURS
    )
    staff_recommendations = [
        r for r in resource_result['recommendations']
        if 'forecast' in r.lower() or 'shortage' in r.lower()
    ]

    payload = {
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
        # gates/equipment were already computed by optimize_resources() above
        # for the staff-shortage call - surface them too instead of quietly
        # discarding them, so the dashboard can show gate utilization and
        # at-risk equipment alongside the staff forecast.
        'resource_forecast': {
            'window_hours': resource_result['forecast_window_hours'],
            'gates': resource_result['gates'],
            'equipment': resource_result['equipment'],
        },
    }
    return payload