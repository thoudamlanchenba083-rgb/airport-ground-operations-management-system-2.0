from rest_framework import serializers
from .models import Staff, Shift, Schedule, StaffAssignment


class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        fields = '__all__'


class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = '__all__'


class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = '__all__'


class StaffAssignmentSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.name', read_only=True)
    flight_number = serializers.CharField(source='flight.flight_number', read_only=True)

    class Meta:
        model = StaffAssignment
        fields = '__all__'