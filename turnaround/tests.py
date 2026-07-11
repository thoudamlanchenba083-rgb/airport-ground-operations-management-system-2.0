from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import TurnaroundTask
from flights.models import Airline, Aircraft, Flight
from staff.models import Staff
from ground_equipment.models import EquipmentType, GroundEquipment

User = get_user_model()


class TurnaroundTaskAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='admin', password='admin123', email='admin@test.com')
        self.staff_user = User.objects.create_user(
            username='groundstaff', password='staff123', role='GROUND_STAFF')

        self.airline = Airline.objects.create(name='Test Airline', code='TA')
        self.aircraft = Aircraft.objects.create(
            registration_number='TC-500',
            aircraft_type='Airbus A320',
            capacity=180)
        self.flight = Flight.objects.create(
            flight_number='TA500',
            origin='JFK',
            destination='LAX',
            departure_time='2026-07-01T10:00:00Z',
            arrival_time='2026-07-01T14:00:00Z',
            status='SCHEDULED',
            airline=self.airline,
            aircraft=self.aircraft)

        self.assigned_staff = Staff.objects.create(
            name='Task Staff', employee_id='EMP-500',
            staff_type='GROUND', phone='1234567800',
            email='taskstaff@test.com')

        self.equipment_type = EquipmentType.objects.create(
            name='tow_tractor', description='Tow tractor')
        self.equipment = GroundEquipment.objects.create(
            equipment_type=self.equipment_type,
            equipment_id='TT-001',
            status='available',
            location='Apron 1')

        self.task = TurnaroundTask.objects.create(
            flight=self.flight,
            task_type='CHOCKS_ON',
            status='PENDING',
            assigned_staff=self.assigned_staff)

    def get_token(self, username, password):
        self.client.post(
            '/api/token/', {'username': username, 'password': password})
        return self.client.cookies['access_token'].value

    def test_unauthenticated_cannot_access_tasks(self):
        response = self.client.get('/api/turnaround/turnaround-tasks/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_list_tasks(self):
        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/turnaround/turnaround-tasks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_authenticated_user_can_create_task(self):
        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/turnaround/turnaround-tasks/', {
            'flight': self.flight.id,
            'task_type': 'DEBOARDING',
            'status': 'PENDING'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_read_allowed_but_write_forbidden_for_wrong_role(self):
        User.objects.create_user(
            username='hrperson', password='hr12345', role='HR')
        token = self.get_token('hrperson', 'hr12345')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        read_response = self.client.get('/api/turnaround/turnaround-tasks/')
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)

        write_response = self.client.patch(
            f'/api/turnaround/turnaround-tasks/{self.task.id}/',
            {'notes': 'trying to edit'},
            content_type='application/json')
        self.assertEqual(write_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_task_type_for_same_flight_rejected_with_400(self):
        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/turnaround/turnaround-tasks/', {
            'flight': self.flight.id,
            'task_type': 'CHOCKS_ON',
            'status': 'PENDING'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_same_task_type_allowed_on_different_flight(self):
        aircraft2 = Aircraft.objects.create(
            registration_number='TC-501',
            aircraft_type='Boeing 737',
            capacity=160)
        flight2 = Flight.objects.create(
            flight_number='TA501', origin='ORD', destination='MIA',
            departure_time='2026-07-02T09:00:00Z',
            arrival_time='2026-07-02T13:00:00Z',
            status='SCHEDULED', airline=self.airline,
            aircraft=aircraft2)
        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/turnaround/turnaround-tasks/', {
            'flight': flight2.id,
            'task_type': 'CHOCKS_ON',
            'status': 'PENDING'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_updating_same_task_does_not_trigger_duplicate_error(self):
        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/turnaround/turnaround-tasks/{self.task.id}/',
            {'task_type': 'CHOCKS_ON', 'notes': 'still fine'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_in_progress_sets_actual_start_time(self):
        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/turnaround/turnaround-tasks/{self.task.id}/',
            {'status': 'IN_PROGRESS'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertIsNotNone(self.task.actual_start_time)

    def test_completing_task_sets_end_time_and_completed_by(self):
        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/turnaround/turnaround-tasks/{self.task.id}/',
            {'status': 'COMPLETED'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertIsNotNone(self.task.actual_end_time)
        self.assertEqual(self.task.completed_by, self.staff_user)

    def test_end_time_cannot_be_before_start_time(self):
        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/turnaround/turnaround-tasks/{self.task.id}/',
            {
                'actual_start_time': '2026-07-01T12:00:00Z',
                'actual_end_time': '2026-07-01T09:00:00Z'
            },
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duration_minutes_calculation(self):
        self.task.actual_start_time = '2026-07-01T10:00:00Z'
        self.task.actual_end_time = '2026-07-01T10:30:00Z'
        self.task.save()
        self.task.refresh_from_db()
        self.assertEqual(self.task.duration_minutes, 30.0)

    def test_turnaround_task_str_representation(self):
        self.assertIn('TA500', str(self.task))
        self.assertIn('PENDING', str(self.task))

    def test_summary_action_returns_progress_percent(self):
        aircraft2 = Aircraft.objects.create(
            registration_number='TC-502',
            aircraft_type='Boeing 787',
            capacity=250)
        flight2 = Flight.objects.create(
            flight_number='TA502', origin='SFO', destination='SEA',
            departure_time='2026-07-03T08:00:00Z',
            arrival_time='2026-07-03T10:00:00Z',
            status='SCHEDULED', airline=self.airline,
            aircraft=aircraft2)
        TurnaroundTask.objects.create(
            flight=flight2, task_type='CHOCKS_ON', status='COMPLETED')
        TurnaroundTask.objects.create(
            flight=flight2, task_type='DEBOARDING', status='PENDING')

        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(
            f'/api/turnaround/turnaround-tasks/summary/?flight={flight2.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_tasks'], 2)
        self.assertEqual(response.data['completed'], 1)
        self.assertEqual(response.data['progress_percent'], 50.0)

    def test_summary_action_handles_zero_tasks(self):
        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(
            '/api/turnaround/turnaround-tasks/summary/?flight=999999')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_tasks'], 0)
        self.assertEqual(response.data['progress_percent'], 0)

    def test_delay_causes_action_returns_breakdown(self):
        aircraft3 = Aircraft.objects.create(
            registration_number='TC-503',
            aircraft_type='Boeing 737',
            capacity=160)
        flight3 = Flight.objects.create(
            flight_number='TA503', origin='DEN', destination='ATL',
            departure_time='2026-07-04T08:00:00Z',
            arrival_time='2026-07-04T11:00:00Z',
            status='SCHEDULED', airline=self.airline,
            aircraft=aircraft3)
        TurnaroundTask.objects.create(
            flight=flight3, task_type='FUELING', status='DELAYED',
            delay_reason='FUEL')
        TurnaroundTask.objects.create(
            flight=flight3, task_type='CATERING', status='DELAYED',
            delay_reason='CATERING')

        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(
            '/api/turnaround/turnaround-tasks/delay-causes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_delayed_tasks'], 2)
        reasons = [row['reason'] for row in response.data['breakdown']]
        self.assertIn('FUEL', reasons)
        self.assertIn('CATERING', reasons)

    def test_delay_causes_excludes_none_reason(self):
        token = self.get_token('groundstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(
            '/api/turnaround/turnaround-tasks/delay-causes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reasons = [row['reason'] for row in response.data['breakdown']]
        self.assertNotIn('NONE', reasons)
