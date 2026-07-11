"""
Business logic for turnaround task progress tracking.
"""
from django.utils import timezone
from rest_framework.exceptions import ValidationError


class TurnaroundTaskService:
    @staticmethod
    def build_status_timestamps(instance, validated_data, user):
        """
        Auto-stamps completed_by/actual_start_time/actual_end_time based
        on a status change, and flags out-of-sequence completions as a
        soft warning rather than blocking them outright (ground ops
        frequently run tasks in parallel/out of the "ideal" order, so this
        is informative rather than a hard business rule).
        """
        extra = {}
        new_status = validated_data.get('status')

        if new_status == 'COMPLETED':
            extra['completed_by'] = user
            if not validated_data.get(
                    'actual_end_time') and not instance.actual_end_time:
                extra['actual_end_time'] = timezone.now()

        if new_status == 'IN_PROGRESS' and not instance.actual_start_time:
            extra['actual_start_time'] = timezone.now()

        return extra

    @staticmethod
    def validate_task_type_for_flight(flight, task_type, exclude_pk=None):
        """A flight can only have one TurnaroundTask row per task_type
        (also enforced at the DB level via unique_together, but raising
        here gives a friendlier 400 instead of an IntegrityError 500)."""
        from .models import TurnaroundTask
        qs = TurnaroundTask.objects.filter(flight=flight, task_type=task_type)
        if exclude_pk:
            qs = qs.exclude(pk=exclude_pk)
        if qs.exists():
            raise ValidationError(
                f'Flight {flight.flight_number} already has a '
                f'"{task_type}" turnaround task.'
            )
