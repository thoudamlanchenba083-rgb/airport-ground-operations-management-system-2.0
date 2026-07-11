"""
Business logic for safety/security incident handling.
"""
from django.utils import timezone
from rest_framework.exceptions import ValidationError


class IncidentService:
    @staticmethod
    def build_status_timestamps(instance, validated_data):
        extra = {}
        new_status = validated_data.get('status')

        if new_status in ('RESOLVED', 'CLOSED'):
            corrective_action = validated_data.get(
                'corrective_action', instance.corrective_action)
            severity = validated_data.get('severity', instance.severity)
            if severity in ('HIGH', 'CRITICAL') and not corrective_action:
                raise ValidationError(
                    'A corrective action must be recorded before resolving '
                    'or closing a HIGH/CRITICAL severity incident.'
                )
            if not instance.resolved_at:
                extra['resolved_at'] = timezone.now()

        if new_status == 'REPORTED' and instance.resolved_at:
            raise ValidationError(
                'Cannot reopen a resolved incident back to REPORTED. '
                'Use INVESTIGATING instead.'
            )

        return extra
