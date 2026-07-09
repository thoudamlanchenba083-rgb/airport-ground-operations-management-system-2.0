from rest_framework import serializers
from .models import (
    AuditLog,
    ApprovalRequest,
    ApprovalStep,
    MaintenanceApprovalRequest,
    GateChangeApprovalRequest,
    FlightDelayApprovalRequest,
    EmergencyFlightApprovalRequest)


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'username', 'action', 'model_name',
            'object_id', 'description', 'timestamp', 'ip_address'
        ]


class ApprovalStepSerializer(serializers.ModelSerializer):
    approver_name = serializers.CharField(
        source='approver.name', read_only=True)

    class Meta:
        model = ApprovalStep
        fields = [
            'id',
            'approval_request',
            'approver',
            'approver_name',
            'step_order',
            'status',
            'approved_at',
            'approved_by_notes',
            'created_at',
            'updated_at']
        read_only_fields = ['approved_at', 'created_at', 'updated_at']


class ApprovalRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(
        source='requested_by.name', read_only=True)
    flight_number = serializers.CharField(
        source='flight.flight_number', read_only=True)
    approval_steps = ApprovalStepSerializer(many=True, read_only=True)
    is_fully_approved = serializers.BooleanField(read_only=True)

    class Meta:
        model = ApprovalRequest
        fields = [
            'id', 'request_type', 'status', 'request_description', 'reason',
            'flight', 'flight_number', 'requested_by', 'requested_by_name',
            'approval_steps', 'is_fully_approved', 'created_at', 'updated_at',
            'due_date', 'priority'
        ]
        read_only_fields = ['status', 'created_at', 'updated_at']


class MaintenanceApprovalRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceApprovalRequest
        fields = '__all__'
        read_only_fields = ['status', 'created_at', 'updated_at']


class GateChangeApprovalRequestSerializer(serializers.ModelSerializer):
    flight_number = serializers.CharField(
        source='flight.flight_number', read_only=True)

    class Meta:
        model = GateChangeApprovalRequest
        fields = '__all__'
        read_only_fields = [
            'status',
            'approved_by',
            'approval_date',
            'created_at',
            'updated_at']


class FlightDelayApprovalRequestSerializer(serializers.ModelSerializer):
    flight_number = serializers.CharField(
        source='flight.flight_number', read_only=True)

    class Meta:
        model = FlightDelayApprovalRequest
        fields = '__all__'
        read_only_fields = [
            'status',
            'approved_by',
            'approval_date',
            'created_at',
            'updated_at']


class EmergencyFlightApprovalRequestSerializer(serializers.ModelSerializer):
    flight_number = serializers.CharField(
        source='flight.flight_number', read_only=True)

    class Meta:
        model = EmergencyFlightApprovalRequest
        fields = '__all__'
        read_only_fields = [
            'status',
            'approved_by',
            'approval_date',
            'created_at',
            'updated_at']
