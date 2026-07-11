"""
Business logic for passenger boarding sessions.
"""
from django.utils import timezone
from rest_framework.exceptions import ValidationError

# Forward-only lifecycle for a boarding session.
STATUS_ORDER = ['NOT_STARTED', 'BOARDING', 'FINAL_CALL', 'COMPLETED']


class BoardingSessionService:
    @staticmethod
    def build_status_timestamps(instance, validated_data):
        extra = {}
        new_status = validated_data.get('status')

        if new_status in STATUS_ORDER and instance.status in STATUS_ORDER:
            if STATUS_ORDER.index(new_status) < STATUS_ORDER.index(
                    instance.status):
                raise ValidationError(
                    f'Cannot move boarding session backwards from '
                    f'"{instance.status}" to "{new_status}".'
                )

        passengers_boarded = validated_data.get(
            'passengers_boarded', instance.passengers_boarded)
        passenger_count = validated_data.get(
            'passenger_count', instance.passenger_count)
        if passenger_count is not None and passengers_boarded is not None \
                and passengers_boarded > passenger_count:
            raise ValidationError(
                'passengers_boarded cannot exceed passenger_count.')

        if new_status == 'BOARDING' and not instance.boarding_started_at:
            extra['boarding_started_at'] = timezone.now()
        if new_status == 'FINAL_CALL' and not instance.final_call_at:
            extra['final_call_at'] = timezone.now()
        if new_status == 'COMPLETED' and not instance.boarding_completed_at:
            extra['boarding_completed_at'] = timezone.now()

        return extra
