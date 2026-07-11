"""
Business logic for aircraft cleaning turnaround tasks.
"""
from django.utils import timezone
from rest_framework.exceptions import ValidationError


class CleaningTaskService:
    """Rules for completing/progressing a CleaningTask."""

    @staticmethod
    def build_status_timestamps(instance, validated_data):
        """
        Given the incoming validated_data for an update, returns the extra
        auto-stamped fields (started_at/completed_at) and enforces that a
        task can't be marked COMPLETED until every sub-task checkbox is done.
        """
        extra = {}
        new_status = validated_data.get('status')

        if new_status == 'COMPLETED':
            interior = validated_data.get(
                'interior_cleaned', instance.interior_cleaned)
            exterior = validated_data.get(
                'exterior_wash', instance.exterior_wash)
            waste = validated_data.get(
                'waste_removed', instance.waste_removed)
            if not (interior and exterior and waste):
                raise ValidationError(
                    'Cannot mark cleaning task COMPLETED until interior '
                    'cleaning, exterior wash, and waste removal are all done.'
                )
            if not instance.completed_at:
                extra['completed_at'] = timezone.now()

        if new_status == 'IN_PROGRESS' and not instance.started_at:
            extra['started_at'] = timezone.now()

        return extra
