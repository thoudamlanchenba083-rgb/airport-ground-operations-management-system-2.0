from django.utils import timezone
from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import RampInspection, PushbackOperation
from .serializers import RampInspectionSerializer, PushbackOperationSerializer
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
        extra = {}
        if serializer.validated_data.get('status') in (
                'PASSED', 'FAILED') and not serializer.instance.inspected_at:
            extra['inspected_at'] = timezone.now()
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
        extra = {}
        new_status = serializer.validated_data.get('status')
        if new_status == 'APPROVED' and not serializer.instance.approved_at:
            extra['approved_at'] = timezone.now()
        if new_status == 'IN_PROGRESS' and not serializer.instance.started_at:
            extra['started_at'] = timezone.now()
        if new_status == 'COMPLETED' and not serializer.instance.completed_at:
            extra['completed_at'] = timezone.now()
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
