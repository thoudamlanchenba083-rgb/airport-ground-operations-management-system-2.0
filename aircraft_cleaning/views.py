from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import CleaningTask
from .serializers import CleaningTaskSerializer
from .services import CleaningTaskService
from core_app.utils import log_action
from core_app.permissions import HasRole


class CleaningTaskViewSet(viewsets.ModelViewSet):
    queryset = CleaningTask.objects.select_related(
        'flight', 'assigned_staff').all()
    serializer_class = CleaningTaskSerializer
    permission_classes = [
        HasRole(
            'OPERATIONS_MANAGER',
            'SUPERVISOR',
            'CLEANING_SUPERVISOR',
            'GROUND_STAFF')]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['flight', 'status', 'cabin_ready']
    search_fields = ['flight__flight_number']
    ordering_fields = ['created_at', 'started_at', 'completed_at']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'CleaningTask', instance.id,
                   f'Created cleaning task: {instance}', self.request)

    def perform_update(self, serializer):
        extra = CleaningTaskService.build_status_timestamps(
            serializer.instance, serializer.validated_data)
        instance = serializer.save(**extra)
        log_action(self.request.user, 'UPDATE', 'CleaningTask', instance.id,
                   f'Updated cleaning task: {instance}', self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'CleaningTask', instance.id,
                   f'Deleted cleaning task: {instance}', self.request)
        instance.delete()
