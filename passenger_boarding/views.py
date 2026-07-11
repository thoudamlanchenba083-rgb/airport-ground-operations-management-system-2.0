from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import BoardingSession, BoardingGroup
from .serializers import BoardingSessionSerializer, BoardingGroupSerializer
from .services import BoardingSessionService
from core_app.utils import log_action
from core_app.permissions import HasRole


class BoardingSessionViewSet(viewsets.ModelViewSet):
    queryset = BoardingSession.objects.select_related(
        'flight').prefetch_related('groups').all()
    serializer_class = BoardingSessionSerializer
    permission_classes = [
        HasRole(
            'OPERATIONS_MANAGER',
            'SUPERVISOR',
            'GATE_MANAGER',
            'GROUND_STAFF')]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['flight', 'status', 'boarding_gate']
    search_fields = ['flight__flight_number', 'boarding_gate']
    ordering_fields = [
        'created_at',
        'boarding_started_at',
        'boarding_completed_at']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'BoardingSession', instance.id,
                   f'Created boarding session: {instance}', self.request)

    def perform_update(self, serializer):
        extra = BoardingSessionService.build_status_timestamps(
            serializer.instance, serializer.validated_data)
        instance = serializer.save(**extra)
        log_action(self.request.user, 'UPDATE', 'BoardingSession', instance.id,
                   f'Updated boarding session: {instance}', self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'BoardingSession', instance.id,
                   f'Deleted boarding session: {instance}', self.request)
        instance.delete()


class BoardingGroupViewSet(viewsets.ModelViewSet):
    queryset = BoardingGroup.objects.select_related('boarding_session').all()
    serializer_class = BoardingGroupSerializer
    permission_classes = [
        HasRole(
            'OPERATIONS_MANAGER',
            'SUPERVISOR',
            'GATE_MANAGER',
            'GROUND_STAFF')]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['boarding_session']
    search_fields = ['group_name']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'BoardingGroup', instance.id,
                   f'Created boarding group: {instance}', self.request)
