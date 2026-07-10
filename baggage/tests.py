from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Baggage
from flights.models import Airline, Aircraft, Flight

User = get_user_model()


class BaggageAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='admin', password='admin123', email='admin@test.com')
        self.user = User.objects.create_user(
            username='staffuser', password='staff123')
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
        self.baggage = Baggage.objects.create(
            baggage_tag='BAG001',
            passenger_name='John Doe',
            weight=23.5,
            flight=self.flight)

    def get_token(self, username, password):
        self.client.post(
            '/api/token/', {'username': username, 'password': password})
        return self.client.cookies['access_token'].value

    def test_admin_can_create_baggage(self):
        token = self.get_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/baggage/baggage/',
                                    {'baggage_tag': 'BAG002',
                                     'passenger_name': 'Jane Doe',
                                     'weight': '18.0',
                                     'flight': self.flight.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_user_can_list_baggage(self):
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/baggage/baggage/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_user_cannot_create_baggage(self):
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/baggage/baggage/',
                                    {'baggage_tag': 'BAG003',
                                     'passenger_name': 'Bob',
                                     'weight': '10.0',
                                     'flight': self.flight.id})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_add_tracking(self):
        token = self.get_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/baggage/baggage-tracking/', {
            'baggage': self.baggage.id, 'status': 'LOADED'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_unauthenticated_cannot_access_baggage(self):
        response = self.client.get('/api/baggage/baggage/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
