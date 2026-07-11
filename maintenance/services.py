"""
Business logic for the maintenance-request approval workflow.
Pulled out of views.py so the state-transition rules (who/what/when) can
be tested and read independently of HTTP concerns, per the project's
services-layer convention (see docs/ARCHITECTURE.md).
"""
from rest_framework.exceptions import PermissionDenied, ValidationError


def is_supervisor_or_admin(user):
    return user.role in (
        'ADMIN',
        'SUPERVISOR',
        'OPERATIONS_MANAGER') or user.is_staff


class MaintenanceApprovalService:
    """Encapsulates the PENDING_APPROVAL -> APPROVED/REJECTED -> IN_PROGRESS flow."""

    @staticmethod
    def approve(instance, user):
        if not is_supervisor_or_admin(user):
            raise PermissionDenied(
                'Only supervisors, operations managers or admins can '
                'approve requests.')
        if instance.status != 'PENDING_APPROVAL':
            raise ValidationError(
                f'Cannot approve a request with status "{instance.status}". '
                f'Must be PENDING_APPROVAL.')
        instance.status = 'APPROVED'
        instance.approved_by = user
        instance.rejection_reason = ''
        instance.save()
        return instance

    @staticmethod
    def reject(instance, user, rejection_reason):
        if not is_supervisor_or_admin(user):
            raise PermissionDenied(
                'Only supervisors, operations managers or admins can '
                'reject requests.')
        if instance.status != 'PENDING_APPROVAL':
            raise ValidationError(
                f'Cannot reject a request with status "{instance.status}". '
                f'Must be PENDING_APPROVAL.')
        instance.status = 'REJECTED'
        instance.rejection_reason = rejection_reason
        instance.save()
        return instance

    @staticmethod
    def start(instance, user):
        if not is_supervisor_or_admin(user):
            raise PermissionDenied(
                'Only supervisors, operations managers or admins can '
                'start requests.')
        if instance.status != 'APPROVED':
            raise ValidationError(
                f'Cannot start a request with status "{instance.status}". '
                f'Must be APPROVED.')
        instance.status = 'IN_PROGRESS'
        instance.save()
        return instance

    @staticmethod
    def validate_direct_status_change(
            old_status, new_status, user, restricted_transitions):
        if (old_status, new_status) in restricted_transitions \
                and not is_supervisor_or_admin(user):
            raise PermissionDenied(
                'This status change must go through the approve/reject/start '
                'endpoints, which only supervisors, operations managers or '
                'admins can use.'
            )
