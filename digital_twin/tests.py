from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from gates.models import Gate, GateAssignment
from ground_equipment.models import EquipmentType, GroundEquipment, EquipmentAssignment
from turnaround.models import TurnaroundTask
from flights.models import Airline, Aircraft, Flight

User = get_user_model()


class DigitalTwinAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='admin', password='admin123', email='admin@test.com')
        self.staff_user = User.objects.create_user(
            username='opstaff', password='staff123', role='GATE_MANAGER')

        self.airline = Airline.objects.create(name='Test Airline', code='TA')
        self.aircraft = Aircraft.objects.create(
            registration_number='TC-400',
            aircraft_type='Airbus A320',
            capacity=180,
            width=34.00,
            length=37.00)
        self.flight = Flight.objects.create(
            flight_number='TA400',
            origin='JFK',
            destination='LAX',
            departure_time='2026-07-01T10:00:00Z',
            arrival_time='2026-07-01T14:00:00Z',
            status='GATE_ASSIGNED',
            airline=self.airline,
            aircraft=self.aircraft)

        self.gate = Gate.objects.create(
            gate_number='G1', terminal='T1',
            gate_type='domestic', width=40.00, length=45.00)
        self.alt_gate = Gate.objects.create(
            gate_number='G2', terminal='T1',
            gate_type='domestic', width=40.00, length=45.00)

        self.assignment = GateAssignment.objects.create(
            flight=self.flight, gate=self.gate, status='assigned')

        self.equipment_type = EquipmentType.objects.create(
            name='gpu', description='Ground Power Unit')
        self.equipment = GroundEquipment.objects.create(
            equipment_type=self.equipment_type,
            equipment_id='EQ-1',
            status='in_use',
            location='Apron 1')
        EquipmentAssignment.objects.create(
            equipment=self.equipment, flight=self.flight)

    def get_token(self, username, password):
        self.client.post(
            '/api/token/', {'username': username, 'password': password})
        return self.client.cookies['access_token'].value

    def authenticate(self, username='opstaff', password='staff123'):
        token = self.get_token(username, password)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    # --- snapshot ---

    def test_unauthenticated_cannot_access_snapshot(self):
        response = self.client.get('/api/digital-twin/snapshot/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_snapshot_returns_gates_and_equipment(self):
        self.authenticate()
        response = self.client.get('/api/digital-twin/snapshot/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary']['total_gates'], 2)
        self.assertEqual(response.data['summary']['occupied_gates'], 1)
        self.assertEqual(response.data['summary']['total_equipment'], 1)
        self.assertEqual(response.data['summary']['equipment_in_use'], 1)

        gate_row = next(
            g for g in response.data['gates'] if g['gate_number'] == 'G1')
        self.assertIsNotNone(gate_row['flight'])
        self.assertEqual(gate_row['flight']['flight_number'], 'TA400')

        equipment_row = response.data['equipment'][0]
        self.assertEqual(equipment_row['flight_number'], 'TA400')
        self.assertEqual(equipment_row['assigned_gate'], 'G1')

    # --- heatmap ---

    def test_unauthenticated_cannot_access_heatmap(self):
        response = self.client.get('/api/digital-twin/heatmap/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_heatmap_scores_occupied_gate_higher(self):
        self.authenticate()
        response = self.client.get('/api/digital-twin/heatmap/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        g1 = next(g for g in response.data['gates'] if g['gate_number'] == 'G1')
        g2 = next(g for g in response.data['gates'] if g['gate_number'] == 'G2')
        self.assertGreater(g1['score'], g2['score'])
        self.assertEqual(response.data['busiest_gate'], 'G1')

    def test_heatmap_maintenance_gate_forces_max_score(self):
        self.gate.is_under_maintenance = True
        self.gate.save()
        self.authenticate()
        response = self.client.get('/api/digital-twin/heatmap/')
        g1 = next(g for g in response.data['gates'] if g['gate_number'] == 'G1')
        self.assertEqual(g1['score'], 100)
        self.assertEqual(g1['level'], 'high')

    # --- what-if gate closure ---

    def test_unauthenticated_cannot_access_what_if(self):
        response = self.client.get(
            '/api/digital-twin/what-if/gate-closure/G1/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_what_if_closure_reassigns_to_alternative_gate(self):
        self.authenticate()
        response = self.client.get(
            '/api/digital-twin/what-if/gate-closure/G1/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['affected_flight_count'], 1)
        delayed = response.data['delayed_flights'][0]
        self.assertEqual(delayed['flight_number'], 'TA400')
        self.assertEqual(delayed['delay_minutes'], 20)
        reassignment = response.data['new_gate_assignments'][0]
        self.assertEqual(reassignment['new_gate'], 'G2')
        movement = response.data['equipment_movement'][0]
        self.assertEqual(movement['equipment_id'], 'EQ-1')

    def test_what_if_closure_no_alternative_gate_available(self):
        self.alt_gate.is_under_maintenance = True
        self.alt_gate.save()
        self.authenticate()
        response = self.client.get(
            '/api/digital-twin/what-if/gate-closure/G1/')
        delayed = response.data['delayed_flights'][0]
        self.assertIsNone(delayed['new_departure'])
        self.assertIn('manual intervention', delayed['reason'])

    def test_what_if_closure_empty_gate_has_no_impact(self):
        self.authenticate()
        response = self.client.get(
            '/api/digital-twin/what-if/gate-closure/G2/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['affected_flight_count'], 0)
        self.assertEqual(response.data['delayed_flights'], [])

    def test_what_if_closure_unknown_gate_returns_404(self):
        self.authenticate()
        response = self.client.get(
            '/api/digital-twin/what-if/gate-closure/UNKNOWN/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_staff_changes_include_assigned_staff_for_pending_tasks(self):
        from staff.models import Staff
        staff_member = Staff.objects.create(
            employee_id='EMP-1', name='John Doe', staff_type='GROUND',
            phone='555-0100', email='john.doe@test.com')
        TurnaroundTask.objects.create(
            flight=self.flight,
            task_type='FUELING',
            status='PENDING',
            assigned_staff=staff_member)
        self.authenticate()
        response = self.client.get(
            '/api/digital-twin/what-if/gate-closure/G1/')
        self.assertEqual(len(response.data['staff_changes']), 1)
        self.assertEqual(
            response.data['staff_changes'][0]['employee_id'], 'EMP-1')
