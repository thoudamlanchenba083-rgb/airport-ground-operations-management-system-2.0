from rest_framework import serializers
from .models import TurnaroundTask
from .services import TurnaroundTaskService


class TurnaroundTaskSerializer(serializers.ModelSerializer):
    flight_number = serializers.CharField(
        source='flight.flight_number', read_only=True)
    assigned_staff_name = serializers.CharField(
        source='assigned_staff.name', read_only=True)
    completed_by_username = serializers.CharField(
        source='completed_by.username', read_only=True)
    assigned_equipment_label = serializers.CharField(
        source='assigned_equipment.equipment_id', read_only=True)
    assigned_equipment_type = serializers.CharField(
        source='assigned_equipment.equipment_type.name', read_only=True)
    delay_reason_display = serializers.CharField(
        source='get_delay_reason_display', read_only=True)
    duration_minutes = serializers.ReadOnlyField()

    class Meta:
        model = TurnaroundTask
        fields = '__all__'
        read_only_fields = ['completed_by', 'created_at', 'updated_at']

    def validate(self, data):
        start = data.get(
            'actual_start_time',
            getattr(
                self.instance,
                'actual_start_time',
                None))
        end = data.get(
            'actual_end_time',
            getattr(
                self.instance,
                'actual_end_time',
                None))
        if start and end and end < start:
            raise serializers.ValidationError(
                'actual_end_time cannot be before actual_start_time.')

        flight = data.get('flight', getattr(self.instance, 'flight', None))
        task_type = data.get(
            'task_type', getattr(self.instance, 'task_type', None))
        if flight and task_type:
            TurnaroundTaskService.validate_task_type_for_flight(
                flight, task_type,
                exclude_pk=self.instance.pk if self.instance else None)

        return data
