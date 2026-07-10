from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """
    JWT auth that reads the access token from an httpOnly cookie when no
    Authorization header is present, so the frontend never needs JS-visible
    access to the token (mitigates token theft via XSS).

    Falls back to the standard header-based behavior first, so non-browser
    clients (Swagger's "Authorize" button, Postman, mobile apps, server-to-
    server calls) keep working exactly as before, unaffected by any of this.

    Only cookie-authenticated requests get a CSRF check. Header-authenticated
    requests don't need one: a browser never attaches a custom header to a
    request it didn't build in your own JS, so there's nothing cross-site
    forgeries could exploit there. Cookies, by contrast, are auto-attached
    by the browser to any matching request from anywhere, which is exactly
    what makes CSRF possible, so those requests need the extra check.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token is None:
                return None
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token

        raw_token = request.COOKIES.get('access_token')
        if raw_token is None:
            return None
        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)
        self.enforce_csrf(request)
        return user, validated_token

    def enforce_csrf(self, request):
        """Mirrors DRF's SessionAuthentication.enforce_csrf exactly, reusing
        Django's own double-submit-cookie CSRF machinery rather than a
        bespoke implementation. Requires the frontend to send back the value
        of the (non-httpOnly) 'csrftoken' cookie as an 'X-CSRFToken' header
        on unsafe (state-changing) requests - axios does this automatically
        once configured with xsrfCookieName/xsrfHeaderName."""
        def dummy_get_response(request):  # pragma: no cover
            return None

        check = CSRFCheck(dummy_get_response)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise exceptions.PermissionDenied('CSRF Failed: %s' % reason)
