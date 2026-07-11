from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import RampInspection, PushbackOperation
from .serializers import RampInspectionSerializer, PushbackOperationSerializer
from .services import RampInspectionService, PushbackOperationService
from core_app.utils import log_action
from core_app.permissions import HasRole


class RampInspectionViewSet(viewsets.ModelViewSet):
    queryset = RampInspection.objects.select_related(
        'flight', 'inspector').all()
    serializer_class = RampInspectionSerializer
    permission_classes = [
        HasRole(
            'OPERATIONS_MANAGER',
            'SUPERVISOR',
            'RAMP_SUPERVISOR',
            'GROUND_STAFF')]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'stand', 'flight']
    search_fields = ['stand', 'flight__flight_number']
    ordering_fields = ['inspected_at', 'created_at']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'RampInspection', instance.id,
                   f'Created ramp inspection: {instance}', self.request)

    def perform_update(self, serializer):
        extra = RampInspectionService.build_status_timestamps(
            serializer.instance, serializer.validated_data)
        instance = serializer.save(**extra)
        log_action(self.request.user, 'UPDATE', 'RampInspection', instance.id,
                   f'Updated ramp inspection: {instance}', self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'RampInspection', instance.id,
                   f'Deleted ramp inspection: {instance}', self.request)
        instance.delete()


class PushbackOperationViewSet(viewsets.ModelViewSet):
    queryset = PushbackOperation.objects.select_related(
        'flight', 'marshaller', 'approved_by').all()
    serializer_class = PushbackOperationSerializer
    permission_classes = [
        HasRole(
            'OPERATIONS_MANAGER',
            'SUPERVISOR',
            'RAMP_SUPERVISOR',
            'GROUND_STAFF')]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'flight']
    search_fields = ['flight__flight_number', 'tow_vehicle_code']
    ordering_fields = ['requested_at', 'approved_at', 'completed_at']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(
            self.request.user,
            'CREATE',
            'PushbackOperation',
            instance.id,
            f'Created pushback operation: {instance}',
            self.request)

    def perform_update(self, serializer):
        extra = PushbackOperationService.build_status_timestamps(
            serializer.instance, serializer.validated_data)
        instance = serializer.save(**extra)
        log_action(
            self.request.user,
            'UPDATE',
            'PushbackOperation',
            instance.id,
            f'Updated pushback operation: {instance}',
            self.request)

    def perform_destroy(self, instance):
        log_action(
            self.request.user,
            'DELETE',
            'PushbackOperation',
            instance.id,
            f'Deleted pushback operation: {instance}',
            self.request)
        instance.delete()
