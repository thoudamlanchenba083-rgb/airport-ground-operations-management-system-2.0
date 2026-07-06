from django.utils import timezone
from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import WaterLavatoryService
from .serializers import WaterLavatoryServiceSerializer
from core_app.utils import log_action
from core_app.permissions import HasRole


class WaterLavatoryServiceViewSet(viewsets.ModelViewSet):
    queryset = WaterLavatoryService.objects.select_related('flight', 'assigned_staff').all()
    serializer_class = WaterLavatoryServiceSerializer
    permission_classes = [HasRole('OPERATIONS_MANAGER', 'SUPERVISOR', 'GROUND_STAFF')]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['flight', 'status', 'potable_water_refilled', 'lavatory_serviced']
    search_fields = ['flight__flight_number']
    ordering_fields = ['created_at', 'started_at', 'completed_at']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'WaterLavatoryService', instance.id,
                    f'Created water/lavatory service: {instance}', self.request)

    def perform_update(self, serializer):
        extra = {}
        if serializer.validated_data.get('status') == 'COMPLETED' and not serializer.instance.completed_at:
            extra['completed_at'] = timezone.now()
        if serializer.validated_data.get('status') == 'IN_PROGRESS' and not serializer.instance.started_at:
            extra['started_at'] = timezone.now()
        instance = serializer.save(**extra)
        log_action(self.request.user, 'UPDATE', 'WaterLavatoryService', instance.id,
                    f'Updated water/lavatory service: {instance}', self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'WaterLavatoryService', instance.id,
                    f'Deleted water/lavatory service: {instance}', self.request)
        instance.delete()