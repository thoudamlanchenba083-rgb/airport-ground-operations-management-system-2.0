from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import CleaningTask
from flights.models import Airline, Aircraft, Flight

User = get_user_model()


class AircraftCleaningAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='admin', password='admin123', email='admin@test.com')
        self.staff_user = User.objects.create_user(
            username='cleanstaff', password='staff123', role='CLEANING_SUPERVISOR')

        self.airline = Airline.objects.create(name='Test Airline', code='TA')
        self.aircraft = Aircraft.objects.create(
            registration_number='TC-300',
            aircraft_type='Airbus A320',
            capacity=180)
        self.flight = Flight.objects.create(
            flight_number='TA300',
            origin='JFK',
            destination='LAX',
            departure_time='2026-07-01T10:00:00Z',
            arrival_time='2026-07-01T14:00:00Z',
            status='SCHEDULED',
            airline=self.airline,
            aircraft=self.aircraft)

        self.task = CleaningTask.objects.create(
            flight=self.flight,
            cleaning_company='SparkleClean Ltd',
            status='PENDING')

    def get_token(self, username, password):
        self.client.post(
            '/api/token/', {'username': username, 'password': password})
        return self.client.cookies['access_token'].value

    def test_unauthenticated_cannot_access_tasks(self):
        response = self.client.get('/api/cleaning/cleaning-tasks/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_list_tasks(self):
        token = self.get_token('cleanstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/cleaning/cleaning-tasks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_authenticated_user_can_create_task(self):
        aircraft2 = Aircraft.objects.create(
            registration_number='TC-301',
            aircraft_type='Boeing 737',
            capacity=160)
        flight2 = Flight.objects.create(
            flight_number='TA301',
            origin='ORD',
            destination='MIA',
            departure_time='2026-07-02T09:00:00Z',
            arrival_time='2026-07-02T13:00:00Z',
            status='SCHEDULED',
            airline=self.airline,
            aircraft=aircraft2)
        token = self.get_token('cleanstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/cleaning/cleaning-tasks/', {
            'flight': flight2.id,
            'cleaning_company': 'FastWash Co',
            'status': 'PENDING'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_read_allowed_but_write_forbidden_for_wrong_role(self):
        User.objects.create_user(
            username='hrperson', password='hr12345', role='HR')
        token = self.get_token('hrperson', 'hr12345')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        read_response = self.client.get('/api/cleaning/cleaning-tasks/')
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)

        write_response = self.client.patch(
            f'/api/cleaning/cleaning-tasks/{self.task.id}/',
            {'cleaning_company': 'NewCo'},
            content_type='application/json')
        self.assertEqual(write_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_complete_task_until_subtasks_done(self):
        token = self.get_token('cleanstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/cleaning/cleaning-tasks/{self.task.id}/',
            {'status': 'COMPLETED'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_can_complete_task_once_all_subtasks_done(self):
        self.task.interior_cleaned = True
        self.task.exterior_wash = True
        self.task.waste_removed = True
        self.task.save()
        token = self.get_token('cleanstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/cleaning/cleaning-tasks/{self.task.id}/',
            {'status': 'COMPLETED'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertIsNotNone(self.task.completed_at)

    def test_in_progress_sets_started_at_timestamp(self):
        token = self.get_token('cleanstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/cleaning/cleaning-tasks/{self.task.id}/',
            {'status': 'IN_PROGRESS'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertIsNotNone(self.task.started_at)

    def test_cabin_ready_auto_flag_on_model_save(self):
        self.task.interior_cleaned = True
        self.task.exterior_wash = True
        self.task.waste_removed = True
        self.task.save()
        self.task.refresh_from_db()
        self.assertTrue(self.task.cabin_ready)

    def test_cabin_ready_stays_false_if_one_subtask_incomplete(self):
        self.task.interior_cleaned = True
        self.task.exterior_wash = True
        self.task.waste_removed = False
        self.task.save()
        self.task.refresh_from_db()
        self.assertFalse(self.task.cabin_ready)

    def test_filter_tasks_by_status(self):
        aircraft3 = Aircraft.objects.create(
            registration_number='TC-302',
            aircraft_type='Boeing 787',
            capacity=250)
        flight3 = Flight.objects.create(
            flight_number='TA302', origin='SFO', destination='SEA',
            departure_time='2026-07-03T08:00:00Z',
            arrival_time='2026-07-03T10:00:00Z',
            status='SCHEDULED', airline=self.airline,
            aircraft=aircraft3)
        CleaningTask.objects.create(
            flight=flight3, cleaning_company='FastWash Co', status='IN_PROGRESS')
        token = self.get_token('cleanstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(
            '/api/cleaning/cleaning-tasks/?status=IN_PROGRESS')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if 'results' in response.data else response.data
        for item in results:
            self.assertEqual(item['status'], 'IN_PROGRESS')

    def test_completed_cannot_be_before_started(self):
        token = self.get_token('cleanstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/cleaning/cleaning-tasks/{self.task.id}/',
            {
                'started_at': '2026-07-01T12:00:00Z',
                'completed_at': '2026-07-01T09:00:00Z'
            },
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cleaning_task_str_representation(self):
        self.assertIn('TA300', str(self.task))
        self.assertIn('PENDING', str(self.task))
