from rest_framework import serializers
from .models import AIPrediction, AIChatMessage, FlightScheduleUpload


class AIPredictionSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(
        source='created_by.username', read_only=True
    )
    flight_number = serializers.CharField(
        source='flight.flight_number', read_only=True
    )

    class Meta:
        model = AIPrediction
        fields = [
            'id', 'prediction_type', 'flight', 'flight_number',
            'input_data', 'result', 'confidence_score',
            'status', 'created_by', 'created_by_username', 'created_at'
        ]
        read_only_fields = [
            'result',
            'confidence_score',
            'status',
            'created_at']


class AIChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIChatMessage
        fields = ['id', 'role', 'content', 'created_at', 'session_id']
        read_only_fields = ['created_at']


class FlightScheduleUploadSerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.CharField(
        source='uploaded_by.username', read_only=True)

    class Meta:
        model = FlightScheduleUpload
        fields = [
            'id', 'original_filename', 'uploaded_by', 'uploaded_by_username',
            'uploaded_at', 'row_count', 'status', 'error_message',
        ]
        read_only_fields = fields
