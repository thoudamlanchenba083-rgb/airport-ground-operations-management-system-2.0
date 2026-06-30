from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from flights.models import Flight
from staff.models import StaffAssignment
from gates.models import GateAssignment
from ground_equipment.models import EquipmentAssignment
from .business_rules import BusinessRuleValidator

@receiver(pre_save, sender=Flight)
def validate_flight_before_save(sender, instance, **kwargs):
    """Validate flight data before saving"""
    if instance.passenger_count:
        BusinessRuleValidator.validate_passenger_count(instance)


@receiver(pre_save, sender=StaffAssignment)
def validate_staff_assignment(sender, instance, **kwargs):
    """Validate staff assignment before saving"""
    can_assign, message = BusinessRuleValidator.can_assign_staff_to_flight(
        instance.staff, 
        instance.flight
    )
    if not can_assign:
        raise ValidationError(message)


@receiver(pre_save, sender=GateAssignment)
def validate_gate_assignment(sender, instance, **kwargs):
    """Validate gate assignment before saving"""
    can_assign, message = BusinessRuleValidator.can_assign_gate_to_flight(
        instance.gate,
        instance.flight
    )
    if not can_assign:
        raise ValidationError(message)


@receiver(pre_save, sender=EquipmentAssignment)
def validate_equipment_assignment(sender, instance, **kwargs):
    """Validate equipment assignment before saving"""
    can_assign, message = BusinessRuleValidator.can_assign_equipment_to_flight(
        instance.equipment,
        instance.flight
    )
    if not can_assign:
        raise ValidationError(message)
