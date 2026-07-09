from rest_framework import serializers
from .models import Incident, IncidentUpdate


class IncidentUpdateSerializer(serializers.ModelSerializer):
    updated_by_name = serializers.CharField(
        source='updated_by.name', read_only=True)

    class Meta:
        model = IncidentUpdate
        fields = '__all__'
        read_only_fields = ['incident', 'created_at']


class IncidentSerializer(serializers.ModelSerializer):
    flight_number = serializers.CharField(
        source='flight.flight_number', read_only=True)
    reported_by_name = serializers.CharField(
        source='reported_by.name', read_only=True)
    assigned_to_name = serializers.CharField(
        source='assigned_to.name', read_only=True)
    updates = IncidentUpdateSerializer(many=True, read_only=True)

    class Meta:
        model = Incident
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        occurred_at = data.get(
            'occurred_at', getattr(
                self.instance, 'occurred_at', None))
        resolved_at = data.get(
            'resolved_at', getattr(
                self.instance, 'resolved_at', None))
        if occurred_at and resolved_at and resolved_at < occurred_at:
            raise serializers.ValidationError(
                'resolved_at cannot be before occurred_at.')

        status = data.get('status', getattr(self.instance, 'status', None))
        if status in ('RESOLVED', 'CLOSED') and not resolved_at:
            raise serializers.ValidationError(
                'resolved_at is required when status is Resolved or Closed.')
        return data
