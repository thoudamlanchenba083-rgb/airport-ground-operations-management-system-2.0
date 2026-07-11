from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import BoardingSession, BoardingGroup
from flights.models import Airline, Aircraft, Flight

User = get_user_model()


class PassengerBoardingAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='admin', password='admin123', email='admin@test.com')
        self.staff = User.objects.create_user(
            username='gatestaff', password='staff123', role='GATE_MANAGER')

        self.airline = Airline.objects.create(name='Test Airline', code='TA')
        self.aircraft = Aircraft.objects.create(
            registration_number='TC-100',
            aircraft_type='Airbus A320',
            capacity=180)
        self.flight = Flight.objects.create(
            flight_number='TA100',
            origin='JFK',
            destination='LAX',
            departure_time='2026-07-01T10:00:00Z',
            arrival_time='2026-07-01T14:00:00Z',
            status='SCHEDULED',
            airline=self.airline,
            aircraft=self.aircraft)

        self.session = BoardingSession.objects.create(
            flight=self.flight,
            boarding_gate='B12',
            status='NOT_STARTED',
            passenger_count=150)

    def get_token(self, username, password):
        self.client.post(
            '/api/token/', {'username': username, 'password': password})
        return self.client.cookies['access_token'].value

    def test_unauthenticated_cannot_access_sessions(self):
        response = self.client.get('/api/passenger-boarding/boarding-sessions/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_list_sessions(self):
        token = self.get_token('gatestaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/passenger-boarding/boarding-sessions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_authenticated_user_can_create_session(self):
        aircraft2 = Aircraft.objects.create(
            registration_number='TC-101',
            aircraft_type='Boeing 737',
            capacity=160)
        flight2 = Flight.objects.create(
            flight_number='TA101',
            origin='ORD',
            destination='MIA',
            departure_time='2026-07-02T09:00:00Z',
            arrival_time='2026-07-02T13:00:00Z',
            status='SCHEDULED',
            airline=self.airline,
            aircraft=aircraft2)
        token = self.get_token('gatestaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/passenger-boarding/boarding-sessions/', {
            'flight': flight2.id,
            'boarding_gate': 'C4',
            'status': 'NOT_STARTED',
            'passenger_count': 120
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_authenticated_read_allowed_but_write_forbidden_for_wrong_role(self):
        User.objects.create_user(
            username='hrperson', password='hr12345', role='HR')
        token = self.get_token('hrperson', 'hr12345')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        read_response = self.client.get('/api/passenger-boarding/boarding-sessions/')
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)

        write_response = self.client.patch(
            f'/api/passenger-boarding/boarding-sessions/{self.session.id}/',
            {'boarding_gate': 'Z9'},
            content_type='application/json')
        self.assertEqual(write_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_passengers_boarded_cannot_exceed_passenger_count(self):
        token = self.get_token('gatestaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/passenger-boarding/boarding-sessions/{self.session.id}/',
            {'passengers_boarded': 999},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_status_cannot_move_backwards(self):
        self.session.status = 'BOARDING'
        self.session.save()
        token = self.get_token('gatestaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/passenger-boarding/boarding-sessions/{self.session.id}/',
            {'status': 'NOT_STARTED'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_status_transition_to_boarding_sets_timestamp(self):
        token = self.get_token('gatestaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/passenger-boarding/boarding-sessions/{self.session.id}/',
            {'status': 'BOARDING'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.session.refresh_from_db()
        self.assertIsNotNone(self.session.boarding_started_at)

    def test_filter_sessions_by_status(self):
        BoardingSession.objects.create(
            flight=Flight.objects.create(
                flight_number='TA200', origin='SFO', destination='SEA',
                departure_time='2026-07-03T08:00:00Z',
                arrival_time='2026-07-03T10:00:00Z',
                status='SCHEDULED', airline=self.airline,
                aircraft=Aircraft.objects.create(
                    registration_number='TC-200',
                    aircraft_type='Boeing 787',
                    capacity=250)),
            boarding_gate='D1',
            status='BOARDING',
            passenger_count=200)
        token = self.get_token('gatestaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(
            '/api/passenger-boarding/boarding-sessions/?status=BOARDING')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if 'results' in response.data else response.data
        for item in results:
            self.assertEqual(item['status'], 'BOARDING')

    def test_create_boarding_group(self):
        token = self.get_token('gatestaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/passenger-boarding/boarding-groups/', {
            'boarding_session': self.session.id,
            'group_name': 'Priority',
            'passenger_count': 20
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_duplicate_group_name_in_same_session_rejected(self):
        BoardingGroup.objects.create(
            boarding_session=self.session,
            group_name='Zone A',
            passenger_count=30)
        token = self.get_token('gatestaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/passenger-boarding/boarding-groups/', {
            'boarding_session': self.session.id,
            'group_name': 'Zone A',
            'passenger_count': 15
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_boarding_group_str_representation(self):
        group = BoardingGroup.objects.create(
            boarding_session=self.session,
            group_name='Group 1',
            passenger_count=40)
        self.assertIn('TA100', str(group))
        self.assertIn('Group 1', str(group))
