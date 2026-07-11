"""
Business logic for the notification system.
"""


class NotificationService:
    @staticmethod
    def create_for_user(user, notif_type, message):
        """Create a single notification. Used by signals/other apps so
        the creation rule lives in one place instead of being duplicated
        as inline Notification.objects.create() calls."""
        from .models import Notification
        return Notification.objects.create(
            user=user, type=notif_type, message=message)

    @staticmethod
    def mark_all_read(queryset):
        """Bulk-marks a queryset of notifications as read; returns the count updated."""
        return queryset.filter(is_read=False).update(is_read=True)
