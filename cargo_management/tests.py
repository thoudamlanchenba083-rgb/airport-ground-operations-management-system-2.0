from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import ULD, CargoManifest, CargoItem
from flights.models import Airline, Aircraft, Flight

User = get_user_model()


class CargoManagementAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='admin', password='admin123', email='admin@test.com')
        self.staff_user = User.objects.create_user(
            username='cargostaff', password='staff123', role='CARGO_SUPERVISOR')

        self.airline = Airline.objects.create(name='Test Airline', code='TA')
        self.aircraft = Aircraft.objects.create(
            registration_number='TC-1000',
            aircraft_type='Boeing 777',
            capacity=300)
        self.flight = Flight.objects.create(
            flight_number='TA1000',
            origin='JFK',
            destination='LAX',
            departure_time='2026-07-01T10:00:00Z',
            arrival_time='2026-07-01T14:00:00Z',
            status='SCHEDULED',
            airline=self.airline,
            aircraft=self.aircraft)

        self.uld = ULD.objects.create(
            uld_id='AKE12345',
            uld_type='CONTAINER',
            status='EMPTY',
            flight=self.flight,
            position='AKE-1',
            weight_kg=Decimal('0.00'),
            max_weight_kg=Decimal('1500.00'))

        self.manifest = CargoManifest.objects.create(
            flight=self.flight,
            manifest_number='MAN-1000')

    def get_token(self, username, password):
        self.client.post(
            '/api/token/', {'username': username, 'password': password})
        return self.client.cookies['access_token'].value

    def test_unauthenticated_cannot_access_ulds(self):
        response = self.client.get('/api/cargo/ulds/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_list_ulds(self):
        token = self.get_token('cargostaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/cargo/ulds/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_authenticated_user_can_create_uld(self):
        token = self.get_token('cargostaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/cargo/ulds/', {
            'uld_id': 'PMC98765',
            'uld_type': 'PALLET',
            'status': 'EMPTY',
            'flight': self.flight.id,
            'position': 'PMC-1',
            'weight_kg': '0.00',
            'max_weight_kg': '2000.00'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_read_allowed_but_write_forbidden_for_wrong_role(self):
        User.objects.create_user(
            username='hrperson', password='hr12345', role='HR')
        token = self.get_token('hrperson', 'hr12345')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        read_response = self.client.get('/api/cargo/ulds/')
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)

        write_response = self.client.patch(
            f'/api/cargo/ulds/{self.uld.id}/',
            {'position': 'AKE-2'},
            content_type='application/json')
        self.assertEqual(write_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_uld_weight_cannot_exceed_max_weight(self):
        token = self.get_token('cargostaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/cargo/ulds/', {
            'uld_id': 'AKE99999',
            'uld_type': 'CONTAINER',
            'status': 'LOADING',
            'flight': self.flight.id,
            'weight_kg': '2000.00',
            'max_weight_kg': '1500.00'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_uld_weight_within_max_weight_accepted(self):
        token = self.get_token('cargostaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/cargo/ulds/', {
            'uld_id': 'AKE88888',
            'uld_type': 'CONTAINER',
            'status': 'LOADING',
            'flight': self.flight.id,
            'weight_kg': '1000.00',
            'max_weight_kg': '1500.00'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_updating_uld_weight_over_max_rejected(self):
        token = self.get_token('cargostaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/cargo/ulds/{self.uld.id}/',
            {'weight_kg': '1600.00'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_ulds_by_status(self):
        ULD.objects.create(
            uld_id='PMC11111', uld_type='PALLET', status='LOADED',
            flight=self.flight, weight_kg=Decimal('500.00'),
            max_weight_kg=Decimal('2000.00'))
        token = self.get_token('cargostaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/cargo/ulds/?status=LOADED')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if 'results' in response.data else response.data
        for item in results:
            self.assertEqual(item['status'], 'LOADED')

    def test_authenticated_user_can_list_manifests(self):
        token = self.get_token('cargostaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/cargo/cargo-manifests/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_manifest(self):
        aircraft2 = Aircraft.objects.create(
            registration_number='TC-1001',
            aircraft_type='Boeing 737',
            capacity=160)
        flight2 = Flight.objects.create(
            flight_number='TA1001', origin='ORD', destination='MIA',
            departure_time='2026-07-02T09:00:00Z',
            arrival_time='2026-07-02T13:00:00Z',
            status='SCHEDULED', airline=self.airline,
            aircraft=aircraft2)
        token = self.get_token('cargostaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/cargo/cargo-manifests/', {
            'flight': flight2.id,
            'manifest_number': 'MAN-1001'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_duplicate_manifest_for_same_flight_rejected(self):
        token = self.get_token('cargostaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/cargo/cargo-manifests/', {
            'flight': self.flight.id,
            'manifest_number': 'MAN-DUP'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_cargo_item(self):
        token = self.get_token('cargostaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/cargo/cargo-items/', {
            'manifest': self.manifest.id,
            'uld': self.uld.id,
            'awb_number': 'AWB-001',
            'description': 'Electronics parts',
            'weight_kg': '250.00',
            'status': 'PENDING'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_dangerous_goods_requires_class(self):
        token = self.get_token('cargostaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/cargo/cargo-items/', {
            'manifest': self.manifest.id,
            'description': 'Lithium batteries',
            'weight_kg': '50.00',
            'status': 'PENDING',
            'is_dangerous_goods': True
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_dangerous_goods_with_class_accepted(self):
        token = self.get_token('cargostaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/cargo/cargo-items/', {
            'manifest': self.manifest.id,
            'description': 'Lithium batteries',
            'weight_kg': '50.00',
            'status': 'PENDING',
            'is_dangerous_goods': True,
            'dangerous_goods_class': 'CLASS_9'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_non_dangerous_goods_cannot_have_class_set(self):
        token = self.get_token('cargostaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.post('/api/cargo/cargo-items/', {
            'manifest': self.manifest.id,
            'description': 'Regular parcel',
            'weight_kg': '10.00',
            'status': 'PENDING',
            'is_dangerous_goods': False,
            'dangerous_goods_class': 'CLASS_9'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_creating_item_recalculates_manifest_total_weight(self):
        token = self.get_token('cargostaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        self.client.post('/api/cargo/cargo-items/', {
            'manifest': self.manifest.id,
            'description': 'Box A',
            'weight_kg': '100.00',
            'status': 'PENDING'
        })
        self.client.post('/api/cargo/cargo-items/', {
            'manifest': self.manifest.id,
            'description': 'Box B',
            'weight_kg': '200.00',
            'status': 'PENDING'
        })
        self.manifest.refresh_from_db()
        self.assertEqual(self.manifest.total_weight_kg, Decimal('300.00'))

    def test_updating_item_weight_recalculates_manifest_total(self):
        from .services import CargoManifestService
        item = CargoItem.objects.create(
            manifest=self.manifest, description='Box C',
            weight_kg=Decimal('100.00'), status='PENDING')
        CargoManifestService.recalculate_total_weight(self.manifest)
        self.manifest.refresh_from_db()
        self.assertEqual(self.manifest.total_weight_kg, Decimal('100.00'))

        token = self.get_token('cargostaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/cargo/cargo-items/{item.id}/',
            {'weight_kg': '150.00'},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.manifest.refresh_from_db()
        self.assertEqual(self.manifest.total_weight_kg, Decimal('150.00'))

    def test_deleting_item_recalculates_manifest_total(self):
        from .services import CargoManifestService
        item = CargoItem.objects.create(
            manifest=self.manifest, description='Box D',
            weight_kg=Decimal('75.00'), status='PENDING')
        CargoManifestService.recalculate_total_weight(self.manifest)
        self.manifest.refresh_from_db()
        self.assertEqual(self.manifest.total_weight_kg, Decimal('75.00'))

        token = self.get_token('cargostaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.delete(f'/api/cargo/cargo-items/{item.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.manifest.refresh_from_db()
        self.assertEqual(self.manifest.total_weight_kg, Decimal('0'))

    def test_cannot_finalize_manifest_with_no_items(self):
        token = self.get_token('cargostaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/cargo/cargo-manifests/{self.manifest.id}/',
            {'is_finalized': True},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_can_finalize_manifest_with_items(self):
        CargoItem.objects.create(
            manifest=self.manifest, description='Box E',
            weight_kg=Decimal('50.00'), status='PENDING')
        token = self.get_token('cargostaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/cargo/cargo-manifests/{self.manifest.id}/',
            {'is_finalized': True},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.manifest.refresh_from_db()
        self.assertTrue(self.manifest.is_finalized)

    def test_re_saving_already_finalized_manifest_does_not_recheck_items(self):
        CargoItem.objects.create(
            manifest=self.manifest, description='Box F',
            weight_kg=Decimal('20.00'), status='PENDING')
        self.manifest.is_finalized = True
        self.manifest.save()
        token = self.get_token('cargostaff', 'staff123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.patch(
            f'/api/cargo/cargo-manifests/{self.manifest.id}/',
            {'is_finalized': True},
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_uld_str_representation(self):
        self.assertIn('AKE12345', str(self.uld))
        self.assertIn('Container', str(self.uld))

    def test_cargo_manifest_str_representation(self):
        rep = str(self.manifest)
        self.assertIn('MAN-1000', rep)
        self.assertIn('TA1000', rep)

    def test_cargo_item_str_representation(self):
        item = CargoItem.objects.create(
            manifest=self.manifest, awb_number='AWB-777',
            description='Sample cargo item', weight_kg=Decimal('10.00'))
        rep = str(item)
        self.assertIn('AWB-777', rep)
        self.assertIn('Sample cargo item', rep)

    def test_cargo_item_str_falls_back_when_no_awb(self):
        item = CargoItem.objects.create(
            manifest=self.manifest,
            description='No AWB item', weight_kg=Decimal('5.00'))
        self.assertIn('AWB-N/A', str(item))
