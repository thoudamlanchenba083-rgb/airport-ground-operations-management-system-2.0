from rest_framework import serializers
from .models import WaterLavatoryService


class WaterLavatoryServiceSerializer(serializers.ModelSerializer):
    flight_number = serializers.CharField(
        source='flight.flight_number', read_only=True)
    assigned_staff_name = serializers.CharField(
        source='assigned_staff.name', read_only=True)
    service_completed = serializers.ReadOnlyField()

    class Meta:
        model = WaterLavatoryService
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def validate_water_quantity_liters(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                'Water quantity cannot be negative.')
        return value

    def validate(self, data):
        started_at = data.get(
            'started_at', getattr(
                self.instance, 'started_at', None))
        completed_at = data.get(
            'completed_at', getattr(
                self.instance, 'completed_at', None))
        if started_at and completed_at and completed_at < started_at:
            raise serializers.ValidationError(
                'completed_at cannot be before started_at.')
        return data
