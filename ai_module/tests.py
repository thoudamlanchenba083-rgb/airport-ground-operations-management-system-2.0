from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status

from flights.models import Airline, Aircraft, Flight
from .models import AIChatMessage

User = get_user_model()


class AIModuleBaseTest(TestCase):
    """Shared setUp for all ai_module API tests."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='ai_admin', password='admin123', email='ai_admin@test.com'
        )
        self.user = User.objects.create_user(
            username='ai_user', password='user123'
        )
        self.airline = Airline.objects.create(name='Test Airline', code='TA')
        self.aircraft = Aircraft.objects.create(
            registration_number='TC-100',
            aircraft_type='Boeing 737',
            capacity=180)
        self.flight = Flight.objects.create(
            flight_number='TA100',
            airline=self.airline,
            aircraft=self.aircraft,
            origin='JFK',
            destination='LAX',
            departure_time='2026-07-01T10:00:00Z',
            arrival_time='2026-07-01T14:00:00Z',
            status='SCHEDULED',
        )

    def get_token(self, username, password):
        self.client.post(
            '/api/token/', {'username': username, 'password': password}
        )
        return self.client.cookies['access_token'].value

    def auth_as(self, username, password):
        token = self.get_token(username, password)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


class DelayPredictionAPITest(AIModuleBaseTest):
    def test_authenticated_user_can_request_delay_prediction(self):
        self.auth_as('ai_user', 'user123')
        response = self.client.post('/api/ai/predictions/', {
            'prediction_type': 'DELAY',
            'flight': self.flight.id,
            'input_data': {},
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'COMPLETED')
        self.assertIn('estimated_delay_minutes', response.data['result'])

    def test_unauthenticated_cannot_request_delay_prediction(self):
        response = self.client.post('/api/ai/predictions/', {
            'prediction_type': 'DELAY',
            'flight': self.flight.id,
            'input_data': {},
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MaintenancePredictionAPITest(AIModuleBaseTest):
    def test_maintenance_prediction_returns_completed_result(self):
        self.auth_as('ai_user', 'user123')
        response = self.client.post('/api/ai/predictions/', {
            'prediction_type': 'MAINTENANCE',
            'flight': self.flight.id,
            'input_data': {},
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'COMPLETED')
        self.assertIn('maintenance_required', response.data['result'])


class WeatherPredictionAPITest(AIModuleBaseTest):
    def test_weather_prediction_returns_completed_result(self):
        self.auth_as('ai_user', 'user123')
        response = self.client.post('/api/ai/predictions/', {
            'prediction_type': 'WEATHER_RISK',
            'flight': self.flight.id,
            'input_data': {},
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'COMPLETED')
        self.assertIn('weather_risk_score', response.data['result'])


class PassengerRushPredictionAPITest(AIModuleBaseTest):
    def test_passenger_rush_prediction_returns_completed_result(self):
        self.auth_as('ai_user', 'user123')
        response = self.client.post('/api/ai/predictions/', {
            'prediction_type': 'PASSENGER_RUSH',
            'flight': self.flight.id,
            'input_data': {},
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'COMPLETED')
        self.assertIn('expected_passengers', response.data['result'])


class StaffPredictionAPITest(AIModuleBaseTest):
    def test_staff_prediction_returns_completed_result(self):
        self.auth_as('ai_user', 'user123')
        response = self.client.post('/api/ai/predictions/', {
            'prediction_type': 'STAFF',
            'flight': self.flight.id,
            'input_data': {},
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'COMPLETED')
        self.assertIn('ground_crew_required', response.data['result'])


class AIPredictionInvalidRequestTest(AIModuleBaseTest):
    def test_invalid_prediction_type_marks_failed(self):
        self.auth_as('ai_user', 'user123')
        response = self.client.post('/api/ai/predictions/', {
            'prediction_type': 'NOT_A_REAL_TYPE',
            'flight': self.flight.id,
            'input_data': {},
        }, format='json')
        # Serializer rejects unknown choice before it ever reaches the handler
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_prediction_type_returns_400(self):
        self.auth_as('ai_user', 'user123')
        response = self.client.post('/api/ai/predictions/', {
            'flight': self.flight.id,
            'input_data': {},
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_prediction_with_nonexistent_flight_returns_400(self):
        self.auth_as('ai_user', 'user123')
        response = self.client.post('/api/ai/predictions/', {
            'prediction_type': 'DELAY',
            'flight': 99999,
            'input_data': {},
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AIPredictionSummaryDashboardTest(AIModuleBaseTest):
    def test_summary_endpoint_returns_counts(self):
        self.auth_as('ai_user', 'user123')
        self.client.post('/api/ai/predictions/',
                         {'prediction_type': 'DELAY',
                          'flight': self.flight.id,
                          'input_data': {},
                          },
                         format='json')
        response = self.client.get('/api/ai/predictions/summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_predictions', response.data)
        self.assertIn('by_type', response.data)

    def test_dashboard_endpoint_returns_intelligence_payload(self):
        self.auth_as('ai_user', 'user123')
        response = self.client.get('/api/ai/predictions/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_dashboard_endpoint_is_cached(self):
        from unittest.mock import patch
        self.auth_as('ai_user', 'user123')
        with patch('ai_module.views.get_dashboard_intelligence',
                   return_value={'stub': True}) as mocked:
            first = self.client.get('/api/ai/predictions/dashboard/')
            second = self.client.get('/api/ai/predictions/dashboard/')
            self.assertEqual(first.data, {'stub': True})
            self.assertEqual(second.data, {'stub': True})
            # Second call should be served from cache, not recompute ML
            mocked.assert_called_once()

    def test_unauthenticated_cannot_access_summary(self):
        response = self.client.get('/api/ai/predictions/summary/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ChatbotAPITest(AIModuleBaseTest):
    def test_send_greeting_message_creates_user_and_bot_messages(self):
        self.auth_as('ai_user', 'user123')
        response = self.client.post('/api/ai/chat/send/', {
            'content': 'hello',
            'session_id': 'sess-1',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['role'], 'assistant')
        self.assertEqual(
            AIChatMessage.objects.filter(
                user=self.user,
                session_id='sess-1').count(),
            2)

    def test_send_flight_status_query_returns_flight_info(self):
        self.auth_as('ai_user', 'user123')
        response = self.client.post('/api/ai/chat/send/', {
            'content': f'what is the status of {self.flight.flight_number}',
            'session_id': 'sess-2',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn(self.flight.flight_number, response.data['content'])

    def test_send_empty_message_returns_400(self):
        self.auth_as('ai_user', 'user123')
        response = self.client.post('/api/ai/chat/send/', {
            'content': '   ',
            'session_id': 'sess-3',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_messages_filters_by_session(self):
        self.auth_as('ai_user', 'user123')
        self.client.post('/api/ai/chat/send/',
                         {'content': 'hi', 'session_id': 'a'})
        self.client.post('/api/ai/chat/send/',
                         {'content': 'hi again', 'session_id': 'b'})
        response = self.client.get('/api/ai/chat/', {'session_id': 'a'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(all(m['session_id'] == 'a' for m in response.data))

    def test_clear_deletes_session_messages(self):
        self.auth_as('ai_user', 'user123')
        self.client.post('/api/ai/chat/send/',
                         {'content': 'hi', 'session_id': 'clear-me'})
        response = self.client.delete(
            '/api/ai/chat/clear/', {'session_id': 'clear-me'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            AIChatMessage.objects.filter(session_id='clear-me').count(), 0
        )

    def test_unauthenticated_cannot_use_chat(self):
        response = self.client.post('/api/ai/chat/send/', {'content': 'hello'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AIPredictionPermissionTest(AIModuleBaseTest):
    def test_regular_user_can_create_prediction(self):
        # AIPredictionViewSet only requires IsAuthenticated, not admin
        self.auth_as('ai_user', 'user123')
        response = self.client.post('/api/ai/predictions/', {
            'prediction_type': 'DELAY',
            'flight': self.flight.id,
            'input_data': {},
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_can_list_all_predictions(self):
        self.auth_as('ai_admin', 'admin123')
        response = self.client.get('/api/ai/predictions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_invalid_token_rejected(self):
        self.client.credentials(
            HTTP_AUTHORIZATION='Bearer invalid.token.value')
        response = self.client.get('/api/ai/predictions/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


@override_settings(RATELIMIT_ENABLE=True, ANTHROPIC_API_KEY='', GEMINI_API_KEY='')
class AIEndpointRateLimitTest(AIModuleBaseTest):
    """
    Chat 'send' and prediction 'create' hit paid/compute-heavy backends, so
    both are rate-limited per user. RATELIMIT_ENABLE is forced True here
    since it's disabled globally during test runs (see backend/settings.py
    TESTING flag).

    ANTHROPIC_API_KEY/GEMINI_API_KEY are forced empty here so 'send' falls
    straight through to the offline ChatbotEngine instead of making real,
    slow network calls to api.anthropic.com/generativelanguage.googleapis.com.
    Those calls (~1-1.3s each with an invalid key) stretch this 17-request
    loop to 20+ real seconds - long enough to occasionally straddle
    django_ratelimit's 60s fixed window, silently resetting the counter
    mid-test and making the block=True check flaky/never trip. Keeping each
    request in the low-milliseconds keeps the whole loop far inside a single
    window.
    """

    def test_chat_send_is_rate_limited_after_15_per_minute(self):
        self.auth_as('ai_user', 'user123')
        responses = []
        for i in range(17):
            response = self.client.post(
                '/api/ai/chat/send/', {'content': f'hello {i}'})
            responses.append(response.status_code)
        self.assertIn(status.HTTP_403_FORBIDDEN, responses)
        self.assertEqual(
            responses[:15].count(status.HTTP_201_CREATED), 15)

    def test_prediction_create_is_rate_limited_after_30_per_minute(self):
        self.auth_as('ai_user', 'user123')
        responses = []
        for _ in range(32):
            response = self.client.post('/api/ai/predictions/', {
                'prediction_type': 'DELAY',
                'flight': self.flight.id,
                'input_data': {},
            }, format='json')
            responses.append(response.status_code)
        self.assertIn(status.HTTP_403_FORBIDDEN, responses)
        self.assertEqual(
            responses[:30].count(status.HTTP_201_CREATED), 30)

    def test_rate_limit_is_scoped_per_user(self):
        # ai_admin's requests should not be affected by ai_user's usage
        self.auth_as('ai_user', 'user123')
        for i in range(15):
            self.client.post('/api/ai/chat/send/', {'content': f'hi {i}'})
        blocked = self.client.post(
            '/api/ai/chat/send/', {'content': 'one too many'})
        self.assertEqual(blocked.status_code, status.HTTP_403_FORBIDDEN)

        self.auth_as('ai_admin', 'admin123')
        response = self.client.post(
            '/api/ai/chat/send/', {'content': 'admin is fine'})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
