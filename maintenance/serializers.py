from rest_framework import serializers
from .models import MaintenanceRequest, MaintenanceLog


class MaintenanceRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceRequest
        fields = [
            'id', 'aircraft', 'issue_description', 'priority', 'status',
            'reported_by', 'assigned_to', 'approved_by',
            'rejection_reason', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'reported_by', 'approved_by', 'created_at', 'updated_at']


class MaintenanceRequestApprovalSerializer(serializers.Serializer):
    """Used for approve/reject actions only."""
    rejection_reason = serializers.CharField(required=False, allow_blank=True)


class MaintenanceLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceLog
        fields = [
            'id', 'request', 'action_taken',
            'performed_by', 'completed_at',
        ]
        read_only_fields = ['id', 'performed_by']