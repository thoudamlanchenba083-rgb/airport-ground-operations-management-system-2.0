from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import FuelCompany, FuelTruck, FuelOperation
from flights.models import Airline, Aircraft, Flight
from staff.models import Staff

User = get_user_model()


class FuelOperationAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='admin', password='admin123', email='admin@test.com')
        self.staff_user = User.objects.create_user(
            username='fuelstaff', password='staff123', role='FUEL_SUPERVISOR')

        self.airline = Airline.objects.create(name='Test Airline', code='TA')
        self.aircraft = Aircraft.objects.create(
            registration_number='TC-600',
            aircraft_type='Airbus A320',
            capacity=180)
        self.flight = Flight.objects.create(
            flight_number='TA600',
            origin='JFK',
            destination='LAX',
            departure_time='2026-07-01T10:00:00Z',
            arrival_time='2026-07-01T14:00:00Z',
            status='SCHEDULED',
            airline=self.airline,
            aircraft=self.aircraft)

        self.fuel_company = FuelCompany.objects.create(
            name='SkyFuel Inc', contact_phone='5551234567',
            contact_email='ops@skyfuel.com')
        self.fuel_truck = FuelTruck.objects.create(
            truck_code='FT-01', fuel_company=self.fuel_company,
            capacity_liters=Decimal('5000.00'), status='AVAILABLE')
        self.fuel_operator = Staff.objects.create(
            name='Fuel Operator', employee_id='EMP-600',
            staff_type='GROUND', phone='1234567600',
            email='fueloperator@test.com')

        self.operation = FuelOperation.objects.create(
            flight=self.flight,
            fuel_truck=self.fuel_truck,
            fuel_company=self.fuel_company,
            fuel_operator=self.fuel_operator,
            quantity_liters=Decimal('3000.00'),
            status='PENDING')

    def get_token(self, username, password):
        self.client.post(
            '/api/token/', {'username': username, 'password': password})
        return self.client.cookies['access_token'].value

    def test_unauthenticated_cannot_access_operations(self):
        response = self.client.get('/api/fuel/fuel-operations/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_list_operations(self):
        token = self.get_token('fuelstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/fuel/fuel-operations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_authenticated_user_can_create_operation(self):
        token = self.get_token('fuelstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/fuel/fuel-operations/', {
            'flight': self.flight.id,
            'fuel_truck': self.fuel_truck.id,
            'fuel_company': self.fuel_company.id,
            'quantity_liters': '1500.00',
            'status': 'PENDING'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_read_allowed_but_write_forbidden_for_wrong_role(self):
        User.objects.create_user(
            username='hrperson', password='hr12345', role='HR')
        token = self.get_token('hrperson', 'hr12345')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        read_response = self.client.get('/api/fuel/fuel-operations/')
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)

        write_response = self.client.patch(
            f'/api/fuel/fuel-operations/{self.operation.id}/',
            {'notes': 'trying to edit'},
            content_type='application/json')
        self.assertEqual(write_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_authenticated_user_can_list_fuel_companies(self):
        token = self.get_token('fuelstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/fuel/fuel-companies/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_fuel_company(self):
        token = self.get_token('fuelstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/fuel/fuel-companies/', {
            'name': 'JetFuel Co',
            'contact_phone': '5559876543',
            'contact_email': 'ops@jetfuel.com'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_duplicate_fuel_company_name_rejected(self):
        token = self.get_token('fuelstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/fuel/fuel-companies/', {
            'name': 'SkyFuel Inc',
            'contact_phone': '5551112222',
            'contact_email': 'dup@skyfuel.com'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_authenticated_user_can_list_fuel_trucks(self):
        token = self.get_token('fuelstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/fuel/fuel-trucks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_fuel_truck(self):
        token = self.get_token('fuelstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/fuel/fuel-trucks/', {
            'truck_code': 'FT-02',
            'fuel_company': self.fuel_company.id,
            'capacity_liters': '6000.00',
            'status': 'AVAILABLE'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_filter_trucks_by_status(self):
        FuelTruck.objects.create(
            truck_code='FT-03', fuel_company=self.fuel_company,
            capacity_liters=Decimal('4000.00'), status='MAINTENANCE')
        token = self.get_token('fuelstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/fuel/fuel-trucks/?status=MAINTENANCE')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if 'results' in response.data else response.data
        for item in results:
            self.assertEqual(item['status'], 'MAINTENANCE')

    def test_fuel_company_str_representation(self):
        self.assertEqual(str(self.fuel_company), 'SkyFuel Inc')

    def test_fuel_truck_str_representation(self):
        self.assertEqual(str(self.fuel_truck), 'FT-01')

    def test_fuel_operation_str_representation(self):
        self.assertIn('TA600', str(self.operation))
        self.assertIn('PENDING', str(self.operation))
