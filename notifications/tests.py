from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Notification

User = get_user_model()

class NotificationAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='admin', password='admin123', email='admin@test.com')
        self.user = User.objects.create_user(username='staffuser', password='staff123')
        self.notification = Notification.objects.create(
            user=self.user, type='GENERAL', message='Test notification', is_read=False
        )

    def get_token(self, username, password):
        response = self.client.post('/api/token/', {'username': username, 'password': password})
        return response.data['access']

    def test_user_can_list_own_notifications(self):
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/notifications/notifications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_list_all_notifications(self):
        token = self.get_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/notifications/notifications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_user_sees_only_own_notifications(self):
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/notifications/notifications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for item in response.data['results']:
            self.assertEqual(item['user'], self.user.id)

    def test_user_cannot_create_notification(self):
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/notifications/notifications/', {
            'type': 'FLIGHT', 'message': 'Flight delayed'
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_notification(self):
        token = self.get_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/notifications/notifications/', {
            'type': 'FLIGHT', 'message': 'Flight delayed'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)