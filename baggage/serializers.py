from rest_framework import serializers
from .models import Baggage, BaggageTracking


class BaggageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Baggage
        fields = '__all__'


class BaggageTrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = BaggageTracking
        fields = '__all__'