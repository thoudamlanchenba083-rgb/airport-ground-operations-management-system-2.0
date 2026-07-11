"""
Business logic for water/lavatory turnaround servicing.
"""
from django.utils import timezone
from rest_framework.exceptions import ValidationError


class WaterLavatoryServiceRules:
    """Rules for completing/progressing a WaterLavatoryService task."""

    @staticmethod
    def build_status_timestamps(instance, validated_data):
        extra = {}
        new_status = validated_data.get('status')

        if new_status == 'COMPLETED':
            water = validated_data.get(
                'potable_water_refilled', instance.potable_water_refilled)
            lavatory = validated_data.get(
                'lavatory_serviced', instance.lavatory_serviced)
            waste = validated_data.get(
                'waste_disposed', instance.waste_disposed)
            if not (water and lavatory and waste):
                raise ValidationError(
                    'Cannot mark service COMPLETED until potable water '
                    'refill, lavatory servicing, and waste disposal are '
                    'all done.'
                )
            if not instance.completed_at:
                extra['completed_at'] = timezone.now()

        if new_status == 'IN_PROGRESS' and not instance.started_at:
            extra['started_at'] = timezone.now()

        return extra

    @staticmethod
    def validate_water_quantity(quantity):
        if quantity is not None and quantity < 0:
            raise ValidationError('Water quantity cannot be negative.')
