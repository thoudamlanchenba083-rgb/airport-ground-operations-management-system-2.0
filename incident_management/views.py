from django.utils import timezone
from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Incident, IncidentUpdate
from .serializers import IncidentSerializer, IncidentUpdateSerializer
from core_app.utils import log_action
from core_app.permissions import HasRole


class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.select_related(
        'flight', 'reported_by', 'assigned_to'
    ).prefetch_related('updates').all()
    serializer_class = IncidentSerializer
    permission_classes = [HasRole('OPERATIONS_MANAGER', 'SUPERVISOR', 'GROUND_STAFF', 'SECURITY_OFFICER')]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['incident_type', 'severity', 'status', 'flight']
    search_fields = ['flight__flight_number', 'location', 'description']
    ordering_fields = ['occurred_at', 'created_at', 'severity']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'Incident', instance.id,
                    f'Created incident: {instance}', self.request)

    def perform_update(self, serializer):
        extra = {}
        new_status = serializer.validated_data.get('status')
        if new_status in ('RESOLVED', 'CLOSED') and not serializer.instance.resolved_at:
            extra['resolved_at'] = timezone.now()
        instance = serializer.save(**extra)
        log_action(self.request.user, 'UPDATE', 'Incident', instance.id,
                    f'Updated incident: {instance}', self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'Incident', instance.id,
                    f'Deleted incident: {instance}', self.request)
        instance.delete()


class IncidentUpdateViewSet(viewsets.ModelViewSet):
    queryset = IncidentUpdate.objects.select_related('incident', 'updated_by').all()
    serializer_class = IncidentUpdateSerializer
    permission_classes = [HasRole('OPERATIONS_MANAGER', 'SUPERVISOR', 'GROUND_STAFF', 'SECURITY_OFFICER')]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['incident']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'IncidentUpdate', instance.id,
                    f'Created incident update: {instance}', self.request)