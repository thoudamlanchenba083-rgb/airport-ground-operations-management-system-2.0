from rest_framework import serializers
from .models import Baggage, BaggageTracking


class BaggageTrackingSerializer(serializers.ModelSerializer):
    updated_by_username = serializers.CharField(
        source='updated_by.username', read_only=True
    )

    class Meta:
        model = BaggageTracking
        fields = '__all__'
        read_only_fields = ['updated_by', 'updated_at']


class BaggageSerializer(serializers.ModelSerializer):
    tracking_history = BaggageTrackingSerializer(many=True, read_only=True)
    current_status = serializers.SerializerMethodField()

    class Meta:
        model = Baggage
        fields = '__all__'

    def validate_weight(self, value):
        if value <= 0:
            raise serializers.ValidationError('Weight must be greater than 0.')
        if value > 100:
            raise serializers.ValidationError('Weight cannot exceed 100kg.')
        return value

    def validate_baggage_tag(self, value):
        return value.upper()

    def get_current_status(self, obj):
        latest = obj.tracking_history.first()
        return latest.status if latest else None
