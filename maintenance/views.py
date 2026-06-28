from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import MaintenanceRequest, MaintenanceLog
from .serializers import MaintenanceRequestSerializer, MaintenanceLogSerializer
from core_app.utils import log_action
from core_app.permissions import IsAdminUser, IsAuthenticatedReadOnly, IsMaintenanceStaff


class MaintenanceRequestViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRequest.objects.all()
    serializer_class = MaintenanceRequestSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['aircraft', 'priority', 'status']
    search_fields = ['issue_description']
    ordering_fields = ['created_at', 'priority']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsMaintenanceStaff()]
        return [IsAdminUser()]

    def perform_create(self, serializer):
        instance = serializer.save(reported_by=self.request.user)
        log_action(self.request.user, 'CREATE', 'MaintenanceRequest', instance.id,
                   f'Created maintenance request: {instance.id}', self.request)

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'UPDATE', 'MaintenanceRequest', instance.id,
                   f'Updated maintenance request: {instance.id}', self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'MaintenanceRequest', instance.id,
                   f'Deleted maintenance request: {instance.id}', self.request)
        instance.delete()


class MaintenanceLogViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceLog.objects.all()
    serializer_class = MaintenanceLogSerializer
    permission_classes = [IsMaintenanceStaff]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['request']
    ordering_fields = ['completed_at']

    def perform_create(self, serializer):
        instance = serializer.save(performed_by=self.request.user)
        log_action(self.request.user, 'CREATE', 'MaintenanceLog', instance.id,
                   f'Created maintenance log: {instance.id}', self.request)

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'UPDATE', 'MaintenanceLog', instance.id,
                   f'Updated maintenance log: {instance.id}', self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'MaintenanceLog', instance.id,
                   f'Deleted maintenance log: {instance.id}', self.request)
        instance.delete()