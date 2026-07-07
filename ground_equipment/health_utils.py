from django.utils import timezone
from .models import EquipmentAssignment
from ai_module.ml.predictor import predict_equipment_failure


def compute_equipment_health(equipment):
    """
    Phase 3 - Equipment Health Score.
    Reframes the existing failure-risk predictor as a positive health
    percentage plus a usage-intensity percentage, so every unit can be
    shown at once in a grid instead of querying one at a time.
    """
    prediction, confidence = predict_equipment_failure(equipment)
    failure_risk = prediction['failure_risk_score']
    health_score = round(max(0, 100 - failure_risk), 1)

    # Cumulative ALL-TIME runtime (not just last 30 days like the raw predictor uses)
    completed = EquipmentAssignment.objects.filter(
        equipment=equipment, released_at__isnull=False
    )
    total_hours = sum(
        (a.released_at - a.assigned_at).total_seconds() / 3600 for a in completed
    )

    # Usage intensity relative to a "typical busy" unit (~40 assignments/month)
    usage_count_30d = prediction['usage_count_30d']
    EXPECTED_MONTHLY_USES = 40
    usage_score = round(min(100, (usage_count_30d / EXPECTED_MONTHLY_USES) * 100), 1)

    if health_score >= 80:
        risk = 'Low'
    elif health_score >= 55:
        risk = 'Medium'
    else:
        risk = 'High'

    return {
        'id': equipment.id,
        'equipment_id': equipment.equipment_id,
        'equipment_type': equipment.equipment_type.get_name_display(),
        'status': equipment.status,
        'health_score': health_score,
        'usage_score': usage_score,
        'runtime_hours': round(total_hours, 1),
        'risk': risk,
        'maintenance_required': prediction['maintenance_required'],
        'urgency': prediction['urgency'],
        'confidence': confidence,
    }