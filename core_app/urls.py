from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AuditLogViewSet, ApprovalRequestViewSet, ApprovalStepViewSet,
    MaintenanceApprovalRequestViewSet, GateChangeApprovalRequestViewSet,
    FlightDelayApprovalRequestViewSet, EmergencyFlightApprovalRequestViewSet
)

router = DefaultRouter()
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')
router.register(
    r'approval-requests',
    ApprovalRequestViewSet,
    basename='approvalrequest')
router.register(
    r'approval-steps',
    ApprovalStepViewSet,
    basename='approvalstep')
router.register(
    r'maintenance-approvals',
    MaintenanceApprovalRequestViewSet,
    basename='maintenanceapproval')
router.register(
    r'gate-change-approvals',
    GateChangeApprovalRequestViewSet,
    basename='gatechangeapproval')
router.register(
    r'flight-delay-approvals',
    FlightDelayApprovalRequestViewSet,
    basename='flightdelayapproval')
router.register(
    r'emergency-flight-approvals',
    EmergencyFlightApprovalRequestViewSet,
    basename='emergencyflightapproval')

urlpatterns = [
    path('', include(router.urls)),
]
