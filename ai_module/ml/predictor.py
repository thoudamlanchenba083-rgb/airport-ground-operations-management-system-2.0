"""
Loads trained .pkl models and exposes predict_* functions with the SAME
signatures as the old random.uniform()-based functions in ai_module/views.py,
so wiring them in is a drop-in swap.

Models are cached in memory after first load (avoids re-reading .pkl on
every API call).
"""
import os
import hashlib
import joblib
from .weather_service import get_live_weather
import pandas as pd
from datetime import datetime

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'saved_models')

_cache = {}


def _load(filename):
    if filename not in _cache:
        path = os.path.join(MODELS_DIR, filename)
        _cache[filename] = joblib.load(path)
    return _cache[filename]


def _seeded_value(flight_id, salt, low, high):
    """
    Deterministic pseudo-random value derived from flight id + salt.
    Used as a stand-in for telemetry the system doesn't capture yet
    (e.g. real-time weather feed, aircraft wear sensors). Same flight
    always gets the same derived value instead of true randomness.
    """
    h = hashlib.sha256(f"{flight_id}-{salt}".encode()).hexdigest()
    frac = int(h[:8], 16) / 0xFFFFFFFF
    return low + frac * (high - low)


# ---------------------------------------------------------------- DELAY ----
def predict_delay(flight):
    reg = _load('delay_regressor.pkl')
    clf = _load('delay_classifier.pkl')
    features = _load('delay_features.pkl')

    fid = flight.id
    hour = flight.departure_time.hour
    day_of_week = flight.departure_time.weekday()
    capacity = flight.aircraft.capacity if flight.aircraft else 150

    row = {
        'hour': hour,
        'day_of_week': day_of_week,
        'weather_risk': _seeded_value(fid, 'weather', 0.0, 1.0),
        'aircraft_age_years': _seeded_value(fid, 'age', 0.5, 25),
        'capacity': capacity,
        'prior_flight_delay_min': _seeded_value(fid, 'prior_delay', 0, 30),
        'gate_congestion': 1.0 if (7 <= hour <= 9 or 17 <= hour <= 20) else (0.5 if 10 <= hour <= 16 else 0.15),
        'crew_ready_pct': _seeded_value(fid, 'crew', 0.6, 1.0),
        'maintenance_flag': 1 if flight.status == 'MAINTENANCE_CHECK' else 0,
    }
    X = pd.DataFrame([row], columns=features)

    delay_minutes = float(reg.predict(X)[0])
    is_delayed = bool(clf.predict(X)[0])
    confidence = float(max(clf.predict_proba(X)[0]))

    result = {
        'delay_probability': round(confidence if is_delayed else 1 - confidence, 2),
        'estimated_delay_minutes': max(0, round(delay_minutes)),
        'risk_level': 'HIGH' if delay_minutes > 45 else 'MEDIUM' if delay_minutes > 15 else 'LOW',
        'reason': 'Peak hour congestion' if row['gate_congestion'] > 0.8 else 'Normal conditions',
        'model': 'RandomForestRegressor+Classifier (trained)',
    }
    return result, round(confidence, 2)


# ----------------------------------------------------------- MAINTENANCE ---
def predict_maintenance(flight):
    reg = _load('maintenance_regressor.pkl')
    clf = _load('maintenance_classifier.pkl')
    features = _load('maintenance_features.pkl')

    fid = flight.aircraft.id if flight.aircraft else flight.id

    row = {
        'flight_hours_since_service': _seeded_value(fid, 'fh', 0, 600),
        'cycles_since_service': _seeded_value(fid, 'cyc', 0, 400),
        'aircraft_age_years': _seeded_value(fid, 'age', 0.5, 25),
        'reported_faults_last_30d': int(_seeded_value(fid, 'faults', 0, 4)),
        'avg_temp_exposure_c': _seeded_value(fid, 'temp', -10, 45),
        'component_wear_index': _seeded_value(fid, 'wear', 0, 1),
    }
    X = pd.DataFrame([row], columns=features)

    urgency_score = float(reg.predict(X)[0])
    required = bool(clf.predict(X)[0])
    confidence = float(max(clf.predict_proba(X)[0]))

    result = {
        'maintenance_required': required,
        'urgency': 'IMMEDIATE' if urgency_score > 75 else 'SOON' if urgency_score > 55 else 'ROUTINE',
        'estimated_hours': round(urgency_score / 10, 1),
        'urgency_score': round(urgency_score, 1),
        'components_at_risk': ['Engine Oil', 'Landing Gear'] if urgency_score > 55 else ['Tires'],
        'model': 'RandomForestRegressor+Classifier (trained)',
    }
    return result, round(confidence, 2)


# -------------------------------------------------------- PASSENGER RUSH ---
def predict_passenger_rush(flight):
    reg = _load('rush_regressor.pkl')
    features = _load('rush_features.pkl')

    hour = flight.departure_time.hour
    capacity = flight.aircraft.capacity if flight.aircraft else 150

    row = {
        'hour': hour,
        'day_of_week': flight.departure_time.weekday(),
        'capacity': capacity,
        'is_international': 1 if flight.destination and len(flight.destination) and not flight.destination.isupper() is False else _seeded_value(flight.id, 'intl', 0, 1) > 0.7,
        'holiday_season': 1 if datetime.now().month in (12, 1) else 0,
    }
    row['is_international'] = int(bool(row['is_international']))
    X = pd.DataFrame([row], columns=features)

    rush_factor = float(reg.predict(X)[0])
    expected_passengers = int(capacity * rush_factor)

    result = {
        'expected_passengers': expected_passengers,
        'rush_level': 'HIGH' if rush_factor > 0.7 else 'MEDIUM' if rush_factor > 0.4 else 'LOW',
        'peak_boarding_time': f"{hour}:30",
        'recommended_open_counters': max(2, int(rush_factor * 6)),
        'model': 'RandomForestRegressor (trained)',
    }
    return result, round(rush_factor, 2)


# ----------------------------------------------------------- WEATHER RISK --
def predict_weather_risk(flight):
    reg = _load('weather_regressor.pkl')
    clf = _load('weather_classifier.pkl')
    features = _load('weather_features.pkl')

    fid = flight.id
    live = get_live_weather(flight.origin)

    if live:
        row = {
            'visibility_km': live['visibility_km'],
            'wind_speed_kmh': live['wind_speed_kmh'],
            'precipitation_mm': live['precipitation_mm'],
            'temperature_c': live['temperature_c'],
            'humidity_pct': live['humidity_pct'],
        }
    else:
        row = {
            'visibility_km': _seeded_value(fid, 'vis', 0.2, 12),
            'wind_speed_kmh': _seeded_value(fid, 'wind', 0, 90),
            'precipitation_mm': _seeded_value(fid, 'precip', 0, 40),
            'temperature_c': _seeded_value(fid, 'temp', -5, 45),
            'humidity_pct': _seeded_value(fid, 'hum', 20, 100),
        }
    X = pd.DataFrame([row], columns=features)

    risk_score = float(reg.predict(X)[0])
    delay_likely = bool(clf.predict(X)[0])
    confidence = float(max(clf.predict_proba(X)[0]))

    conditions = live['conditions_raw'] if live else (
        'Thunderstorm' if risk_score > 75 else 'Strong Winds' if risk_score > 55 else
        'Fog' if risk_score > 35 else 'Light Rain' if risk_score > 15 else 'Clear'
    )

    result = {
        'weather_risk_score': round(risk_score / 100, 2),
        'risk_level': 'HIGH' if risk_score > 60 else 'MEDIUM' if risk_score > 30 else 'LOW',
        'conditions': conditions,
        'visibility_km': round(row['visibility_km'], 1),
        'temperature_c': round(row['temperature_c'], 1),
        'humidity_pct': round(row['humidity_pct'], 1),
        'wind_speed_kmh': round(row['wind_speed_kmh'], 1),
        'delay_likely': delay_likely,
        'data_source': 'OpenWeatherMap (live)' if live else 'simulated',
        'model': 'RandomForestRegressor+Classifier (trained)',
    }
    return result, round(confidence, 2)


# ------------------------------------------------------------------ STAFF --
# ---------------------------------------------------------- BAGGAGE WEIGHT --
# Real-world basis: bad weather (high wind, low visibility, storms) forces
# airlines to plan for holding patterns, alternate airports, and reduced
# runway performance - all of which shrink the max usable takeoff weight.
# The safe checked-baggage allowance is modeled as a percentage of the
# aircraft's nominal per-passenger allowance, reduced as weather risk rises.
BASE_BAGGAGE_ALLOWANCE_KG_PER_PAX = 20  # standard checked-baggage assumption

WEATHER_WEIGHT_REDUCTION_PCT = {
    'LOW': 0.0,
    'MEDIUM': 0.10,
    'HIGH': 0.20,
}


def predict_baggage_weight_risk(flight):
    """
    Cross-checks total checked baggage weight against a weather-adjusted
    safe limit for this flight. In bad weather the safe limit shrinks, so
    a baggage load that was fine yesterday may need to be reduced today.
    """
    from baggage.models import Baggage
    from django.db.models import Sum

    capacity = flight.aircraft.capacity if flight.aircraft else 150
    nominal_limit_kg = capacity * BASE_BAGGAGE_ALLOWANCE_KG_PER_PAX

    weather_result, weather_confidence = predict_weather_risk(flight)
    risk_level = weather_result['risk_level']
    reduction_pct = WEATHER_WEIGHT_REDUCTION_PCT.get(risk_level, 0.0)
    safe_limit_kg = nominal_limit_kg * (1 - reduction_pct)

    total_weight = Baggage.objects.filter(flight=flight).aggregate(total=Sum('weight'))['total'] or 0
    total_weight = float(total_weight)

    over_by_kg = max(0.0, total_weight - safe_limit_kg)
    action_required = over_by_kg > 0

    if action_required:
        recommendation = (
            f"Reduce checked baggage by {round(over_by_kg, 1)}kg before boarding "
            f"due to {risk_level.lower()}-risk weather ({weather_result['conditions']})."
        )
    elif reduction_pct > 0:
        recommendation = (
            f"Within the weather-adjusted safe limit, but margin is reduced "
            f"due to {risk_level.lower()}-risk weather ({weather_result['conditions']})."
        )
    else:
        recommendation = "Baggage weight is within the safe limit. No weather-related restriction."

    result = {
        'total_baggage_kg': round(total_weight, 1),
        'nominal_limit_kg': round(nominal_limit_kg, 1),
        'weather_risk_level': risk_level,
        'weather_conditions': weather_result['conditions'],
        'weight_reduction_pct': round(reduction_pct * 100),
        'safe_limit_kg': round(safe_limit_kg, 1),
        'over_limit_by_kg': round(over_by_kg, 1),
        'action_required': action_required,
        'recommendation': recommendation,
    }
    return result, weather_confidence


def predict_staff(flight):
    ground_reg = _load('staff_ground_crew_regressor.pkl')
    security_reg = _load('staff_security_regressor.pkl')
    baggage_reg = _load('staff_baggage_regressor.pkl')
    features = _load('staff_features.pkl')

    capacity = flight.aircraft.capacity if flight.aircraft else 150
    fid = flight.id
    rush_factor = _seeded_value(fid, 'rush', 0.2, 1.0)
    is_international = int(_seeded_value(fid, 'intl', 0, 1) > 0.7)
    baggage_volume_kg = capacity * _seeded_value(fid, 'bagvol', 15, 25)

    row = {
        'capacity': capacity,
        'is_international': is_international,
        'rush_factor': rush_factor,
        'baggage_volume_kg': baggage_volume_kg,
    }
    X = pd.DataFrame([row], columns=features)

    ground_crew = max(3, round(float(ground_reg.predict(X)[0])))
    security = max(2, round(float(security_reg.predict(X)[0])))
    baggage_handlers = max(3, round(float(baggage_reg.predict(X)[0])))

    result = {
        'ground_crew_required': ground_crew,
        'security_staff_required': security,
        'baggage_handlers_required': baggage_handlers,
        'total_staff_required': ground_crew + security,
        'model': 'RandomForestRegressor x3 (trained)',
    }
    return result, 0.9
# ------------------------------------------------------------------ GATE ---
def _gate_features(flight, gate):
    """
    distance_score and aircraft_size_fit are per-gate proxies (deterministic,
    stable per gate) standing in for real physical gate specs the Gate model
    doesn't capture yet (no distance-from-stand or capacity field). Add those
    fields to the Gate model later to replace these with real values.
    recent_utilization is REAL data from GateAssignment history.
    """
    from gates.models import GateAssignment
    from django.utils import timezone
    from datetime import timedelta

    gid = gate.id
    fid = flight.id

    distance_score = _seeded_value(gid, 'distance', 0, 1)
    aircraft_size_fit = _seeded_value(gid, 'sizefit', 0.3, 1.0)
    terminal_match = int(_seeded_value(fid, f'terminal-{gate.terminal}', 0, 1) > 0.5)
    is_international = int(_seeded_value(fid, 'intl', 0, 1) > 0.7)

    since = timezone.now() - timedelta(hours=24)
    recent_count = GateAssignment.objects.filter(gate=gate, assigned_at__gte=since).count()
    recent_utilization = min(1.0, recent_count / 5.0)

    return {
        'distance_score': distance_score,
        'recent_utilization': recent_utilization,
        'terminal_match': terminal_match,
        'aircraft_size_fit': aircraft_size_fit,
        'is_international': is_international,
    }


def predict_best_gate(flight, candidate_gates):
    """
    Scores each candidate gate with the trained suitability model.
    Returns a list of (gate, score) tuples, ranked best to worst.
    """
    reg = _load('gate_regressor.pkl')
    features = _load('gate_features.pkl')

    scored = []
    for gate in candidate_gates:
        row = _gate_features(flight, gate)
        X = pd.DataFrame([row], columns=features)
        score = float(reg.predict(X)[0])
        scored.append((gate, score))

    scored.sort(key=lambda t: t[1], reverse=True)
    return scored

# -------------------------------------------------------------- EQUIPMENT --
def predict_equipment_failure(equipment):
    """
    Unlike aircraft maintenance, this one uses mostly REAL computed features:
    days_since_maintenance, age_days, and usage stats all come from actual
    GroundEquipment / EquipmentAssignment records. Only prior_damage_flag is
    a proxy (current status snapshot, since damage history isn't tracked
    over time - only current state).
    """
    from django.utils import timezone
    from ground_equipment.models import EquipmentAssignment

    reg = _load('equipment_regressor.pkl')
    clf = _load('equipment_classifier.pkl')
    features = _load('equipment_features.pkl')

    now = timezone.now()
    days_since_maintenance = (now - equipment.last_maintenance).days if equipment.last_maintenance else 365
    age_days = (now - equipment.created_at).days if equipment.created_at else 365

    since_30d = now - pd_timedelta_days(30)
    assignments_30d = EquipmentAssignment.objects.filter(equipment=equipment, assigned_at__gte=since_30d)
    usage_count_30d = assignments_30d.count()

    completed = assignments_30d.exclude(released_at__isnull=True)
    if completed.exists():
        durations = [(a.released_at - a.assigned_at).total_seconds() / 3600 for a in completed]
        avg_usage_hours = sum(durations) / len(durations)
    else:
        avg_usage_hours = 2.0  # no completed assignments yet, use a neutral default

    prior_damage_flag = 1 if equipment.status == 'damaged' else 0

    row = {
        'days_since_maintenance': days_since_maintenance,
        'age_days': age_days,
        'usage_count_30d': usage_count_30d,
        'avg_usage_hours': avg_usage_hours,
        'prior_damage_flag': prior_damage_flag,
    }
    X = pd.DataFrame([row], columns=features)

    risk_score = float(reg.predict(X)[0])
    required = bool(clf.predict(X)[0])
    confidence = float(max(clf.predict_proba(X)[0]))

    result = {
        'maintenance_required': required,
        'failure_risk_score': round(risk_score, 1),
        'urgency': 'IMMEDIATE' if risk_score > 75 else 'SOON' if risk_score > 55 else 'ROUTINE',
        'days_since_maintenance': days_since_maintenance,
        'usage_count_30d': usage_count_30d,
        'model': 'RandomForestRegressor+Classifier (synthetic-trained, real features)',
    }
    return result, round(confidence, 2)


def pd_timedelta_days(n):
    return pd.Timedelta(days=n)