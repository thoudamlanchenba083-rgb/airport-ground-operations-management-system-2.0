from rest_framework import serializers
from .models import MaintenanceRequest, MaintenanceLog


class MaintenanceRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceRequest
        fields = [
            'id', 'aircraft', 'request_type', 'description',
            'status', 'priority', 'requested_by', 'assigned_to',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'requested_by']


class MaintenanceLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceLog
        fields = [
            'id', 'maintenance_request', 'action', 'performed_by',
            'notes', 'performed_at',
        ]
        read_only_fields = ['id', 'performed_at', 'performed_by']