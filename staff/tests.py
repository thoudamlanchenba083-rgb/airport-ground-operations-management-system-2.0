from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Staff, Shift, Schedule

User = get_user_model()

class StaffAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='admin', password='admin123', email='admin@test.com', role='ADMIN')
        self.user = User.objects.create_user(username='staffuser', password='staff123')
        self.staff = Staff.objects.create(
            name='John Doe', employee_id='EMP001',
            staff_type='GROUND', phone='1234567890', email='john@test.com'
        )
        self.shift = Shift.objects.create(
            shift_name='Morning', start_time='06:00:00', end_time='14:00:00'
        )

    def get_token(self, username, password):
        response = self.client.post('/api/token/', {'username': username, 'password': password})
        return response.data['access']

    def test_admin_can_create_staff(self):
        token = self.get_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/staff/staff/', {
            'name': 'Jane Doe', 'employee_id': 'EMP002',
            'staff_type': 'SECURITY', 'phone': '9876543210', 'email': 'jane@test.com'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_non_admin_cannot_create_staff(self):
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/staff/staff/', {
            'name': 'Bob', 'employee_id': 'EMP003',
            'staff_type': 'GROUND', 'phone': '1111111111', 'email': 'bob@test.com'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_shift(self):
        token = self.get_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/staff/shifts/', {
            'shift_name': 'Evening', 'start_time': '14:00:00', 'end_time': '22:00:00'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_can_create_schedule(self):
        token = self.get_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/staff/schedules/', {
            'staff': self.staff.id, 'shift': self.shift.id, 'date': '2026-07-01'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_unauthenticated_cannot_access_staff(self):
        response = self.client.get('/api/staff/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)