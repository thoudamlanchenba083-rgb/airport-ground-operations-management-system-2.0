from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Gate
from flights.models import Airline, Aircraft, Flight

User = get_user_model()


class GateAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='admin', password='admin123', email='admin@test.com')
        self.user = User.objects.create_user(
            username='staffuser', password='staff123')
        self.gate = Gate.objects.create(
            gate_number='A1', terminal='A', is_available=True)
        self.airline = Airline.objects.create(name='Test Airline', code='TA')
        self.aircraft = Aircraft.objects.create(
            registration_number='TC-001',
            aircraft_type='Boeing 737',
            capacity=180)
        self.flight = Flight.objects.create(
            flight_number='TA001',
            origin='JFK',
            destination='LAX',
            departure_time='2026-07-01T10:00:00Z',
            arrival_time='2026-07-01T14:00:00Z',
            status='SCHEDULED',
            airline=self.airline,
            aircraft=self.aircraft)

    def get_token(self, username, password):
        self.client.post(
            '/api/token/', {'username': username, 'password': password})
        return self.client.cookies['access_token'].value

    def test_admin_can_create_gate(self):
        token = self.get_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post(
            '/api/gates/gates/', {'gate_number': 'B2', 'terminal': 'B', 'is_available': True})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_user_can_list_gates(self):
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/gates/gates/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_user_cannot_create_gate(self):
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post(
            '/api/gates/gates/', {'gate_number': 'C3', 'terminal': 'C', 'is_available': True})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_assign_gate(self):
        token = self.get_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/gates/gate-assignments/', {
            'gate': self.gate.id, 'flight': self.flight.id
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_unauthenticated_cannot_access_gates(self):
        response = self.client.get('/api/gates/gates/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_gate_type_choices_cover_all_new_types(self):
        gate_types = dict(Gate.GATE_TYPE_CHOICES)
        self.assertIn('domestic', gate_types)
        self.assertIn('international', gate_types)
        self.assertIn('swing', gate_types)

        connection_types = dict(Gate.CONNECTION_TYPE_CHOICES)
        self.assertIn('contact', connection_types)
        self.assertIn('remote', connection_types)

        body_types = dict(Gate.BODY_TYPE_CHOICES)
        self.assertIn('narrow_body', body_types)
        self.assertIn('wide_body', body_types)

        purposes = dict(Gate.PURPOSE_CHOICES)
        self.assertIn('passenger', purposes)
        self.assertIn('cargo', purposes)

    def test_admin_can_create_gate_with_new_attributes(self):
        token = self.get_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/gates/gates/', {
            'gate_number': 'B7',
            'terminal': 'B',
            'is_available': True,
            'gate_type': 'swing',
            'connection_type': 'remote',
            'body_type': 'wide_body',
            'purpose': 'passenger',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['gate_type'], 'swing')
        self.assertEqual(response.data['connection_type'], 'remote')
        self.assertEqual(response.data['body_type'], 'wide_body')

    def test_cargo_gate_cannot_be_assigned_to_passenger_flight(self):
        cargo_gate = Gate.objects.create(
            gate_number='CG1', terminal='Cargo', purpose='cargo')
        token = self.get_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/gates/gate-assignments/', {
            'gate': cargo_gate.id, 'flight': self.flight.id
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_swing_gate_accepts_domestic_and_international(self):
        swing_gate = Gate.objects.create(
            gate_number='SW1', terminal='A', gate_type='swing')
        self.flight.flight_type = 'international'
        self.flight.save()
        token = self.get_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/gates/gate-assignments/', {
            'gate': swing_gate.id, 'flight': self.flight.id
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
