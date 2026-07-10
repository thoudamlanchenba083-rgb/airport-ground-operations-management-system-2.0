from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Airline, Aircraft

User = get_user_model()


class FlightAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='admin', password='admin123', email='admin@test.com')
        self.user = User.objects.create_user(
            username='user', password='user123')
        self.airline = Airline.objects.create(name='Test Airline', code='TA')
        self.aircraft = Aircraft.objects.create(
            registration_number='TC-001',
            aircraft_type='Boeing 737',
            capacity=180)

    def get_token(self, username, password):
        response = self.client.post(
            '/api/token/', {'username': username, 'password': password})
        return self.client.cookies['access_token'].value

    def test_admin_can_create_airline(self):
        token = self.get_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post(
            '/api/flights/airlines/', {'name': 'New Airline', 'code': 'NA'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_user_cannot_create_airline(self):
        token = self.get_token('user', 'user123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post(
            '/api/flights/airlines/', {'name': 'New Airline', 'code': 'NA'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_can_list_airlines(self):
        token = self.get_token('user', 'user123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/flights/airlines/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_access(self):
        response = self.client.get('/api/flights/airlines/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_can_create_flight(self):
        token = self.get_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        data = {
            'flight_number': 'TA001',
            'origin': 'JFK',
            'destination': 'LAX',
            'departure_time': '2026-07-01T10:00:00Z',
            'arrival_time': '2026-07-01T14:00:00Z',
            'status': 'SCHEDULED',
            'airline': self.airline.id,
            'aircraft': self.aircraft.id
        }
        response = self.client.post('/api/flights/flights/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_can_delete_airline(self):
        token = self.get_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.delete(
            f'/api/flights/airlines/{self.airline.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
