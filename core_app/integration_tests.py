from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from flights.models import Airline, Aircraft
from django.utils import timezone
from datetime import timedelta


# -----------------------------------------
# HELPERS
# -----------------------------------------

def make_admin(username='admin', password='adminpass123'):
    return User.objects.create_user(
        username=username, password=password, role='ADMIN', is_staff=True
    )


def make_user(
        username='staffuser',
        password='staffpass123',
        role='GROUND_STAFF'):
    return User.objects.create_user(
        username=username, password=password, role=role)


def get_token(username, password):
    client = APIClient()
    client.post('/api/token/',
                {'username': username,
                 'password': password},
                format='json')
    return client.cookies['access_token'].value


def auth_client(token):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


# -----------------------------------------
# INTEGRATION: Full Auth Flow
# -----------------------------------------

@override_settings(RATELIMIT_ENABLE=False)
class AuthFlowIntegrationTest(TestCase):
    """Register -> Login -> Access protected -> Logout flow."""

    def test_full_auth_flow(self):
        # enforce_csrf_checks=True so the logout step below actually
        # exercises CSRF validation (Django's test client disables it by
        # default).
        client = APIClient(enforce_csrf_checks=True)

        # 1. Register
        res = client.post('/api/accounts/register/', {
            'username': 'flowuser',
            'email': 'flow@test.com',
            'password': 'flowpass123',
            'role': 'GROUND_STAFF',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # 2. Login - sets access/refresh as httpOnly cookies, plus a
        # non-httpOnly csrftoken cookie for subsequent state-changing calls.
        res = client.post('/api/token/', {
            'username': 'flowuser',
            'password': 'flowpass123',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access_token', res.cookies)
        self.assertIn('refresh_token', res.cookies)

        # 3. Access protected endpoint via the cookie alone - no header needed
        res = client.get('/api/flights/flights/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # 4. Refresh token - reads the refresh cookie automatically, writes
        # back a new (rotated) access/refresh pair as cookies.
        res = client.post('/api/token/refresh/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access_token', res.cookies)

        # 5. Logout (blacklists the refresh token, clears cookies). Cookie-
        # authenticated state-changing requests require the CSRF header.
        csrf_token = client.cookies['csrftoken'].value
        res = client.post('/api/accounts/logout/', HTTP_X_CSRFTOKEN=csrf_token)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # 6. Confirm the session is actually gone
        res = client.get('/api/flights/flights/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

# -----------------------------------------
# INTEGRATION: Full Flight CRUD Flow
# -----------------------------------------


@override_settings(RATELIMIT_ENABLE=False)
class FlightCRUDIntegrationTest(TestCase):
    """Create -> Read -> Update -> Delete a flight end-to-end."""

    def setUp(self):
        self.admin = make_admin()
        token = get_token('admin', 'adminpass123')
        self.client = auth_client(token)

        self.airline = Airline.objects.create(
            name='Integration Air', code='IA')
        self.aircraft = Aircraft.objects.create(
            registration_number='INT001',
            aircraft_type='Airbus A320',
            capacity=160
        )

    def _payload(self, number='INT100'):
        return {
            'flight_number': number,
            'airline': self.airline.id,
            'aircraft': self.aircraft.id,
            'origin': 'Chennai',
            'destination': 'Delhi',
            'departure_time': (
                timezone.now() +
                timedelta(
                    hours=2)).isoformat(),
            'arrival_time': (
                timezone.now() +
                timedelta(
                    hours=5)).isoformat(),
            'status': 'SCHEDULED',
        }

    def test_flight_crud_flow(self):
        # CREATE
        res = self.client.post(
            '/api/flights/flights/',
            self._payload(),
            format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        flight_id = res.data['id']
        self.assertEqual(res.data['status'], 'SCHEDULED')

        # READ
        res = self.client.get(f'/api/flights/flights/{flight_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['flight_number'], 'INT100')

        # UPDATE (status change)
        res = self.client.patch(
            f'/api/flights/flights/{flight_id}/', {'status': 'BOARDING'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], 'BOARDING')

        # Verify updated_at changed
        self.assertIn('updated_at', res.data)

        # DELETE
        res = self.client.delete(f'/api/flights/flights/{flight_id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        # Confirm gone
        res = self.client.get(f'/api/flights/flights/{flight_id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


# -----------------------------------------
# INTEGRATION: Full Staff CRUD Flow
# -----------------------------------------

@override_settings(RATELIMIT_ENABLE=False)
class StaffCRUDIntegrationTest(TestCase):
    """Create -> Read -> Update -> Delete a staff member end-to-end."""

    def setUp(self):
        self.admin = make_admin()
        token = get_token('admin', 'adminpass123')
        self.client = auth_client(token)

    def test_staff_crud_flow(self):
        payload = {
            'name': 'Alice Integration',
            'employee_id': 'EMP999',
            'staff_type': 'SECURITY',
            'phone': '9000000001',
            'email': 'alice@integration.com',
        }

        # CREATE
        res = self.client.post('/api/staff/staff/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        staff_id = res.data['id']

        # READ
        res = self.client.get(f'/api/staff/staff/{staff_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['name'], 'Alice Integration')

        # UPDATE
        res = self.client.patch(
            f'/api/staff/staff/{staff_id}/', {'phone': '9111111111'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['phone'], '9111111111')

        # DELETE
        res = self.client.delete(f'/api/staff/staff/{staff_id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

        # Confirm gone
        res = self.client.get(f'/api/staff/staff/{staff_id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


# -----------------------------------------
# INTEGRATION: Role-Based Access Control
# -----------------------------------------

@override_settings(RATELIMIT_ENABLE=False)
class RBACIntegrationTest(TestCase):
    """Verify role permissions are enforced across endpoints."""

    def setUp(self):
        self.admin = make_admin()
        self.ground = make_user(
            username='ground',
            password='groundpass1',
            role='GROUND_STAFF')

        self.admin_token = get_token('admin', 'adminpass123')
        self.ground_token = get_token('ground', 'groundpass1')

        self.airline = Airline.objects.create(name='RBAC Air', code='RB')
        self.aircraft = Aircraft.objects.create(
            registration_number='RB001',
            aircraft_type='Boeing 777',
            capacity=300
        )

    def _flight_payload(self):
        return {
            'flight_number': 'RB100',
            'airline': self.airline.id,
            'aircraft': self.aircraft.id,
            'origin': 'Karur',
            'destination': 'Singapore',
            'departure_time': (
                timezone.now() +
                timedelta(
                    hours=3)).isoformat(),
            'arrival_time': (
                timezone.now() +
                timedelta(
                    hours=10)).isoformat(),
            'status': 'SCHEDULED',
        }

    def test_admin_can_create_staff(self):
        client = auth_client(self.admin_token)
        res = client.post('/api/staff/staff/', {
            'name': 'Bob RBAC',
            'employee_id': 'RBAC01',
            'staff_type': 'GROUND',
            'phone': '9000000002',
            'email': 'bob@rbac.com',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_ground_staff_cannot_create_staff(self):
        client = auth_client(self.ground_token)
        res = client.post('/api/staff/staff/', {
            'name': 'Charlie RBAC',
            'employee_id': 'RBAC02',
            'staff_type': 'GROUND',
            'phone': '9000000003',
            'email': 'charlie@rbac.com',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_ground_staff_can_read_flights(self):
        client = auth_client(self.ground_token)
        res = client.get('/api/flights/flights/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_unauthenticated_blocked_everywhere(self):
        unauth = APIClient()
        endpoints = [
            '/api/flights/flights/',
            '/api/staff/staff/',
            '/api/baggage/baggage/']
        for url in endpoints:
            res = unauth.get(url)
            self.assertEqual(
                res.status_code,
                status.HTTP_401_UNAUTHORIZED,
                msg=f"Expected 401 on {url}")
