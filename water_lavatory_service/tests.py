from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import WaterLavatoryService
from flights.models import Airline, Aircraft, Flight

User = get_user_model()


class WaterLavatoryServiceAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='admin', password='admin123', email='admin@test.com')
        self.staff_user = User.objects.create_user(
            username='groundstaff', password='staff123', role='GROUND_STAFF')

        self.airline = Airline.objects.create(name='Test Airline', code='TA')
        self.aircraft = Aircraft.objects.create(
            registration_number='TC-900',
            aircraft_type='Airbus A320',
            capacity=180)
        self.flight = Flight.objects.create(
            flight_number='TA900',
            origin='JFK',
            destination='LAX',
            departure_time='2026-07-01T10:00:00Z',
            arrival_time='2026-07-01T14:00:00Z',
            status='SCHEDULED',
            airline=self.airline,
            aircraft=self.aircraft)

        self.service = WaterLavatoryService.objects.create(
            flight=self.flight,
            status='PENDING')

    def get_token(self, username, password):
        self.client.post(
            '/api/token/', {'username': username, 'password': password})
        return self.client.cookies['access_token'].value

    def test_unauthenticated_cannot_access_services(self):
        response = self.client.get(
            '/api/water-lavatory/water-lavatory-services/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_list_services(self):
        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(
            '/api/water-lavatory/water-lavatory-services/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_authenticated_user_can_create_service(self):
        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post(
            '/api/water-lavatory/water-lavatory-services/', {
                'flight': self.flight.id,
                'status': 'PENDING',
                'water_quantity_liters': '200.00'
            })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_read_allowed_but_write_forbidden_for_wrong_role(self):
        User.objects.create_user(
            username='hrperson', password='hr12345', role='HR')
        token = self.get_token('hrperson', 'hr12345')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        read_response = self.client.get(
            '/api/water-lavatory/water-lavatory-services/')
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)

        write_response = self.client.patch(
            f'/api/water-lavatory/water-lavatory-services/{self.service.id}/',
            {'notes': 'trying to edit'},
            content_type='application/json')
        self.assertEqual(write_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_negative_water_quantity_rejected(self):
        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post(
            '/api/water-lavatory/water-lavatory-services/', {
                'flight': self.flight.id,
                'status': 'PENDING',
                'water_quantity_liters': '-50.00'
            })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_zero_water_quantity_is_accepted(self):
        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post(
            '/api/water-lavatory/water-lavatory-services/', {
                'flight': self.flight.id,
                'status': 'PENDING',
                'water_quantity_liters': '0.00'
            })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_cannot_complete_service_until_all_tasks_done(self):
        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/water-lavatory/water-lavatory-services/{self.service.id}/',
            {'status': 'COMPLETED'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_can_complete_service_once_all_tasks_done(self):
        self.service.potable_water_refilled = True
        self.service.lavatory_serviced = True
        self.service.waste_disposed = True
        self.service.save()
        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/water-lavatory/water-lavatory-services/{self.service.id}/',
            {'status': 'COMPLETED'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.service.refresh_from_db()
        self.assertIsNotNone(self.service.completed_at)

    def test_in_progress_sets_started_at_timestamp(self):
        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/water-lavatory/water-lavatory-services/{self.service.id}/',
            {'status': 'IN_PROGRESS'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.service.refresh_from_db()
        self.assertIsNotNone(self.service.started_at)

    def test_service_completed_property_true_when_all_done(self):
        self.service.potable_water_refilled = True
        self.service.lavatory_serviced = True
        self.service.waste_disposed = True
        self.service.save()
        self.assertTrue(self.service.service_completed)

    def test_service_completed_property_false_when_one_missing(self):
        self.service.potable_water_refilled = True
        self.service.lavatory_serviced = True
        self.service.waste_disposed = False
        self.service.save()
        self.assertFalse(self.service.service_completed)

    def test_completed_at_cannot_be_before_started_at(self):
        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/water-lavatory/water-lavatory-services/{self.service.id}/',
            {
                'started_at': '2026-07-01T12:00:00Z',
                'completed_at': '2026-07-01T09:00:00Z'
            },
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_services_by_status(self):
        aircraft2 = Aircraft.objects.create(
            registration_number='TC-901',
            aircraft_type='Boeing 737',
            capacity=160)
        flight2 = Flight.objects.create(
            flight_number='TA901', origin='ORD', destination='MIA',
            departure_time='2026-07-02T09:00:00Z',
            arrival_time='2026-07-02T13:00:00Z',
            status='SCHEDULED', airline=self.airline,
            aircraft=aircraft2)
        WaterLavatoryService.objects.create(
            flight=flight2, status='IN_PROGRESS')
        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(
            '/api/water-lavatory/water-lavatory-services/?status=IN_PROGRESS')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if 'results' in response.data else response.data
        for item in results:
            self.assertEqual(item['status'], 'IN_PROGRESS')

    def test_filter_services_by_potable_water_refilled(self):
        aircraft3 = Aircraft.objects.create(
            registration_number='TC-902',
            aircraft_type='Boeing 787',
            capacity=250)
        flight3 = Flight.objects.create(
            flight_number='TA902', origin='SFO', destination='SEA',
            departure_time='2026-07-03T08:00:00Z',
            arrival_time='2026-07-03T10:00:00Z',
            status='SCHEDULED', airline=self.airline,
            aircraft=aircraft3)
        WaterLavatoryService.objects.create(
            flight=flight3, status='PENDING', potable_water_refilled=True)
        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(
            '/api/water-lavatory/water-lavatory-services/'
            '?potable_water_refilled=true')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if 'results' in response.data else response.data
        for item in results:
            self.assertTrue(item['potable_water_refilled'])

    def test_water_lavatory_service_str_representation(self):
        rep = str(self.service)
        self.assertIn('TA900', rep)
        self.assertIn('PENDING', rep)
