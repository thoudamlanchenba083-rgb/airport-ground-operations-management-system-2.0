from rest_framework import serializers
from .models import Airline, Aircraft, Flight


class AirlineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Airline
        fields = '__all__'


class AircraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Aircraft
        fields = '__all__'


class FlightSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flight
        fields = '__all__'