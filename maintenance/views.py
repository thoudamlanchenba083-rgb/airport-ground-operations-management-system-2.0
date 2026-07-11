from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import MaintenanceRequest, MaintenanceLog
from .serializers import (
    MaintenanceRequestSerializer,
    MaintenanceRequestApprovalSerializer,
    MaintenanceLogSerializer,
)
from .services import MaintenanceApprovalService
from core_app.utils import log_action
from core_app.permissions import IsAdminUser, IsMaintenanceStaff


class MaintenanceRequestViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRequest.objects.all().order_by('-created_at')
    serializer_class = MaintenanceRequestSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['aircraft', 'priority', 'status']
    search_fields = ['issue_description']
    ordering_fields = ['created_at', 'priority']

    def get_permissions(self):
        if self.action in [
            'list',
            'retrieve',
            'create',
            'update',
            'partial_update',
            'destroy',
            'approve',
            'reject',
                'start']:
            return [IsMaintenanceStaff()]
        return [IsAdminUser()]

    def perform_create(self, serializer):
        instance = serializer.save(
            reported_by=self.request.user,
            status='PENDING_APPROVAL',
        )
        log_action(
            self.request.user,
            'CREATE',
            'MaintenanceRequest',
            instance.id,
            f'Created maintenance request: {instance.id}',
            self.request)

    # Transitions that must go through the dedicated approve/reject/start
    # actions (role-restricted + carry their own business rules/emails).
    # Direct PATCH/PUT to /status is otherwise open to any IsMaintenanceStaff
    # user (e.g. MAINTENANCE_ENGINEER, GROUND_STAFF) and must not be used to
    # bypass the supervisor/admin-only approval gate.
    RESTRICTED_STATUS_TRANSITIONS = {
        ('PENDING_APPROVAL', 'APPROVED'),
        ('PENDING_APPROVAL', 'REJECTED'),
        ('APPROVED', 'IN_PROGRESS'),
    }

    def perform_update(self, serializer):
        new_status = serializer.validated_data.get('status')
        if new_status is not None:
            MaintenanceApprovalService.validate_direct_status_change(
                serializer.instance.status, new_status, self.request.user,
                self.RESTRICTED_STATUS_TRANSITIONS)
        instance = serializer.save()
        log_action(
            self.request.user,
            'UPDATE',
            'MaintenanceRequest',
            instance.id,
            f'Updated maintenance request: {instance.id}',
            self.request)

    def perform_destroy(self, instance):
        log_action(
            self.request.user,
            'DELETE',
            'MaintenanceRequest',
            instance.id,
            f'Deleted maintenance request: {instance.id}',
            self.request)
        instance.delete()

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """SUPERVISOR, OPERATIONS_MANAGER or ADMIN can approve a pending request."""
        instance = MaintenanceApprovalService.approve(
            self.get_object(), request.user)
        from core_app.email_utils import send_maintenance_approved_email
        send_maintenance_approved_email(instance)
        log_action(request.user, 'UPDATE', 'MaintenanceRequest', instance.id,
                   f'Approved maintenance request: {instance.id}', request)
        return Response(MaintenanceRequestSerializer(instance).data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """SUPERVISOR, OPERATIONS_MANAGER or ADMIN can reject a pending request."""
        serializer = MaintenanceRequestApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = MaintenanceApprovalService.reject(
            self.get_object(), request.user,
            serializer.validated_data.get('rejection_reason', ''))
        from core_app.email_utils import send_maintenance_rejected_email
        send_maintenance_rejected_email(instance)
        log_action(request.user, 'UPDATE', 'MaintenanceRequest', instance.id,
                   f'Rejected maintenance request: {instance.id}', request)
        return Response(MaintenanceRequestSerializer(instance).data)

    @action(detail=True, methods=['post'], url_path='start')
    def start(self, request, pk=None):
        """Move an APPROVED request to IN_PROGRESS."""
        instance = MaintenanceApprovalService.start(
            self.get_object(), request.user)
        log_action(request.user, 'UPDATE', 'MaintenanceRequest', instance.id,
                   f'Started maintenance request: {instance.id}', request)
        return Response(MaintenanceRequestSerializer(instance).data)


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
