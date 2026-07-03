from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from flights.models import Flight
from maintenance.models import MaintenanceRequest
from baggage.models import BaggageTracking
from .models import Notification

User = get_user_model()


def _notify(users_qs, notif_type, message):
    """Bulk-create one Notification per recipient."""
    notifications = [
        Notification(user=u, type=notif_type, message=message)
        for u in users_qs.distinct()
    ]
    if notifications:
        Notification.objects.bulk_create(notifications)


def _recipients_for(roles):
    """Everyone with one of the given roles, plus all staff/admin users."""
    return User.objects.filter(role__in=roles) | User.objects.filter(is_staff=True)


# ---------------------------------------------------------------------------
# Flight status changes
# ---------------------------------------------------------------------------
@receiver(pre_save, sender=Flight)
def stash_old_flight_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._old_status = Flight.objects.only('status').get(pk=instance.pk).status
        except Flight.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=Flight)
def notify_flight_status_change(sender, instance, created, **kwargs):
    old_status = getattr(instance, '_old_status', None)

    if created:
        message = f"Flight {instance.flight_number} scheduled ({instance.origin} → {instance.destination})."
    elif old_status is not None and old_status != instance.status:
        message = f"Flight {instance.flight_number} status changed: {old_status} → {instance.status}."
    else:
        return  # no meaningful change, skip

    recipients = _recipients_for(['ADMIN', 'OPERATIONS_MANAGER', 'GATE_MANAGER'])
    _notify(recipients, 'FLIGHT', message)


# ---------------------------------------------------------------------------
# Maintenance request status changes
# ---------------------------------------------------------------------------
@receiver(pre_save, sender=MaintenanceRequest)
def stash_old_maintenance_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._old_status = MaintenanceRequest.objects.only('status').get(pk=instance.pk).status
        except MaintenanceRequest.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=MaintenanceRequest)
def notify_maintenance_status_change(sender, instance, created, **kwargs):
    old_status = getattr(instance, '_old_status', None)

    if created:
        message = (
            f"New maintenance request for {instance.aircraft.registration_number} "
            f"({instance.priority} priority)."
        )
    elif old_status is not None and old_status != instance.status:
        message = (
            f"Maintenance request #{instance.pk} for {instance.aircraft.registration_number} "
            f"status changed: {old_status} → {instance.status}."
        )
    else:
        return

    recipients = _recipients_for(['ADMIN', 'MAINTENANCE_ENGINEER', 'MAINTENANCE', 'SUPERVISOR'])
    _notify(recipients, 'MAINTENANCE', message)


# ---------------------------------------------------------------------------
# Baggage tracking updates
# ---------------------------------------------------------------------------
@receiver(post_save, sender=BaggageTracking)
def notify_baggage_tracking_update(sender, instance, created, **kwargs):
    if not created:
        return  # each tracking row is itself a new status event

    message = (
        f"Baggage {instance.baggage.baggage_tag} status: {instance.status}"
        + (f" at {instance.location}." if instance.location else ".")
    )

    recipients = _recipients_for(['ADMIN', 'BAGGAGE_SUPERVISOR', 'GROUND_STAFF'])
    _notify(recipients, 'BAGGAGE', message)
