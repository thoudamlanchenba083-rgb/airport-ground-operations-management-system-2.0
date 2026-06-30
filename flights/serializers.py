from rest_framework import serializers
from .models import Airline, Aircraft, Flight, FlightWorkflowStep


class AirlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Airline
        fields = '__all__'
    def validate_code(self, value):
        if not value.isupper():
            raise serializers.ValidationError('Airline code must be uppercase.')
        if len(value) < 2:
            raise serializers.ValidationError('Airline code must be at least 2 characters.')
        return value


class AircraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Aircraft
        fields = '__all__'
    def validate_capacity(self, value):
        if value <= 0:
            raise serializers.ValidationError('Capacity must be greater than 0.')
        return value
    def validate_registration_number(self, value):
        if len(value) < 4:
            raise serializers.ValidationError('Registration number must be at least 4 characters.')
        return value.upper()


class FlightWorkflowStepSerializer(serializers.ModelSerializer):
    step_display = serializers.CharField(source='get_step_display', read_only=True)
    completed_by_username = serializers.CharField(source='completed_by.username', read_only=True)

    class Meta:
        model = FlightWorkflowStep
        fields = ['id', 'flight', 'step', 'step_display', 'completed_by', 'completed_by_username', 'completed_at', 'notes']
        read_only_fields = ['completed_by', 'completed_at']


class FlightSerializer(serializers.ModelSerializer):
    airline_name = serializers.CharField(source='airline.name', read_only=True)
    aircraft_type = serializers.CharField(source='aircraft.aircraft_type', read_only=True)
    workflow_steps = FlightWorkflowStepSerializer(many=True, read_only=True)
    next_step = serializers.SerializerMethodField()

    class Meta:
        model = Flight
        fields = '__all__'

    def validate_flight_number(self, value):
        return value.upper()

    def validate(self, data):
        departure = data.get('departure_time')
        arrival = data.get('arrival_time')
        if departure and arrival and departure >= arrival:
            raise serializers.ValidationError(
                {'arrival_time': 'Arrival time must be after departure time.'}
            )
        return data

    def get_next_step(self, obj):
        order = Flight.WORKFLOW_ORDER
        try:
            idx = order.index(obj.status)
        except ValueError:
            return None
        if idx + 1 < len(order):
            return order[idx + 1]
        return None
