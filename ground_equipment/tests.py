from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import EquipmentType, GroundEquipment, EquipmentAssignment
from flights.models import Airline, Aircraft, Flight

User = get_user_model()


class GroundEquipmentAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='admin', password='admin123', email='admin@test.com')
        self.user = User.objects.create_user(username='staffuser', password='staff123')

        self.equipment_type = EquipmentType.objects.create(name='fuel_truck', description='Standard fuel truck')
        self.equipment = GroundEquipment.objects.create(
            equipment_type=self.equipment_type,
            equipment_id='FT-001',
            status='available',
            location='Terminal A'
        )

        self.airline = Airline.objects.create(name='Test Airline', code='TA')
        self.aircraft = Aircraft.objects.create(registration_number='TC-002', aircraft_type='Boeing 737', capacity=180)
        self.flight = Flight.objects.create(
            flight_number='TA002', origin='JFK', destination='LAX',
            departure_time='2026-07-01T10:00:00Z', arrival_time='2026-07-01T14:00:00Z',
            status='SCHEDULED', airline=self.airline, aircraft=self.aircraft
        )

    def get_token(self, username, password):
        response = self.client.post('/api/token/', {'username': username, 'password': password})
        return response.data['access']

    def test_unauthenticated_cannot_access_equipment(self):
        response = self.client.get('/api/ground-equipment/equipment/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_list_equipment(self):
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/ground-equipment/equipment/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_authenticated_user_can_create_equipment(self):
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/ground-equipment/equipment/', {
            'equipment_type': self.equipment_type.id,
            'equipment_id': 'FT-002',
            'status': 'available',
            'location': 'Terminal B'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_filter_equipment_by_status(self):
        GroundEquipment.objects.create(
            equipment_type=self.equipment_type, equipment_id='FT-003',
            status='maintenance', location='Terminal C'
        )
        token = self.get_token('staffuser', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/ground-equipment/equipment/?status=maintenance')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if 'results' in response.data else response.data
        for item in results:
            self.assertEqual(item['status'], 'maintenance')

class EquipmentAssignmentAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='assignuser', password='assign123')

        self.equipment_type = EquipmentType.objects.create(name='pushback_tractor', description='Tractor')
        self.equipment = GroundEquipment.objects.create(
            equipment_type=self.equipment_type,
            equipment_id='PT-001',
            status='available',
            location='Terminal A'
        )

        self.airline = Airline.objects.create(name='Assign Airline', code='AA')
        self.aircraft = Aircraft.objects.create(registration_number='TC-003', aircraft_type='Airbus A320', capacity=150)
        self.flight = Flight.objects.create(
            flight_number='AA010', origin='JFK', destination='ORD',
            departure_time='2026-07-01T09:00:00Z', arrival_time='2026-07-01T11:00:00Z',
            status='SCHEDULED', airline=self.airline, aircraft=self.aircraft
        )

    def get_token(self, username, password):
        response = self.client.post('/api/token/', {'username': username, 'password': password})
        return response.data['access']

    def authenticate(self):
        token = self.get_token('assignuser', 'assign123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_creating_assignment_sets_equipment_in_use(self):
        self.authenticate()
        response = self.client.post('/api/ground-equipment/assignments/', {
            'equipment': self.equipment.id,
            'flight': self.flight.id
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.equipment.refresh_from_db()
        self.assertEqual(self.equipment.status, 'in_use')

    def test_assignment_release_action_frees_equipment(self):
        self.authenticate()
        create_resp = self.client.post('/api/ground-equipment/assignments/', {
            'equipment': self.equipment.id,
            'flight': self.flight.id
        })
        assignment_id = create_resp.data['id']

        release_resp = self.client.post(f'/api/ground-equipment/assignments/{assignment_id}/release/')
        self.assertEqual(release_resp.status_code, status.HTTP_200_OK)

        self.equipment.refresh_from_db()
        self.assertEqual(self.equipment.status, 'available')
        self.assertIsNotNone(release_resp.data['assignment']['released_at'])
    def test_release_equipment_action_no_active_assignment(self):
        self.authenticate()
        response = self.client.post(f'/api/ground-equipment/equipment/{self.equipment.id}/release_equipment/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_release_equipment_action_releases_active_assignment(self):
        self.authenticate()
        EquipmentAssignment.objects.create(equipment=self.equipment, flight=self.flight)
        self.equipment.status = 'in_use'
        self.equipment.save()

        response = self.client.post(f'/api/ground-equipment/equipment/{self.equipment.id}/release_equipment/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.equipment.refresh_from_db()
        self.assertEqual(self.equipment.status, 'available')

        assignment = EquipmentAssignment.objects.get(equipment=self.equipment, flight=self.flight)
        self.assertIsNotNone(assignment.released_at)


class PredictFailureAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='predictuser', password='predict123')

        self.equipment_type = EquipmentType.objects.create(name='gpu', description='Ground power unit')
        self.equipment = GroundEquipment.objects.create(
            equipment_type=self.equipment_type,
            equipment_id='GPU-001',
            status='available',
            location='Terminal B',
            last_maintenance='2026-05-01T08:00:00Z'
        )

    def get_token(self, username, password):
        response = self.client.post('/api/token/', {'username': username, 'password': password})
        return response.data['access']

    def authenticate(self):
        token = self.get_token('predictuser', 'predict123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_predict_failure_requires_auth(self):
        response = self.client.get(f'/api/ground-equipment/equipment/{self.equipment.id}/predict_failure/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_predict_failure_returns_prediction_and_confidence(self):
        self.authenticate()
        response = self.client.get(f'/api/ground-equipment/equipment/{self.equipment.id}/predict_failure/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('prediction', response.data)
        self.assertIn('confidence', response.data)
        self.assertIsInstance(response.data['confidence'], float)

    def test_predict_failure_with_no_maintenance_history(self):
        equipment_no_maint = GroundEquipment.objects.create(
            equipment_type=self.equipment_type,
            equipment_id='GPU-002',
            status='available',
            location='Terminal C'
        )
        self.authenticate()
        response = self.client.get(f'/api/ground-equipment/equipment/{equipment_no_maint.id}/predict_failure/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('prediction', response.data)
class InvalidAssignmentScenariosTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='invaliduser', password='invalid123')

        self.equipment_type = EquipmentType.objects.create(name='tow_vehicle', description='Tow vehicle')
        self.equipment = GroundEquipment.objects.create(
            equipment_type=self.equipment_type,
            equipment_id='TV-001',
            status='available',
            location='Terminal D'
        )

        self.airline = Airline.objects.create(name='Invalid Airline', code='IA')
        self.aircraft = Aircraft.objects.create(registration_number='TC-004', aircraft_type='Airbus A321', capacity=200)
        self.flight = Flight.objects.create(
            flight_number='IA001', origin='ORD', destination='DFW',
            departure_time='2026-07-01T09:00:00Z', arrival_time='2026-07-01T12:00:00Z',
            status='SCHEDULED', airline=self.airline, aircraft=self.aircraft
        )

    def get_token(self, username, password):
        response = self.client.post('/api/token/', {'username': username, 'password': password})
        return response.data['access']

    def authenticate(self):
        token = self.get_token('invaliduser', 'invalid123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_unauthenticated_cannot_create_assignment(self):
        response = self.client.post('/api/ground-equipment/assignments/', {
            'equipment': self.equipment.id,
            'flight': self.flight.id
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_duplicate_assignment_for_same_equipment_and_flight_rejected(self):
        self.authenticate()
        first = self.client.post('/api/ground-equipment/assignments/', {
            'equipment': self.equipment.id,
            'flight': self.flight.id
        })
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        duplicate = self.client.post('/api/ground-equipment/assignments/', {
            'equipment': self.equipment.id,
            'flight': self.flight.id
        })
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)

    def test_assignment_with_nonexistent_equipment_returns_400(self):
        self.authenticate()
        response = self.client.post('/api/ground-equipment/assignments/', {
            'equipment': 99999,
            'flight': self.flight.id
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_assignment_with_nonexistent_flight_returns_400(self):
        self.authenticate()
        response = self.client.post('/api/ground-equipment/assignments/', {
            'equipment': self.equipment.id,
            'flight': 99999
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_assignment_missing_required_fields_returns_400(self):
        self.authenticate()
        response = self.client.post('/api/ground-equipment/assignments/', {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)