from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class AccountsAPITest(TestCase):
    def setUp(self):
        # enforce_csrf_checks=True so tests actually exercise CSRF
        # validation (Django's test client disables it by default).
        self.client = APIClient(enforce_csrf_checks=True)
        self.admin = User.objects.create_superuser(
            username='admin', password='admin123', email='admin@test.com'
        )
        self.user = User.objects.create_user(
            username='staffuser', password='staff123', email='staff@test.com'
        )

    def get_token(self, username, password):
        # Access token is now set as an httpOnly cookie, not in the response
        # body - read it from the test client's cookie jar instead.
        self.client.post(
            '/api/token/', {'username': username, 'password': password})
        return self.client.cookies['access_token'].value

    def test_register_new_user(self):
        response = self.client.post('/api/accounts/register/', {
            'username': 'newuser',
            'email': 'new@test.com',
            'password': 'newpass123',
            'role': 'GROUND_STAFF'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_login_sets_httponly_cookies(self):
        response = self.client.post('/api/token/', {
            'username': 'admin', 'password': 'admin123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Tokens must NOT be in the response body - only in cookies.
        self.assertNotIn('access', response.data)
        self.assertNotIn('refresh', response.data)
        self.assertIn('access_token', response.cookies)
        self.assertIn('refresh_token', response.cookies)
        self.assertTrue(response.cookies['access_token']['httponly'])
        self.assertTrue(response.cookies['refresh_token']['httponly'])

    def test_profile_requires_auth(self):
        response = self.client.get('/api/accounts/profile/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_view_profile(self):
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/accounts/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'staffuser')

    def test_cookie_auth_works_without_header(self):
        # Log in via the test client so the cookie jar carries the session,
        # then hit a protected endpoint with NO Authorization header at all.
        self.client.post(
            '/api/token/', {'username': 'staffuser', 'password': 'staff123'})
        response = self.client.get('/api/accounts/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'staffuser')

    def test_cookie_auth_blocks_unsafe_request_without_csrf_header(self):
        self.client.post(
            '/api/token/', {'username': 'staffuser', 'password': 'staff123'})
        response = self.client.post('/api/accounts/change-password/', {
            'old_password': 'staff123', 'new_password': 'newpass456',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cookie_auth_allows_unsafe_request_with_csrf_header(self):
        self.client.post(
            '/api/token/', {'username': 'staffuser', 'password': 'staff123'})
        csrf_token = self.client.cookies['csrftoken'].value
        response = self.client.post(
            '/api/accounts/change-password/',
            {'old_password': 'staff123', 'new_password': 'newpass456'},
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_header_auth_does_not_require_csrf_header(self):
        # Non-cookie (header-based) clients - Swagger, Postman, mobile apps -
        # should never be asked for a CSRF header.
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/accounts/change-password/', {
            'old_password': 'staff123', 'new_password': 'newpass456',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logout_clears_cookies(self):
        self.client.post(
            '/api/token/', {'username': 'staffuser', 'password': 'staff123'})
        csrf_token = self.client.cookies['csrftoken'].value
        response = self.client.post(
            '/api/accounts/logout/', HTTP_X_CSRFTOKEN=csrf_token)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Cookie should now be cleared (empty value / expired).
        response2 = self.client.get('/api/accounts/profile/')
        self.assertEqual(response2.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_can_list_users(self):
        token = self.get_token('admin', 'admin123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/accounts/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_admin_cannot_list_users(self):
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/accounts/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
