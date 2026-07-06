from rest_framework import serializers
from .models import CleaningTask


class CleaningTaskSerializer(serializers.ModelSerializer):
    flight_number = serializers.CharField(source='flight.flight_number', read_only=True)
    assigned_staff_name = serializers.CharField(source='assigned_staff.name', read_only=True)
    cabin_ready = serializers.BooleanField(read_only=True)

    class Meta:
        model = CleaningTask
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'cabin_ready']

    def validate(self, data):
        started_at = data.get('started_at', getattr(self.instance, 'started_at', None))
        completed_at = data.get('completed_at', getattr(self.instance, 'completed_at', None))
        if started_at and completed_at and completed_at < started_at:
            raise serializers.ValidationError('completed_at cannot be before started_at.')
        return data