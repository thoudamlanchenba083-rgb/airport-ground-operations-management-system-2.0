"""
Business logic for ground equipment allocation.
Wraps core_app.business_rules.BusinessRuleValidator so both the manual
assignment endpoint and the auto-assign endpoint enforce the same rule
instead of the manual path relying only on the `status` field.
"""
from rest_framework.exceptions import ValidationError
from core_app.business_rules import BusinessRuleValidator


class EquipmentAssignmentService:
    @staticmethod
    def validate_assignment(equipment, flight):
        ok, reason = BusinessRuleValidator.can_assign_equipment_to_flight(
            equipment, flight)
        if not ok:
            raise ValidationError(reason)
