from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import EquipmentType, GroundEquipment, EquipmentAssignment
from flights.models import Airline, Aircraft, Flight

User = get_user_model()


class GroundEquipmentAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='admin', password='admin123', email='admin@test.com')
        self.user = User.objects.create_user(username='staffuser', password='staff123')

        self.equipment_type = EquipmentType.objects.create(name='fuel_truck', description='Standard fuel truck')
        self.equipment = GroundEquipment.objects.create(
            equipment_type=self.equipment_type,
            equipment_id='FT-001',
            status='available',
            location='Terminal A'
        )

        self.airline = Airline.objects.create(name='Test Airline', code='TA')
        self.aircraft = Aircraft.objects.create(registration_number='TC-002', aircraft_type='Boeing 737', capacity=180)
        self.flight = Flight.objects.create(
            flight_number='TA002', origin='JFK', destination='LAX',
            departure_time='2026-07-01T10:00:00Z', arrival_time='2026-07-01T14:00:00Z',
            status='SCHEDULED', airline=self.airline, aircraft=self.aircraft
        )

    def get_token(self, username, password):
        response = self.client.post('/api/token/', {'username': username, 'password': password})
        return response.data['access']

    def test_unauthenticated_cannot_access_equipment(self):
        response = self.client.get('/api/ground-equipment/equipment/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_list_equipment(self):
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/ground-equipment/equipment/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_authenticated_user_can_create_equipment(self):
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/ground-equipment/equipment/', {
            'equipment_type': self.equipment_type.id,
            'equipment_id': 'FT-002',
            'status': 'available',
            'location': 'Terminal B'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_filter_equipment_by_status(self):
        GroundEquipment.objects.create(
            equipment_type=self.equipment_type, equipment_id='FT-003',
            status='maintenance', location='Terminal C'
        )
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/ground-equipment/equipment/?status=maintenance')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if 'results' in response.data else response.data
        for item in results:
            self.assertEqual(item['status'], 'maintenance')