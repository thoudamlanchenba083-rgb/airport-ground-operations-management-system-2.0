from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import RampInspection, PushbackOperation
from flights.models import Airline, Aircraft, Flight
from staff.models import Staff

User = get_user_model()


class RampOperationsAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='admin', password='admin123', email='admin@test.com')
        self.staff_user = User.objects.create_user(
            username='rampstaff', password='staff123', role='RAMP_SUPERVISOR')

        self.airline = Airline.objects.create(name='Test Airline', code='TA')
        self.aircraft = Aircraft.objects.create(
            registration_number='TC-400',
            aircraft_type='Airbus A320',
            capacity=180)
        self.flight = Flight.objects.create(
            flight_number='TA400',
            origin='JFK',
            destination='LAX',
            departure_time='2026-07-01T10:00:00Z',
            arrival_time='2026-07-01T14:00:00Z',
            status='SCHEDULED',
            airline=self.airline,
            aircraft=self.aircraft)

        self.inspector = Staff.objects.create(
            name='Inspector One', employee_id='EMP-001',
            staff_type='GROUND', phone='1234567890',
            email='inspector1@test.com')
        self.marshaller = Staff.objects.create(
            name='Marshaller One', employee_id='EMP-002',
            staff_type='GROUND', phone='1234567891',
            email='marshaller1@test.com')
        self.approver = Staff.objects.create(
            name='Approver One', employee_id='EMP-003',
            staff_type='SUPERVISOR', phone='1234567892',
            email='approver1@test.com')

        self.inspection = RampInspection.objects.create(
            flight=self.flight, stand='A1', inspector=self.inspector,
            status='PENDING')
        self.pushback = PushbackOperation.objects.create(
            flight=self.flight, marshaller=self.marshaller,
            tow_vehicle_code='TOW-01', status='REQUESTED')

    def get_token(self, username, password):
        self.client.post(
            '/api/token/', {'username': username, 'password': password})
        return self.client.cookies['access_token'].value

    def test_unauthenticated_cannot_access_inspections(self):
        response = self.client.get('/api/ramp-operations/inspections/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_list_inspections(self):
        token = self.get_token('rampstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/ramp-operations/inspections/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_read_allowed_but_write_forbidden_for_wrong_role(self):
        User.objects.create_user(
            username='hrperson', password='hr12345', role='HR')
        token = self.get_token('hrperson', 'hr12345')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        read_response = self.client.get('/api/ramp-operations/inspections/')
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)

        write_response = self.client.patch(
            f'/api/ramp-operations/inspections/{self.inspection.id}/',
            {'stand': 'B2'},
            content_type='application/json')
        self.assertEqual(write_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_mark_inspection_passed_until_checks_clear(self):
        token = self.get_token('rampstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/ramp-operations/inspections/{self.inspection.id}/',
            {'status': 'PASSED'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_can_mark_inspection_passed_once_all_checks_clear(self):
        self.inspection.cone_placement_ok = True
        self.inspection.safety_zone_clear = True
        self.inspection.fod_check_clear = True
        self.inspection.save()
        token = self.get_token('rampstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/ramp-operations/inspections/{self.inspection.id}/',
            {'status': 'PASSED'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.inspection.refresh_from_db()
        self.assertIsNotNone(self.inspection.inspected_at)

    def test_filter_inspections_by_status(self):
        aircraft2 = Aircraft.objects.create(
            registration_number='TC-401',
            aircraft_type='Boeing 737',
            capacity=160)
        flight2 = Flight.objects.create(
            flight_number='TA401', origin='ORD', destination='MIA',
            departure_time='2026-07-02T09:00:00Z',
            arrival_time='2026-07-02T13:00:00Z',
            status='SCHEDULED', airline=self.airline,
            aircraft=aircraft2)
        RampInspection.objects.create(
            flight=flight2, stand='B3', status='FAILED')
        token = self.get_token('rampstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(
            '/api/ramp-operations/inspections/?status=FAILED')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if 'results' in response.data else response.data
        for item in results:
            self.assertEqual(item['status'], 'FAILED')

    def test_ramp_inspection_str_representation(self):
        self.assertIn('A1', str(self.inspection))
        self.assertIn('PENDING', str(self.inspection))

    def test_authenticated_user_can_create_pushback(self):
        token = self.get_token('rampstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/ramp-operations/pushback-operations/', {
            'flight': self.flight.id,
            'tow_vehicle_code': 'TOW-02',
            'status': 'REQUESTED'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_cannot_approve_pushback_without_approver(self):
        token = self.get_token('rampstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/ramp-operations/pushback-operations/{self.pushback.id}/',
            {'status': 'APPROVED'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_approving_pushback_with_approver_sets_timestamp(self):
        token = self.get_token('rampstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/ramp-operations/pushback-operations/{self.pushback.id}/',
            {'status': 'APPROVED', 'approved_by': self.approver.id},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pushback.refresh_from_db()
        self.assertIsNotNone(self.pushback.approved_at)

    def test_pushback_cannot_move_backwards(self):
        self.pushback.status = 'APPROVED'
        self.pushback.approved_by = self.approver
        self.pushback.save()
        token = self.get_token('rampstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/ramp-operations/pushback-operations/{self.pushback.id}/',
            {'status': 'REQUESTED'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pushback_can_be_rejected_from_requested(self):
        token = self.get_token('rampstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/ramp-operations/pushback-operations/{self.pushback.id}/',
            {'status': 'REJECTED'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_completing_pushback_sets_completed_timestamp(self):
        self.pushback.status = 'IN_PROGRESS'
        self.pushback.approved_by = self.approver
        self.pushback.save()
        token = self.get_token('rampstaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/ramp-operations/pushback-operations/{self.pushback.id}/',
            {'status': 'COMPLETED', 'approved_by': self.approver.id},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pushback.refresh_from_db()
        self.assertIsNotNone(self.pushback.completed_at)

    def test_pushback_str_representation(self):
        self.assertIn('TA400', str(self.pushback))
        self.assertIn('REQUESTED', str(self.pushback))
