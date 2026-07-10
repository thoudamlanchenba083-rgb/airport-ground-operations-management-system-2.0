"""
Security-focused test suite: authentication enforcement, authorization
boundaries, rate limiting, and information disclosure checks.
Run with: python manage.py test core_app.security_tests
"""
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User


class UnauthenticatedAccessTests(TestCase):
    """No endpoint should return data without a valid JWT."""

    def setUp(self):
        self.client = APIClient()

    def test_flights_list_requires_auth(self):
        response = self.client.get('/api/flights/flights/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_gates_list_requires_auth(self):
        response = self.client.get('/api/gates/gates/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_staff_list_requires_auth(self):
        response = self.client.get('/api/staff/staff/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_token_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer not-a-real-token')
        response = self.client.get('/api/flights/flights/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class RoleBasedAuthorizationTests(TestCase):
    """Regular authenticated users should not be able to perform admin-only actions."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='sec_admin',
            password='TestPass123!',
            role='ADMIN',
            is_staff=True)
        self.regular_user = User.objects.create_user(
            username='sec_user', password='TestPass123!', role='MAINTENANCE'

        )

    def _login(self, username, password):
        self.client.post(
            '/api/token/', {'username': username, 'password': password})

    def test_regular_user_cannot_create_airline(self):
        self._login('sec_user', 'TestPass123!')
        response = self.client.post(
            '/api/flights/airlines/', {'name': 'Test Air', 'code': 'TA1'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_airline(self):
        self._login('sec_admin', 'TestPass123!')
        response = self.client.post(
            '/api/flights/airlines/', {'name': 'Test Air', 'code': 'TA2'})
        self.assertIn(
            response.status_code, [
                status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_wrong_password_rejected(self):
        response = self.client.post(
            '/api/token/', {'username': 'sec_user', 'password': 'WrongPassword'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class InformationDisclosureTests(TestCase):
    """Error responses shouldn't leak stack traces, settings, or internal paths."""

    def setUp(self):
        self.client = APIClient()

    def test_404_does_not_leak_debug_traceback(self):
        response = self.client.get('/api/flights/flights/999999/')
        body = response.content.decode().lower()
        # Django's debug error page includes this literal string when
        # DEBUG=True
        self.assertNotIn('django version', body)
        self.assertNotIn('traceback', body)

    def test_malformed_request_does_not_leak_secret_key(self):
        response = self.client.post(
            '/api/flights/flights/', {'not_a_real_field': '<script>alert(1)</script>'})
        body = response.content.decode()
        self.assertNotIn('SECRET_KEY', body)
        self.assertNotIn('secret_key', body.lower())


@override_settings(RATELIMIT_ENABLE=True)
class RateLimitTests(TestCase):
    """
    Login should be rate-limited per README (5 attempts/minute per IP).
    Note: RATELIMIT_ENABLE is forced True here via override_settings since
    it's disabled globally during test runs (see backend/settings.py TESTING flag).
    """

    def setUp(self):
        self.client = APIClient()
        User.objects.create_user(
            username='ratelimit_user',
            password='TestPass123!')

    def test_repeated_failed_logins_are_rate_limited(self):
        responses = []
        for _ in range(7):
            response = self.client.post(
                '/api/token/', {'username': 'ratelimit_user', 'password': 'wrong'})
            responses.append(response.status_code)
        # django-ratelimit blocks with 403 (PermissionDenied) by default, not
        # 429
        self.assertIn(status.HTTP_403_FORBIDDEN, responses)
        # Confirm the block happens after the documented 5/minute threshold
        self.assertEqual(responses[:5].count(status.HTTP_401_UNAUTHORIZED), 5)
