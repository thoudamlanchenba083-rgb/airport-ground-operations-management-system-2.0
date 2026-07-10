from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import MaintenanceRequest
from flights.models import Aircraft

User = get_user_model()


class MaintenanceAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='admin',
            password='admin123',
            email='admin@test.com',
            role='ADMIN')
        self.user = User.objects.create_user(
            username='staffuser',
            password='staff123',
            role='MAINTENANCE_ENGINEER')
        self.aircraft = Aircraft.objects.create(
            registration_number='TC-001',
            aircraft_type='Boeing 737',
            capacity=180)
        self.mrequest = MaintenanceRequest.objects.create(
            aircraft=self.aircraft, issue_description='Engine check', priority='HIGH')

    def get_token(self, username, password):
        self.client.post(
            '/api/token/', {'username': username, 'password': password})
        return self.client.cookies['access_token'].value

    def test_admin_can_create_maintenance_request(self):
        token = self.get_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/maintenance/maintenance/', {
            'aircraft': self.aircraft.id,
            'issue_description': 'Fuel leak',
            'priority': 'HIGH'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_user_can_list_maintenance_requests(self):
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/maintenance/maintenance/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_maintenance_engineer_can_create_but_not_approve(self):
        """Maintenance staff can report issues; only supervisors/admin can approve them."""
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/maintenance/maintenance/', {
            'aircraft': self.aircraft.id,
            'issue_description': 'Tire check',
            'priority': 'LOW'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'PENDING_APPROVAL')

        approve_response = self.client.post(
            f'/api/maintenance/maintenance/{response.data["id"]}/approve/')
        self.assertEqual(
            approve_response.status_code,
            status.HTTP_403_FORBIDDEN)

    def test_admin_can_add_maintenance_log(self):
        token = self.get_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/maintenance/maintenance-logs/', {
            'request': self.mrequest.id,
            'action_taken': 'Engine inspected and cleared'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_unauthenticated_cannot_access(self):
        response = self.client.get('/api/maintenance/maintenance/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
