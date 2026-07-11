"""
Custom middleware for request-level logging.

Django's default middleware stack (security, CORS, sessions, CSRF, auth,
messages, clickjacking) doesn't log anything about individual requests —
that's handled ad hoc today via scattered `log_action()` calls inside
specific views. This middleware adds a single, consistent place that logs
every API request's method, path, response status, and duration, which is
useful for debugging slow/failing endpoints without having to reproduce
the request.

It deliberately does NOT duplicate the AuditLog business-event logging
(see core_app.utils.log_action) — that's for "what changed and who did
it" audit trail purposes. This is closer to an access/performance log.
"""
import logging
import time

logger = logging.getLogger('request')


class RequestLoggingMiddleware:
    """
    Logs `<METHOD> <path> -> <status> (<duration>ms)` for every request
    under /api/, at INFO level for successful requests and WARNING for
    4xx/5xx responses, so failures are easy to spot in the logs.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.monotonic()
        response = self.get_response(request)

        if request.path.startswith('/api/'):
            duration_ms = round((time.monotonic() - start) * 1000, 1)
            user = getattr(request, 'user', None)
            username = user.username if user and user.is_authenticated else 'anonymous'
            message = (
                f'{request.method} {request.path} -> '
                f'{response.status_code} ({duration_ms}ms) [{username}]'
            )
            if response.status_code >= 400:
                logger.warning(message)
            else:
                logger.info(message)

        return response