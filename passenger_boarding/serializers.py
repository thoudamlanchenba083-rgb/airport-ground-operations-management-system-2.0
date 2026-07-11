from rest_framework import serializers
from .models import BoardingSession, BoardingGroup


class BoardingGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = BoardingGroup
        fields = '__all__'
        read_only_fields = ['id']


class BoardingSessionSerializer(serializers.ModelSerializer):
    flight_number = serializers.CharField(
        source='flight.flight_number', read_only=True)
    groups = BoardingGroupSerializer(many=True, read_only=True)

    class Meta:
        model = BoardingSession
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        passenger_count = data.get(
            'passenger_count', getattr(
                self.instance, 'passenger_count', None))
        passengers_boarded = data.get(
            'passengers_boarded', getattr(
                self.instance, 'passengers_boarded', 0))
        if passenger_count is not None and passengers_boarded > passenger_count:
            raise serializers.ValidationError(
                'passengers_boarded cannot exceed passenger_count.')

        started_at = data.get(
            'boarding_started_at',
            getattr(
                self.instance,
                'boarding_started_at',
                None))
        completed_at = data.get(
            'boarding_completed_at',
            getattr(
                self.instance,
                'boarding_completed_at',
                None))
        if started_at and completed_at and completed_at < started_at:
            raise serializers.ValidationError(
                'boarding_completed_at cannot be before boarding_started_at.')
        return data
