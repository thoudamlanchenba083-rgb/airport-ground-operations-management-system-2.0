from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import FuelCompany, FuelTruck, FuelOperation
from .serializers import FuelCompanySerializer, FuelTruckSerializer, FuelOperationSerializer
from core_app.utils import log_action
from core_app.permissions import HasRole


class FuelCompanyViewSet(viewsets.ModelViewSet):
    queryset = FuelCompany.objects.all()
    serializer_class = FuelCompanySerializer
    permission_classes = [HasRole('OPERATIONS_MANAGER', 'SUPERVISOR')]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name']


class FuelTruckViewSet(viewsets.ModelViewSet):
    queryset = FuelTruck.objects.select_related('fuel_company').all()
    serializer_class = FuelTruckSerializer
    permission_classes = [HasRole('OPERATIONS_MANAGER', 'SUPERVISOR', 'GROUND_STAFF')]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'fuel_company']
    search_fields = ['truck_code']


class FuelOperationViewSet(viewsets.ModelViewSet):
    queryset = FuelOperation.objects.select_related('flight', 'fuel_truck', 'fuel_company', 'fuel_operator').all()
    serializer_class = FuelOperationSerializer
    permission_classes = [HasRole('OPERATIONS_MANAGER', 'SUPERVISOR', 'GROUND_STAFF')]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['flight', 'status', 'fuel_truck', 'fuel_company']
    search_fields = ['flight__flight_number']
    ordering_fields = ['fuel_start_time', 'fuel_end_time', 'created_at']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'FuelOperation', instance.id,
                    f'Created fuel operation: {instance}', self.request)

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'UPDATE', 'FuelOperation', instance.id,
                    f'Updated fuel operation: {instance}', self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'FuelOperation', instance.id,
                    f'Deleted fuel operation: {instance}', self.request)
        instance.delete()