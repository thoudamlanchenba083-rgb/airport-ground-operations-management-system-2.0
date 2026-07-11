"""
Business logic for ramp inspections and pushback operations.
"""
from django.utils import timezone
from rest_framework.exceptions import ValidationError

PUSHBACK_STATUS_ORDER = ['REQUESTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED']


class RampInspectionService:
    @staticmethod
    def build_status_timestamps(instance, validated_data):
        extra = {}
        new_status = validated_data.get('status')

        if new_status == 'PASSED':
            cone_ok = validated_data.get(
                'cone_placement_ok', instance.cone_placement_ok)
            zone_clear = validated_data.get(
                'safety_zone_clear', instance.safety_zone_clear)
            fod_clear = validated_data.get(
                'fod_check_clear', instance.fod_check_clear)
            if not (cone_ok and zone_clear and fod_clear):
                raise ValidationError(
                    'Cannot mark a ramp inspection PASSED unless cone '
                    'placement, safety zone, and FOD checks are all clear.'
                )

        if new_status in ('PASSED', 'FAILED') and not instance.inspected_at:
            extra['inspected_at'] = timezone.now()

        return extra


class PushbackOperationService:
    @staticmethod
    def build_status_timestamps(instance, validated_data):
        extra = {}
        new_status = validated_data.get('status')

        if new_status in PUSHBACK_STATUS_ORDER and instance.status in (
                'REQUESTED', 'APPROVED', 'IN_PROGRESS'):
            # REJECTED is reachable from REQUESTED at any time; otherwise
            # enforce the normal forward order.
            if new_status != 'REJECTED' and \
                    PUSHBACK_STATUS_ORDER.index(new_status) < \
                    PUSHBACK_STATUS_ORDER.index(instance.status):
                raise ValidationError(
                    f'Cannot move pushback operation backwards from '
                    f'"{instance.status}" to "{new_status}".'
                )

        if new_status == 'APPROVED':
            if not validated_data.get('approved_by', instance.approved_by):
                raise ValidationError(
                    'An approver (approved_by) is required to approve a '
                    'pushback operation.'
                )
            if not instance.approved_at:
                extra['approved_at'] = timezone.now()
        if new_status == 'IN_PROGRESS' and not instance.started_at:
            extra['started_at'] = timezone.now()
        if new_status == 'COMPLETED' and not instance.completed_at:
            extra['completed_at'] = timezone.now()

        return extra
