from django.core.mail import send_mail
from django.conf import settings


def send_welcome_email(user):
    """Sent after successful registration."""
    send_mail(
        subject='Welcome to Airport Ground Operations',
        message=f'''Hi {user.username},

Your account has been created successfully.

Role: {user.role}

You can now log in at the Airport Ops platform.

— Airport Ops Team
''',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


def send_maintenance_approved_email(request_obj):
    """Sent when a maintenance request is approved."""
    reporter = request_obj.reported_by
    if not reporter or not reporter.email:
        return
    send_mail(
        subject=f'Maintenance Request #{request_obj.id} Approved',
        message=f'''Hi {reporter.username},

Your maintenance request #{request_obj.id} has been approved.

Aircraft : {request_obj.aircraft.registration_number}
Priority : {request_obj.priority}
Approved by: {request_obj.approved_by}

The team will begin work shortly.

— Airport Ops Team
''',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[reporter.email],
        fail_silently=True,
    )


def send_maintenance_rejected_email(request_obj):
    """Sent when a maintenance request is rejected."""
    reporter = request_obj.reported_by
    if not reporter or not reporter.email:
        return
    send_mail(
        subject=f'Maintenance Request #{request_obj.id} Rejected',
        message=f'''Hi {reporter.username},

Your maintenance request #{request_obj.id} has been rejected.

Aircraft : {request_obj.aircraft.registration_number}
Priority : {request_obj.priority}
Reason   : {request_obj.rejection_reason or "No reason provided."}

Please contact your supervisor for more details.

— Airport Ops Team
''',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[reporter.email],
        fail_silently=True,
    )