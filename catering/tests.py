from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import CateringCompany, CateringOrder
from flights.models import Airline, Aircraft, Flight

User = get_user_model()


class CateringOrderAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='admin', password='admin123', email='admin@test.com')
        self.staff_user = User.objects.create_user(
            username='cateringstaff', password='staff123', role='CATERING_SUPERVISOR')

        self.airline = Airline.objects.create(name='Test Airline', code='TA')
        self.aircraft = Aircraft.objects.create(
            registration_number='TC-800',
            aircraft_type='Airbus A320',
            capacity=180)
        self.flight = Flight.objects.create(
            flight_number='TA800',
            origin='JFK',
            destination='LAX',
            departure_time='2026-07-01T10:00:00Z',
            arrival_time='2026-07-01T14:00:00Z',
            status='SCHEDULED',
            airline=self.airline,
            aircraft=self.aircraft)

        self.company = CateringCompany.objects.create(
            name='SkyBite Catering', contact_phone='5551237890',
            contact_email='ops@skybite.com')

        self.order = CateringOrder.objects.create(
            flight=self.flight,
            catering_company=self.company,
            meal_type='STANDARD',
            meal_count=150,
            status='PENDING')

    def get_token(self, username, password):
        self.client.post(
            '/api/token/', {'username': username, 'password': password})
        return self.client.cookies['access_token'].value

    def test_unauthenticated_cannot_access_orders(self):
        response = self.client.get('/api/catering/catering-orders/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_list_orders(self):
        token = self.get_token('cateringstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/catering/catering-orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_authenticated_user_can_create_order(self):
        token = self.get_token('cateringstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/catering/catering-orders/', {
            'flight': self.flight.id,
            'catering_company': self.company.id,
            'meal_type': 'VEGETARIAN',
            'meal_count': 40,
            'status': 'PENDING'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_read_allowed_but_write_forbidden_for_wrong_role(self):
        User.objects.create_user(
            username='hrperson', password='hr12345', role='HR')
        token = self.get_token('hrperson', 'hr12345')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        read_response = self.client.get('/api/catering/catering-orders/')
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)

        write_response = self.client.patch(
            f'/api/catering/catering-orders/{self.order.id}/',
            {'notes': 'trying to edit'},
            content_type='application/json')
        self.assertEqual(write_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_negative_meal_count_rejected(self):
        token = self.get_token('cateringstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/catering/catering-orders/', {
            'flight': self.flight.id,
            'catering_company': self.company.id,
            'meal_type': 'STANDARD',
            'meal_count': -5,
            'status': 'PENDING'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_loading_completed_true_requires_loaded_status(self):
        token = self.get_token('cateringstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/catering/catering-orders/{self.order.id}/',
            {'loading_completed': True, 'status': 'PREPARING'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_loading_completed_true_with_loaded_status_succeeds(self):
        token = self.get_token('cateringstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/catering/catering-orders/{self.order.id}/',
            {'loading_completed': True, 'status': 'LOADED'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_marking_loaded_sets_loaded_at_and_loading_completed(self):
        token = self.get_token('cateringstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/catering/catering-orders/{self.order.id}/',
            {'status': 'LOADED'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertTrue(self.order.loading_completed)
        self.assertIsNotNone(self.order.loaded_at)

    def test_cannot_mark_loaded_with_zero_meal_count(self):
        self.order.meal_count = 0
        self.order.save()
        token = self.get_token('cateringstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/catering/catering-orders/{self.order.id}/',
            {'status': 'LOADED'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_cancel_order_already_loaded(self):
        self.order.status = 'LOADED'
        self.order.loaded_at = '2026-07-01T09:00:00Z'
        self.order.save()
        token = self.get_token('cateringstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/catering/catering-orders/{self.order.id}/',
            {'status': 'CANCELLED'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_can_cancel_order_before_loading(self):
        token = self.get_token('cateringstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/catering/catering-orders/{self.order.id}/',
            {'status': 'CANCELLED'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_filter_orders_by_meal_type(self):
        CateringOrder.objects.create(
            flight=self.flight, catering_company=self.company,
            meal_type='VEGAN', meal_count=20, status='PENDING')
        token = self.get_token('cateringstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(
            '/api/catering/catering-orders/?meal_type=VEGAN')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if 'results' in response.data else response.data
        for item in results:
            self.assertEqual(item['meal_type'], 'VEGAN')

    def test_authenticated_user_can_list_catering_companies(self):
        token = self.get_token('cateringstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/catering/catering-companies/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_catering_company(self):
        token = self.get_token('cateringstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/catering/catering-companies/', {
            'name': 'CloudNine Catering',
            'contact_phone': '5559871234',
            'contact_email': 'ops@cloudnine.com'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_duplicate_catering_company_name_rejected(self):
        token = self.get_token('cateringstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/catering/catering-companies/', {
            'name': 'SkyBite Catering',
            'contact_phone': '5551110000',
            'contact_email': 'dup@skybite.com'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_catering_company_str_representation(self):
        self.assertEqual(str(self.company), 'SkyBite Catering')

    def test_catering_order_str_representation(self):
        rep = str(self.order)
        self.assertIn('TA800', rep)
        self.assertIn('150', rep)
        self.assertIn('PENDING', rep)
