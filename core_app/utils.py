from .models import AuditLog


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_action(
        user,
        action,
        model_name,
        object_id=None,
        description='',
        request=None):
    ip_address = get_client_ip(request) if request else None
    AuditLog.objects.create(
        user=user if user and user.is_authenticated else None,
        action=action,
        model_name=model_name,
        object_id=object_id,
        description=description,
        ip_address=ip_address,
    )


def log_view(user, model_name, object_id=None, request=None):
    log_action(user, 'VIEW', model_name, object_id,
               f'Viewed {model_name} {object_id or "list"}', request)
