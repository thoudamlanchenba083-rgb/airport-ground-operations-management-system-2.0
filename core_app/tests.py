from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from flights.models import Airline, Aircraft, Flight
from django.utils import timezone
from datetime import timedelta


# -----------------------------------------
# Disable rate limiting for all tests
# -----------------------------------------
@override_settings(RATELIMIT_ENABLE=False)
class RateLimitDisabledTestCase(TestCase):
    pass


# -----------------------------------------
# HELPERS
# -----------------------------------------

def make_user(
        username='testuser',
        password='testpass123',
        role='GROUND_STAFF'):
    return User.objects.create_user(
        username=username, password=password, role=role)


def make_admin(username='adminuser', password='adminpass123'):
    return User.objects.create_user(
        username=username, password=password, role='ADMIN', is_staff=True
    )


def get_token(username, password):
    client = APIClient()
    res = client.post('/api/token/',
                      {'username': username,
                       'password': password},
                      format='json')
    return client.cookies['access_token'].value


def auth_client(token):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


# -----------------------------------------
# AUTH TESTS
# -----------------------------------------

@override_settings(RATELIMIT_ENABLE=False)
class RegistrationTests(TestCase):

    def setUp(self):
        self.client = APIClient()

    def test_register_valid_user(self):
        res = self.client.post('/api/accounts/register/', {
            'username': 'newuser',
            'email': 'new@test.com',
            'password': 'securepass1',
            'role': 'GROUND_STAFF',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_register_admin_role_blocked(self):
        """CRITICAL: No one should be able to self-register as ADMIN."""
        res = self.client.post('/api/accounts/register/', {
            'username': 'hacker',
            'email': 'hack@test.com',
            'password': 'securepass1',
            'role': 'ADMIN',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        # Custom exception handler wraps errors under 'message'
        errors = res.data.get('message') or res.data
        self.assertIn('role', errors)

    def test_register_duplicate_email(self):
        make_user(username='existing', password='pass12345')
        User.objects.filter(username='existing').update(email='dup@test.com')
        res = self.client.post('/api/accounts/register/', {
            'username': 'another',
            'email': 'dup@test.com',
            'password': 'securepass1',
            'role': 'GROUND_STAFF',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_short_password(self):
        res = self.client.post('/api/accounts/register/', {
            'username': 'shortpw',
            'email': 'short@test.com',
            'password': '123',
            'role': 'GROUND_STAFF',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_username(self):
        res = self.client.post('/api/accounts/register/', {
            'email': 'nouser@test.com',
            'password': 'securepass1',
            'role': 'GROUND_STAFF',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(RATELIMIT_ENABLE=False)
class LoginTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        make_user(username='loginuser', password='loginpass1')

    def test_login_valid_credentials(self):
        res = self.client.post('/api/token/', {
            'username': 'loginuser',
            'password': 'loginpass1',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access_token', res.cookies)
        self.assertIn('refresh_token', res.cookies)

    def test_login_wrong_password(self):
        res = self.client.post('/api/token/', {
            'username': 'loginuser',
            'password': 'wrongpass',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_user(self):
        res = self.client.post('/api/token/', {
            'username': 'ghost',
            'password': 'nothing123',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_empty_fields(self):
        res = self.client.post('/api/token/', {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


# -----------------------------------------
# FLIGHT TESTS
# -----------------------------------------

@override_settings(RATELIMIT_ENABLE=False)
class FlightTests(TestCase):

    def setUp(self):
        self.admin = make_admin()
        token = get_token('adminuser', 'adminpass123')
        self.client = auth_client(token)

        self.airline = Airline.objects.create(name='Test Air', code='TA')
        self.aircraft = Aircraft.objects.create(
            registration_number='REG001',
            aircraft_type='Boeing 737',
            capacity=180
        )

    def _flight_payload(self, flight_number='FL001'):
        return {
            'flight_number': flight_number,
            'airline': self.airline.id,
            'aircraft': self.aircraft.id,
            'origin': 'Chennai',
            'destination': 'Mumbai',
            'departure_time': (
                timezone.now() +
                timedelta(
                    hours=2)).isoformat(),
            'arrival_time': (
                timezone.now() +
                timedelta(
                    hours=4)).isoformat(),
            'status': 'SCHEDULED',
        }

    def test_create_flight(self):
        res = self.client.post(
            '/api/flights/flights/',
            self._flight_payload(),
            format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['flight_number'], 'FL001')

    def test_list_flights(self):
        Flight.objects.create(
            flight_number='FL002',
            airline=self.airline,
            aircraft=self.aircraft,
            origin='Delhi',
            destination='Bangalore',
            departure_time=timezone.now() + timedelta(hours=1),
            arrival_time=timezone.now() + timedelta(hours=3),
        )
        res = self.client.get('/api/flights/flights/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['count'], 1)

    def test_create_flight_duplicate_number(self):
        self.client.post(
            '/api/flights/flights/',
            self._flight_payload(),
            format='json')
        res = self.client.post(
            '/api/flights/flights/',
            self._flight_payload(),
            format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_flight_invalid_status(self):
        payload = self._flight_payload('FL003')
        payload['status'] = 'FLYING'
        res = self.client.post('/api/flights/flights/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_cannot_access_flights(self):
        unauth = APIClient()
        res = unauth.get('/api/flights/flights/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_flight_has_updated_at(self):
        res = self.client.post(
            '/api/flights/flights/',
            self._flight_payload(),
            format='json')
        self.assertIn('updated_at', res.data)


# -----------------------------------------
# STAFF TESTS
# -----------------------------------------

@override_settings(RATELIMIT_ENABLE=False)
class StaffTests(TestCase):

    def setUp(self):
        self.admin = make_admin()
        token = get_token('adminuser', 'adminpass123')
        self.client = auth_client(token)

    def _staff_payload(self, email='staff@test.com', employee_id='EMP001'):
        return {
            'name': 'John Doe',
            'employee_id': employee_id,
            'staff_type': 'GROUND',
            'phone': '9876543210',
            'email': email,
        }

    def test_create_staff(self):
        res = self.client.post(
            '/api/staff/staff/',
            self._staff_payload(),
            format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_duplicate_email_rejected(self):
        self.client.post(
            '/api/staff/staff/',
            self._staff_payload(),
            format='json')
        res = self.client.post(
            '/api/staff/staff/',
            self._staff_payload(
                employee_id='EMP002'),
            format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_employee_id_rejected(self):
        self.client.post(
            '/api/staff/staff/',
            self._staff_payload(),
            format='json')
        res = self.client.post(
            '/api/staff/staff/',
            self._staff_payload(
                email='other@test.com'),
            format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ground_staff_cannot_create_staff(self):
        make_user(
            username='grounduser',
            password='groundpass1',
            role='GROUND_STAFF')
        token = get_token('grounduser', 'groundpass1')
        client = auth_client(token)
        res = client.post(
            '/api/staff/staff/',
            self._staff_payload(),
            format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_staff(self):
        self.client.post(
            '/api/staff/staff/',
            self._staff_payload(),
            format='json')
        res = self.client.get('/api/staff/staff/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['count'], 1)


# -----------------------------------------
# EDGE CASE TESTS
# -----------------------------------------

@override_settings(RATELIMIT_ENABLE=False)
class EdgeCaseTests(TestCase):

    def setUp(self):
        self.admin = make_admin()
        token = get_token('adminuser', 'adminpass123')
        self.client = auth_client(token)

    def test_invalid_token_rejected(self):
        bad_client = APIClient()
        bad_client.credentials(HTTP_AUTHORIZATION='Bearer totallyinvalidtoken')
        res = bad_client.get('/api/flights/flights/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patch_nonexistent_flight(self):
        res = self.client.patch('/api/flights/99999/',
                                {'status': 'CANCELLED'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_nonexistent_staff(self):
        res = self.client.delete('/api/staff/99999/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_register_invalid_role(self):
        unauth = APIClient()
        res = unauth.post('/api/accounts/register/', {
            'username': 'badrole',
            'email': 'bad@test.com',
            'password': 'securepass1',
            'role': 'HACKER',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_cannot_access_staff(self):
        unauth = APIClient()
        res = unauth.get('/api/staff/staff/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
