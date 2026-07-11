"""
Business logic for catering orders.
"""
from django.utils import timezone
from rest_framework.exceptions import ValidationError


class CateringOrderService:
    @staticmethod
    def validate_meal_count(meal_count):
        if meal_count is not None and meal_count <= 0:
            raise ValidationError('Meal count must be greater than zero.')

    @staticmethod
    def build_status_timestamps(instance, validated_data):
        extra = {}
        new_status = validated_data.get('status')

        if new_status == 'LOADED':
            meal_count = validated_data.get('meal_count', instance.meal_count)
            if not meal_count:
                raise ValidationError(
                    'Cannot mark a catering order LOADED with a meal_count '
                    'of zero.'
                )
            if not instance.loaded_at:
                extra['loading_completed'] = True
                extra['loaded_at'] = timezone.now()

        if new_status == 'CANCELLED' and instance.loaded_at:
            raise ValidationError(
                'Cannot cancel a catering order that has already been '
                'loaded.'
            )

        return extra
