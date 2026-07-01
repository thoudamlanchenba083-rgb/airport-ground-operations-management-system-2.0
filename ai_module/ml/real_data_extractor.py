"""
Pulls real historical data from the live database to train ML models,
falling back to synthetic data (dataset_generator.py) when there aren't
enough real records yet.

Known limitations (no real data source exists for these yet):
- aircraft_age_years: Aircraft model has no manufacture/purchase date field.
  Falls back to a fixed neutral value until that field is added.
- weather_risk: no weather table exists yet (see roadmap item: Weather API).
  Falls back to a fixed neutral value until that's integrated.
"""
import numpy as np
import pandas as pd
from django.utils import timezone

# Minimum real records required before we trust real data over synthetic.
# Deliberately conservative - a handful of rows would just overfit noise.
MIN_REAL_DELAY_RECORDS = 200
MIN_REAL_MAINTENANCE_RECORDS = 150

# Neutral fallback constants for features with no real data source yet.
DEFAULT_AIRCRAFT_AGE_YEARS = 8.0
DEFAULT_WEATHER_RISK = 0.3


def count_real_delay_records():
    from flights.models import FlightWorkflowStep
    return FlightWorkflowStep.objects.filter(step='DEPARTED').count()


def count_real_maintenance_records():
    from maintenance.models import MaintenanceRequest
    return MaintenanceRequest.objects.count()


def has_enough_real_delay_data():
    return count_real_delay_records() >= MIN_REAL_DELAY_RECORDS


def has_enough_real_maintenance_data():
    return count_real_maintenance_records() >= MIN_REAL_MAINTENANCE_RECORDS
def extract_real_flight_delay_data():
    """
    Builds a delay-prediction dataframe from real Flight / FlightWorkflowStep /
    MaintenanceRequest data. Same column shape as
    dataset_generator.generate_flight_delay_dataset() so train_models.py can
    swap between them without changing the training code.
    """
    from flights.models import Flight, FlightWorkflowStep
    from maintenance.models import MaintenanceRequest

    departed_steps = (
        FlightWorkflowStep.objects
        .filter(step='DEPARTED')
        .select_related('flight', 'flight__aircraft')
        .order_by('flight__aircraft_id', 'flight__departure_time')
    )

    # cache aircraft's prior real delay so later flights can use it as a feature
    last_delay_by_aircraft = {}
    rows = []

    for step in departed_steps:
        flight = step.flight
        scheduled = flight.departure_time
        actual = step.completed_at
        delay_minutes = max(0.0, (actual - scheduled).total_seconds() / 60)

        aircraft_id = flight.aircraft_id
        prior_delay = last_delay_by_aircraft.get(aircraft_id, 0.0)

        # gate congestion proxy: how many other flights scheduled within the same hour
        window_start = scheduled.replace(minute=0, second=0, microsecond=0)
        window_end = window_start + pd.Timedelta(hours=1)
        concurrent_flights = Flight.objects.filter(
            departure_time__gte=window_start, departure_time__lt=window_end
        ).exclude(id=flight.id).count()
        gate_congestion = min(1.0, concurrent_flights / 5.0)

        # crew readiness proxy: was crew assigned before scheduled departure?
        crew_step = flight.workflow_steps.filter(step='CREW_ASSIGNED').first()
        crew_ready_pct = 1.0 if (crew_step and crew_step.completed_at <= scheduled) else 0.7

        # maintenance flag: open/in-progress request on this aircraft before departure
        maintenance_flag = int(
            MaintenanceRequest.objects.filter(
                aircraft=flight.aircraft,
                created_at__lte=scheduled,
                status__in=['OPEN', 'PENDING_APPROVAL', 'APPROVED', 'IN_PROGRESS'],
            ).exists()
        )

        rows.append({
            'hour': scheduled.hour,
            'day_of_week': scheduled.weekday(),
            'weather_risk': DEFAULT_WEATHER_RISK,
            'aircraft_age_years': DEFAULT_AIRCRAFT_AGE_YEARS,
            'capacity': flight.aircraft.capacity,
            'prior_flight_delay_min': prior_delay,
            'gate_congestion': gate_congestion,
            'crew_ready_pct': crew_ready_pct,
            'maintenance_flag': maintenance_flag,
            'delay_minutes': delay_minutes,
        })

        last_delay_by_aircraft[aircraft_id] = delay_minutes

    df = pd.DataFrame(rows)
    df['is_delayed'] = (df['delay_minutes'] > 15).astype(int)
    return df
def extract_real_maintenance_data():
    """
    Builds a maintenance dataframe from real MaintenanceRequest history.

    Honest caveat: there's no real flight-hours/cycles/sensor tracking in the
    DB yet, so flight_hours_since_service, cycles_since_service, and
    avg_temp_exposure_c are rough proxies based on time-since-last-service,
    not actual sensor readings. urgency_score is derived from the priority
    field a human already assigned, not measured independently. Good enough
    to bootstrap a model on real request patterns; revisit if/when actual
    flight-hour tracking is added.
    """
    from maintenance.models import MaintenanceRequest

    priority_score_map = {'LOW': 25, 'MEDIUM': 55, 'HIGH': 85}
    rows = []
    requests = MaintenanceRequest.objects.select_related('aircraft').order_by('aircraft_id', 'created_at')
    last_service_by_aircraft = {}

    for req in requests:
        aircraft_id = req.aircraft_id
        created = req.created_at

        window_start = created - pd.Timedelta(days=30)
        reported_faults_last_30d = MaintenanceRequest.objects.filter(
            aircraft_id=aircraft_id, created_at__gte=window_start, created_at__lt=created
        ).count()

        last_service = last_service_by_aircraft.get(aircraft_id)
        days_since_service = (created - last_service).days if last_service else 180

        base_score = priority_score_map.get(req.priority, 50)
        urgency_score = min(
            100,
            base_score + reported_faults_last_30d * 4 + min(days_since_service, 200) / 200 * 10,
        )

        rows.append({
            'flight_hours_since_service': min(days_since_service, 200) * 2.5,
            'cycles_since_service': min(days_since_service, 200) * 1.5,
            'aircraft_age_years': DEFAULT_AIRCRAFT_AGE_YEARS,
            'reported_faults_last_30d': reported_faults_last_30d,
            'avg_temp_exposure_c': 25.0,
            'component_wear_index': min(1.0, urgency_score / 100),
            'urgency_score': urgency_score,
        })

        if req.status in ('RESOLVED', 'CLOSED'):
            last_service_by_aircraft[aircraft_id] = req.updated_at

    df = pd.DataFrame(rows)
    df['maintenance_required'] = (df['urgency_score'] > 55).astype(int)
    return df