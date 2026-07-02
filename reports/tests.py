from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Report

User = get_user_model()

class ReportAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='admin', password='admin123', email='admin@test.com', role='ADMIN')
        self.user = User.objects.create_user(username='staffuser', password='staff123')
        self.report = Report.objects.create(
            title='Flight Report July', report_type='FLIGHT',
            generated_by=self.admin, content='All flights on time.'
        )

    def get_token(self, username, password):
        response = self.client.post('/api/token/', {'username': username, 'password': password})
        return response.data['access']

    def test_admin_can_create_report(self):
        token = self.get_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/reports/reports/', {
            'title': 'Baggage Report', 'report_type': 'BAGGAGE', 'content': 'All baggage cleared.'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_can_list_reports(self):
        token = self.get_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/reports/reports/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_admin_cannot_create_report(self):
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/reports/reports/', {
            'title': 'Staff Report', 'report_type': 'STAFF', 'content': 'Staff summary.'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_admin_cannot_list_reports(self):
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/reports/reports/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_access_reports(self):
        response = self.client.get('/api/reports/reports/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)