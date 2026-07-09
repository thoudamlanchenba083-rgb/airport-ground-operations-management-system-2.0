"""
Synthetic-but-realistic dataset generator for training the airport AI models.

Why synthetic? The live database has no historical delay/maintenance outcomes yet
(every flight just has a current status). To train real ML models before real
operational history accumulates, we generate data from realistic distributions
(peak-hour congestion, weather effects, aircraft age, etc.) with controlled noise.

Once the system has been running in production for a while, swap
`generate_flight_delay_dataset()` for a function that pulls real rows from
the Flight / AIPrediction / Maintenance tables instead.
"""
import numpy as np
import pandas as pd

RNG = np.random.default_rng(42)

AIRPORTS = ['DEL', 'BOM', 'BLR', 'MAA', 'CCU', 'HYD', 'GOI', 'PNQ']
WEATHER_CONDITIONS = [
    'Clear',
    'Light Rain',
    'Fog',
    'Strong Winds',
    'Thunderstorm']
AIRCRAFT_TYPES = ['A320', 'A321', 'B737', 'B777', 'ATR72', 'A350']


def _peak_hour_factor(hour):
    if 7 <= hour <= 9 or 17 <= hour <= 20:
        return 1.0
    if 10 <= hour <= 16:
        return 0.5
    return 0.15


def generate_flight_delay_dataset(n=6000):
    """
    Features -> target: delay_minutes (regression) + is_delayed (classification, >15min)
    """
    hour = RNG.integers(0, 24, n)
    day_of_week = RNG.integers(0, 7, n)
    weather_risk = RNG.uniform(0, 1, n)
    aircraft_age_years = RNG.uniform(0.5, 25, n)
    capacity = RNG.choice([72, 150, 180, 220, 350], n)
    prior_flight_delay_min = np.clip(RNG.normal(5, 15, n), 0, None)
    gate_congestion = np.array([_peak_hour_factor(h)
                               for h in hour]) + RNG.uniform(-0.1, 0.1, n)
    gate_congestion = np.clip(gate_congestion, 0, 1)
    crew_ready_pct = RNG.uniform(0.6, 1.0, n)
    maintenance_flag = RNG.binomial(1, 0.08, n)

    delay = (
        gate_congestion * 35
        + weather_risk * 40
        + maintenance_flag * 50
        + prior_flight_delay_min * 0.6
        + (aircraft_age_years > 15) * 8
        + (day_of_week >= 5) * 5
        - crew_ready_pct * 10
        + RNG.normal(0, 8, n)
    )
    delay = np.clip(delay, -10, None)
    delay = np.where(delay < 0, 0, delay)

    df = pd.DataFrame({
        'hour': hour,
        'day_of_week': day_of_week,
        'weather_risk': weather_risk,
        'aircraft_age_years': aircraft_age_years,
        'capacity': capacity,
        'prior_flight_delay_min': prior_flight_delay_min,
        'gate_congestion': gate_congestion,
        'crew_ready_pct': crew_ready_pct,
        'maintenance_flag': maintenance_flag,
        'delay_minutes': delay,
    })
    df['is_delayed'] = (df['delay_minutes'] > 15).astype(int)
    return df


def generate_maintenance_dataset(n=4000):
    """
    Features -> target: maintenance_required (classification), urgency_score (regression)
    """
    flight_hours_since_service = RNG.uniform(0, 600, n)
    cycles_since_service = RNG.uniform(0, 400, n)
    aircraft_age_years = RNG.uniform(0.5, 25, n)
    reported_faults_last_30d = RNG.poisson(1.2, n)
    avg_temp_exposure_c = RNG.uniform(-10, 45, n)
    component_wear_index = RNG.uniform(0, 1, n)

    urgency = (
        flight_hours_since_service / 600 * 35
        + cycles_since_service / 400 * 20
        + (aircraft_age_years / 25) * 15
        + reported_faults_last_30d * 6
        + component_wear_index * 25
        + RNG.normal(0, 6, n)
    )
    urgency = np.clip(urgency, 0, 100)

    df = pd.DataFrame({
        'flight_hours_since_service': flight_hours_since_service,
        'cycles_since_service': cycles_since_service,
        'aircraft_age_years': aircraft_age_years,
        'reported_faults_last_30d': reported_faults_last_30d,
        'avg_temp_exposure_c': avg_temp_exposure_c,
        'component_wear_index': component_wear_index,
        'urgency_score': urgency,
    })
    df['maintenance_required'] = (df['urgency_score'] > 55).astype(int)
    return df


def generate_passenger_rush_dataset(n=4000):
    hour = RNG.integers(0, 24, n)
    day_of_week = RNG.integers(0, 7, n)
    capacity = RNG.choice([72, 150, 180, 220, 350], n)
    is_international = RNG.binomial(1, 0.3, n)
    holiday_season = RNG.binomial(1, 0.15, n)

    peak = np.array([_peak_hour_factor(h) for h in hour])
    rush_factor = np.clip(
        peak * 0.6
        + is_international * 0.15
        + holiday_season * 0.2
        + (day_of_week >= 5) * 0.1
        + RNG.normal(0, 0.08, n),
        0.05, 1.0,
    )
    expected_passengers = (capacity * rush_factor).astype(int)

    df = pd.DataFrame({
        'hour': hour,
        'day_of_week': day_of_week,
        'capacity': capacity,
        'is_international': is_international,
        'holiday_season': holiday_season,
        'rush_factor': rush_factor,
        'expected_passengers': expected_passengers,
    })
    return df


def generate_weather_risk_dataset(n=4000):
    visibility_km = RNG.uniform(0.2, 12, n)
    wind_speed_kmh = RNG.uniform(0, 90, n)
    precipitation_mm = np.clip(RNG.exponential(3, n), 0, 60)
    temperature_c = RNG.uniform(-5, 45, n)
    humidity_pct = RNG.uniform(20, 100, n)

    risk = (
        (12 - visibility_km) / 12 * 35
        + (wind_speed_kmh / 90) * 30
        + np.clip(precipitation_mm / 60, 0, 1) * 25
        + (humidity_pct / 100) * 10
        + RNG.normal(0, 5, n)
    )
    risk = np.clip(risk, 0, 100)

    df = pd.DataFrame({
        'visibility_km': visibility_km,
        'wind_speed_kmh': wind_speed_kmh,
        'precipitation_mm': precipitation_mm,
        'temperature_c': temperature_c,
        'humidity_pct': humidity_pct,
        'weather_risk_score': risk,
    })
    df['delay_likely'] = (df['weather_risk_score'] > 50).astype(int)
    return df


def generate_staff_requirement_dataset(n=4000):
    capacity = RNG.choice([72, 150, 180, 220, 350], n)
    is_international = RNG.binomial(1, 0.3, n)
    rush_factor = RNG.uniform(0.1, 1.0, n)
    baggage_volume_kg = capacity * RNG.uniform(15, 25, n)

    ground_crew = np.clip(
        (capacity / 30) * (0.8 + rush_factor * 0.4), 3, None).round()
    security = np.clip((capacity / 50) *
                       (1 + is_international * 0.3), 2, None).round()
    baggage_handlers = np.clip(baggage_volume_kg / 1200, 3, None).round()

    df = pd.DataFrame({
        'capacity': capacity,
        'is_international': is_international,
        'rush_factor': rush_factor,
        'baggage_volume_kg': baggage_volume_kg,
        'ground_crew_required': ground_crew,
        'security_staff_required': security,
        'baggage_handlers_required': baggage_handlers,
    })
    return df


def generate_gate_recommendation_dataset(n=5000):
    """
    Features -> target: suitability_score (regression), how good a gate is
    for a given flight to be assigned to.
    """
    distance_score = RNG.uniform(
        0, 1, n)          # 0 = close to stand, 1 = far
    # how busy the gate has been recently
    recent_utilization = RNG.uniform(0, 1, n)
    # gate terminal matches preferred terminal
    terminal_match = RNG.binomial(1, 0.5, n)
    # how well gate accommodates aircraft size
    aircraft_size_fit = RNG.uniform(0, 1, n)
    is_international = RNG.binomial(1, 0.3, n)

    suitability = (
        (1 - distance_score) * 35
        + (1 - recent_utilization) * 30
        + terminal_match * 15
        + aircraft_size_fit * 15
        + is_international * 5
        + RNG.normal(0, 5, n)
    )
    suitability = np.clip(suitability, 0, 100)

    df = pd.DataFrame({
        'distance_score': distance_score,
        'recent_utilization': recent_utilization,
        'terminal_match': terminal_match,
        'aircraft_size_fit': aircraft_size_fit,
        'is_international': is_international,
        'suitability_score': suitability,
    })
    return df


def generate_equipment_failure_dataset(n=5000):
    """
    Features -> target: failure_risk_score (regression), maintenance_required (classification)
    for ground equipment (tow tractors, GPUs, belt loaders, fuel trucks, etc).
    """
    days_since_maintenance = RNG.uniform(0, 365, n)
    age_days = RNG.uniform(30, 3000, n)
    usage_count_30d = RNG.poisson(12, n)
    avg_usage_hours = RNG.uniform(0.5, 8, n)
    prior_damage_flag = RNG.binomial(1, 0.1, n)

    risk = (
        (days_since_maintenance / 365) * 35
        + (age_days / 3000) * 20
        + (usage_count_30d / 30) * 20
        + (avg_usage_hours / 8) * 10
        + prior_damage_flag * 15
        + RNG.normal(0, 6, n)
    )
    risk = np.clip(risk, 0, 100)

    df = pd.DataFrame({
        'days_since_maintenance': days_since_maintenance,
        'age_days': age_days,
        'usage_count_30d': usage_count_30d,
        'avg_usage_hours': avg_usage_hours,
        'prior_damage_flag': prior_damage_flag,
        'failure_risk_score': risk,
    })
    df['maintenance_required'] = (df['failure_risk_score'] > 55).astype(int)
    return df
