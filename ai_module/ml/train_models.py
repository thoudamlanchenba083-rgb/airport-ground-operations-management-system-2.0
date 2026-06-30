"""
Trains all AI models for the airport ground-ops system and saves them as
.pkl files in ai_module/ml/saved_models/.

Run with:  python ai_module\ml\train_models.py
(run from the project root, with venv active)
"""
import os
import sys
import joblib

# allow running this file directly (adds project root to path)
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, accuracy_score, r2_score

from ai_module.ml.dataset_generator import (
    generate_flight_delay_dataset,
    generate_maintenance_dataset,
    generate_passenger_rush_dataset,
    generate_weather_risk_dataset,
    generate_staff_requirement_dataset,
)

SAVE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'saved_models')
os.makedirs(SAVE_DIR, exist_ok=True)


def _save(model, name):
    path = os.path.join(SAVE_DIR, name)
    joblib.dump(model, path)
    print(f"  saved -> {path}")


def train_delay_model():
    print("\n[1/5] Training Delay Prediction model...")
    df = generate_flight_delay_dataset()
    features = [
        'hour', 'day_of_week', 'weather_risk', 'aircraft_age_years',
        'capacity', 'prior_flight_delay_min', 'gate_congestion',
        'crew_ready_pct', 'maintenance_flag',
    ]
    X = df[features]

    # regressor: estimated delay minutes
    y_reg = df['delay_minutes']
    Xtr, Xte, ytr, yte = train_test_split(X, y_reg, test_size=0.2, random_state=42)
    reg = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42)
    reg.fit(Xtr, ytr)
    mae = mean_absolute_error(yte, reg.predict(Xte))
    print(f"  delay_minutes regressor MAE: {mae:.2f} min")
    _save(reg, 'delay_regressor.pkl')

    # classifier: is_delayed (>15min)
    y_clf = df['is_delayed']
    Xtr, Xte, ytr, yte = train_test_split(X, y_clf, test_size=0.2, random_state=42)
    clf = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42)
    clf.fit(Xtr, ytr)
    acc = accuracy_score(yte, clf.predict(Xte))
    print(f"  is_delayed classifier accuracy: {acc:.3f}")
    _save(clf, 'delay_classifier.pkl')
    _save(features, 'delay_features.pkl')


def train_maintenance_model():
    print("\n[2/5] Training Predictive Maintenance model...")
    df = generate_maintenance_dataset()
    features = [
        'flight_hours_since_service', 'cycles_since_service', 'aircraft_age_years',
        'reported_faults_last_30d', 'avg_temp_exposure_c', 'component_wear_index',
    ]
    X = df[features]

    y_reg = df['urgency_score']
    Xtr, Xte, ytr, yte = train_test_split(X, y_reg, test_size=0.2, random_state=42)
    reg = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42)
    reg.fit(Xtr, ytr)
    print(f"  urgency_score regressor R2: {r2_score(yte, reg.predict(Xte)):.3f}")
    _save(reg, 'maintenance_regressor.pkl')

    y_clf = df['maintenance_required']
    Xtr, Xte, ytr, yte = train_test_split(X, y_clf, test_size=0.2, random_state=42)
    clf = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42)
    clf.fit(Xtr, ytr)
    print(f"  maintenance_required classifier accuracy: {accuracy_score(yte, clf.predict(Xte)):.3f}")
    _save(clf, 'maintenance_classifier.pkl')
    _save(features, 'maintenance_features.pkl')


def train_passenger_rush_model():
    print("\n[3/5] Training Passenger Rush Prediction model...")
    df = generate_passenger_rush_dataset()
    features = ['hour', 'day_of_week', 'capacity', 'is_international', 'holiday_season']
    X = df[features]
    y = df['rush_factor']
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)
    reg = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42)
    reg.fit(Xtr, ytr)
    print(f"  rush_factor regressor R2: {r2_score(yte, reg.predict(Xte)):.3f}")
    _save(reg, 'rush_regressor.pkl')
    _save(features, 'rush_features.pkl')


def train_weather_risk_model():
    print("\n[4/5] Training Weather Risk Prediction model...")
    df = generate_weather_risk_dataset()
    features = ['visibility_km', 'wind_speed_kmh', 'precipitation_mm', 'temperature_c', 'humidity_pct']
    X = df[features]

    y_reg = df['weather_risk_score']
    Xtr, Xte, ytr, yte = train_test_split(X, y_reg, test_size=0.2, random_state=42)
    reg = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42)
    reg.fit(Xtr, ytr)
    print(f"  weather_risk_score regressor R2: {r2_score(yte, reg.predict(Xte)):.3f}")
    _save(reg, 'weather_regressor.pkl')

    y_clf = df['delay_likely']
    Xtr, Xte, ytr, yte = train_test_split(X, y_clf, test_size=0.2, random_state=42)
    clf = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42)
    clf.fit(Xtr, ytr)
    print(f"  delay_likely classifier accuracy: {accuracy_score(yte, clf.predict(Xte)):.3f}")
    _save(clf, 'weather_classifier.pkl')
    _save(features, 'weather_features.pkl')


def train_staff_model():
    print("\n[5/5] Training Staff Requirement Prediction model...")
    df = generate_staff_requirement_dataset()
    features = ['capacity', 'is_international', 'rush_factor', 'baggage_volume_kg']
    X = df[features]

    targets = {
        'ground_crew_required': 'staff_ground_crew_regressor.pkl',
        'security_staff_required': 'staff_security_regressor.pkl',
        'baggage_handlers_required': 'staff_baggage_regressor.pkl',
    }
    for target_col, filename in targets.items():
        y = df[target_col]
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)
        reg = RandomForestRegressor(n_estimators=150, max_depth=8, random_state=42)
        reg.fit(Xtr, ytr)
        print(f"  {target_col} regressor MAE: {mean_absolute_error(yte, reg.predict(Xte)):.2f}")
        _save(reg, filename)
    _save(features, 'staff_features.pkl')


if __name__ == '__main__':
    print("=" * 60)
    print("AIRPORT AI MODEL TRAINING PIPELINE")
    print("=" * 60)
    train_delay_model()
    train_maintenance_model()
    train_passenger_rush_model()
    train_weather_risk_model()
    train_staff_model()
    print("\n" + "=" * 60)
    print(f"All models saved to: {SAVE_DIR}")
    print("=" * 60)