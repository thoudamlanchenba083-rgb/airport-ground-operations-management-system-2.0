from rest_framework.decorators import action
from .permissions import IsSupervisor
from .serializers import (
    ApprovalRequestSerializer,
    ApprovalStepSerializer,
    MaintenanceApprovalRequestSerializer,
    GateChangeApprovalRequestSerializer,
    FlightDelayApprovalRequestSerializer,
    EmergencyFlightApprovalRequestSerializer)
from .models import (
    ApprovalRequest,
    ApprovalStep,
    MaintenanceApprovalRequest,
    GateChangeApprovalRequest,
    FlightDelayApprovalRequest,
    EmergencyFlightApprovalRequest)
from django.utils import timezone
from rest_framework.response import Response
from rest_framework import viewsets, permissions
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import AuditLog
from .serializers import AuditLogSerializer
from .permissions import IsAdminUser


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['action', 'model_name', 'user']
    search_fields = ['description', 'model_name']
    ordering_fields = ['timestamp']


class ApprovalRequestViewSet(viewsets.ModelViewSet):
    queryset = ApprovalRequest.objects.all()
    serializer_class = ApprovalRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['request_type', 'status', 'priority', 'flight']
    search_fields = ['request_description', 'reason']
    ordering_fields = ['created_at', 'due_date', 'priority']

    @action(detail=True, methods=['post'], permission_classes=[IsSupervisor])
    def approve(self, request, pk=None):
        approval_request = self.get_object()
        step = approval_request.approval_steps.filter(status='pending').order_by('step_order').first()
        if not step:
            return Response(
                {'detail': 'No pending approval step found.'}, status=400)
        step.status = 'approved'
        step.approved_at = timezone.now()
        step.approved_by_notes = request.data.get('notes', '')
        step.save()

        if not approval_request.approval_steps.filter(
                status='pending').exists():
            approval_request.status = 'approved'
            approval_request.save()

        return Response(ApprovalRequestSerializer(approval_request).data)

    @action(detail=True, methods=['post'], permission_classes=[IsSupervisor])
    def reject(self, request, pk=None):
        approval_request = self.get_object()
        step = approval_request.approval_steps.filter(
            status='pending').order_by('step_order').first()
        if step:
            step.status = 'rejected'
            step.approved_at = timezone.now()
            step.approved_by_notes = request.data.get('notes', '')
            step.save()
        approval_request.status = 'rejected'
        approval_request.save()
        return Response(ApprovalRequestSerializer(approval_request).data)


class ApprovalStepViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ApprovalStep.objects.all()
    serializer_class = ApprovalStepSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'approval_request', 'approver']


class MaintenanceApprovalRequestViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceApprovalRequest.objects.all()
    serializer_class = MaintenanceApprovalRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'maintenance_request']

    @action(detail=True, methods=['post'], permission_classes=[IsSupervisor])
    def approve_tech_lead(self, request, pk=None):
        obj = self.get_object()
        staff = getattr(request.user, 'staff_profile', None)
        obj.tech_lead_approved = True
        obj.tech_lead_approved_at = timezone.now()
        obj.tech_lead_approved_by = staff
        if obj.manager_approved:
            obj.status = 'approved'
        obj.save()
        return Response(MaintenanceApprovalRequestSerializer(obj).data)

    @action(detail=True, methods=['post'], permission_classes=[IsSupervisor])
    def approve_manager(self, request, pk=None):
        obj = self.get_object()
        staff = getattr(request.user, 'staff_profile', None)
        obj.manager_approved = True
        obj.manager_approved_at = timezone.now()
        obj.manager_approved_by = staff
        if obj.tech_lead_approved:
            obj.status = 'approved'
        obj.save()
        return Response(MaintenanceApprovalRequestSerializer(obj).data)

    @action(detail=True, methods=['post'], permission_classes=[IsSupervisor])
    def reject(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'rejected'
        obj.rejection_reason = request.data.get('reason', '')
        obj.save()
        return Response(MaintenanceApprovalRequestSerializer(obj).data)


class GateChangeApprovalRequestViewSet(viewsets.ModelViewSet):
    queryset = GateChangeApprovalRequest.objects.all()
    serializer_class = GateChangeApprovalRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'flight']

    @action(detail=True, methods=['post'], permission_classes=[IsSupervisor])
    def approve(self, request, pk=None):
        obj = self.get_object()
        staff = getattr(request.user, 'staff_profile', None)
        obj.status = 'approved'
        obj.approved_by = staff
        obj.approval_date = timezone.now()
        obj.save()
        return Response(GateChangeApprovalRequestSerializer(obj).data)

    @action(detail=True, methods=['post'], permission_classes=[IsSupervisor])
    def reject(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'rejected'
        obj.rejection_reason = request.data.get('reason', '')
        obj.save()
        return Response(GateChangeApprovalRequestSerializer(obj).data)


class FlightDelayApprovalRequestViewSet(viewsets.ModelViewSet):
    queryset = FlightDelayApprovalRequest.objects.all()
    serializer_class = FlightDelayApprovalRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'flight']

    @action(detail=True, methods=['post'], permission_classes=[IsSupervisor])
    def approve(self, request, pk=None):
        obj = self.get_object()
        staff = getattr(request.user, 'staff_profile', None)
        obj.status = 'approved'
        obj.approved_by = staff
        obj.approval_date = timezone.now()
        obj.save()
        return Response(FlightDelayApprovalRequestSerializer(obj).data)

    @action(detail=True, methods=['post'], permission_classes=[IsSupervisor])
    def reject(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'rejected'
        obj.save()
        return Response(FlightDelayApprovalRequestSerializer(obj).data)


class EmergencyFlightApprovalRequestViewSet(viewsets.ModelViewSet):
    queryset = EmergencyFlightApprovalRequest.objects.all()
    serializer_class = EmergencyFlightApprovalRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'flight', 'severity']

    @action(detail=True, methods=['post'], permission_classes=[IsSupervisor])
    def approve(self, request, pk=None):
        obj = self.get_object()
        staff = getattr(request.user, 'staff_profile', None)
        obj.status = 'approved'
        obj.approved_by = staff
        obj.approval_date = timezone.now()
        obj.save()
        return Response(EmergencyFlightApprovalRequestSerializer(obj).data)

    @action(detail=True, methods=['post'], permission_classes=[IsSupervisor])
    def reject(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'rejected'
        obj.save()
        return Response(EmergencyFlightApprovalRequestSerializer(obj).data)
