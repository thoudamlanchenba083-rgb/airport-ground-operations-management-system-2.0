from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Incident, IncidentUpdate
from flights.models import Airline, Aircraft, Flight
from staff.models import Staff

User = get_user_model()


class IncidentAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='admin', password='admin123', email='admin@test.com')
        self.staff_user = User.objects.create_user(
            username='secofficer', password='staff123', role='SECURITY_OFFICER')

        self.airline = Airline.objects.create(name='Test Airline', code='TA')
        self.aircraft = Aircraft.objects.create(
            registration_number='TC-700',
            aircraft_type='Airbus A320',
            capacity=180)
        self.flight = Flight.objects.create(
            flight_number='TA700',
            origin='JFK',
            destination='LAX',
            departure_time='2026-07-01T10:00:00Z',
            arrival_time='2026-07-01T14:00:00Z',
            status='SCHEDULED',
            airline=self.airline,
            aircraft=self.aircraft)

        self.reporter = Staff.objects.create(
            name='Reporter One', employee_id='EMP-700',
            staff_type='GROUND', phone='1234567700',
            email='reporter1@test.com')
        self.assignee = Staff.objects.create(
            name='Assignee One', employee_id='EMP-701',
            staff_type='SUPERVISOR', phone='1234567701',
            email='assignee1@test.com')

        self.incident = Incident.objects.create(
            incident_type='FOD',
            severity='MEDIUM',
            status='REPORTED',
            flight=self.flight,
            location='Gate B12',
            reported_by=self.reporter,
            description='Foreign object debris found near aircraft.',
            occurred_at='2026-07-01T08:00:00Z')

    def get_token(self, username, password):
        self.client.post(
            '/api/token/', {'username': username, 'password': password})
        return self.client.cookies['access_token'].value

    def test_unauthenticated_cannot_access_incidents(self):
        response = self.client.get('/api/incidents/incidents/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_list_incidents(self):
        token = self.get_token('secofficer', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/incidents/incidents/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_authenticated_user_can_create_incident(self):
        token = self.get_token('secofficer', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/incidents/incidents/', {
            'incident_type': 'BIRD_STRIKE',
            'severity': 'LOW',
            'status': 'REPORTED',
            'flight': self.flight.id,
            'location': 'Runway 4L',
            'description': 'Minor bird strike on approach.',
            'occurred_at': '2026-07-01T09:00:00Z'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_read_allowed_but_write_forbidden_for_wrong_role(self):
        User.objects.create_user(
            username='hrperson', password='hr12345', role='HR')
        token = self.get_token('hrperson', 'hr12345')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        read_response = self.client.get('/api/incidents/incidents/')
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)

        write_response = self.client.patch(
            f'/api/incidents/incidents/{self.incident.id}/',
            {'location': 'Somewhere else'},
            content_type='application/json')
        self.assertEqual(write_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_resolving_incident_requires_resolved_at(self):
        token = self.get_token('secofficer', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/incidents/incidents/{self.incident.id}/',
            {'status': 'RESOLVED'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resolving_incident_with_resolved_at_succeeds(self):
        token = self.get_token('secofficer', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/incidents/incidents/{self.incident.id}/',
            {'status': 'RESOLVED', 'resolved_at': '2026-07-01T10:00:00Z'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_high_severity_requires_corrective_action_before_resolving(self):
        self.incident.severity = 'HIGH'
        self.incident.save()
        token = self.get_token('secofficer', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/incidents/incidents/{self.incident.id}/',
            {'status': 'RESOLVED', 'resolved_at': '2026-07-01T10:00:00Z'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_high_severity_resolves_with_corrective_action(self):
        self.incident.severity = 'HIGH'
        self.incident.save()
        token = self.get_token('secofficer', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/incidents/incidents/{self.incident.id}/',
            {
                'status': 'RESOLVED',
                'resolved_at': '2026-07-01T10:00:00Z',
                'corrective_action': 'Cleared debris and inspected runway.'
            },
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cannot_reopen_resolved_incident_to_reported(self):
        self.incident.status = 'RESOLVED'
        self.incident.resolved_at = '2026-07-01T10:00:00Z'
        self.incident.save()
        token = self.get_token('secofficer', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/incidents/incidents/{self.incident.id}/',
            {'status': 'REPORTED'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resolved_at_cannot_be_before_occurred_at(self):
        token = self.get_token('secofficer', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/incidents/incidents/{self.incident.id}/',
            {'status': 'RESOLVED', 'resolved_at': '2026-07-01T06:00:00Z'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_incidents_by_severity(self):
        Incident.objects.create(
            incident_type='STAFF_INJURY', severity='CRITICAL',
            status='REPORTED', description='Worker injury near stand.',
            occurred_at='2026-07-01T07:00:00Z')
        token = self.get_token('secofficer', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(
            '/api/incidents/incidents/?severity=CRITICAL')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if 'results' in response.data else response.data
        for item in results:
            self.assertEqual(item['severity'], 'CRITICAL')

    def test_incident_str_representation(self):
        rep = str(self.incident)
        self.assertIn('MEDIUM', rep)
        self.assertIn('REPORTED', rep)

    def test_create_incident_update(self):
        token = self.get_token('secofficer', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/incidents/incident-updates/', {
            'incident': self.incident.id,
            'note': 'Investigating the debris source.',
            'updated_by': self.assignee.id
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_incident_update_appears_on_incident_detail(self):
        IncidentUpdate.objects.create(
            incident=self.incident,
            note='Initial assessment complete.',
            updated_by=self.assignee)
        token = self.get_token('secofficer', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(
            f'/api/incidents/incidents/{self.incident.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['updates']), 1)
        self.assertEqual(
            response.data['updates'][0]['note'],
            'Initial assessment complete.')

    def test_filter_incident_updates_by_incident(self):
        other_incident = Incident.objects.create(
            incident_type='OTHER', severity='LOW', status='REPORTED',
            description='Unrelated incident.',
            occurred_at='2026-07-01T05:00:00Z')
        IncidentUpdate.objects.create(
            incident=self.incident, note='Update A', updated_by=self.assignee)
        IncidentUpdate.objects.create(
            incident=other_incident, note='Update B', updated_by=self.assignee)

        token = self.get_token('secofficer', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get(
            f'/api/incidents/incident-updates/?incident={self.incident.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if 'results' in response.data else response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['note'], 'Update A')

    def test_incident_update_str_representation(self):
        update = IncidentUpdate.objects.create(
            incident=self.incident, note='Test note', updated_by=self.assignee)
        self.assertIn(str(self.incident.id), str(update))
