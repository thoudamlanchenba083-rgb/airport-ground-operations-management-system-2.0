from django.contrib import admin
from .models import AuditLog

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'model_name', 'object_id', 'timestamp', 'ip_address']
    list_filter = ['action', 'model_name', 'timestamp']
    search_fields = ['user__username', 'model_name', 'description']
    readonly_fields = ['user', 'action', 'model_name', 'object_id', 'description', 'timestamp', 'ip_address']

from .models import (
    ApprovalRequest, ApprovalStep, MaintenanceApprovalRequest,
    GateChangeApprovalRequest, FlightDelayApprovalRequest, EmergencyFlightApprovalRequest
)

@admin.register(ApprovalRequest)
class ApprovalRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'request_type', 'status', 'priority', 'flight', 'requested_by', 'created_at']
    list_filter = ['request_type', 'status', 'priority']
    search_fields = ['request_description', 'reason']

@admin.register(ApprovalStep)
class ApprovalStepAdmin(admin.ModelAdmin):
    list_display = ['approval_request', 'approver', 'step_order', 'status', 'approved_at']
    list_filter = ['status']

@admin.register(MaintenanceApprovalRequest)
class MaintenanceApprovalRequestAdmin(admin.ModelAdmin):
    list_display = ['maintenance_request', 'status', 'tech_lead_approved', 'manager_approved']
    list_filter = ['status']

@admin.register(GateChangeApprovalRequest)
class GateChangeApprovalRequestAdmin(admin.ModelAdmin):
    list_display = ['flight', 'old_gate_id', 'new_gate_id', 'status', 'requested_by']
    list_filter = ['status']

@admin.register(FlightDelayApprovalRequest)
class FlightDelayApprovalRequestAdmin(admin.ModelAdmin):
    list_display = ['flight', 'delay_minutes', 'status', 'requested_by']
    list_filter = ['status']

@admin.register(EmergencyFlightApprovalRequest)
class EmergencyFlightApprovalRequestAdmin(admin.ModelAdmin):
    list_display = ['flight', 'severity', 'status', 'requested_by']
    list_filter = ['status', 'severity']
