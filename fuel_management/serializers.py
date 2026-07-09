from rest_framework import serializers
from .models import FuelCompany, FuelTruck, FuelOperation


class FuelCompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = FuelCompany
        fields = '__all__'


class FuelTruckSerializer(serializers.ModelSerializer):
    fuel_company_name = serializers.CharField(
        source='fuel_company.name', read_only=True)

    class Meta:
        model = FuelTruck
        fields = '__all__'


class FuelOperationSerializer(serializers.ModelSerializer):
    flight_number = serializers.CharField(
        source='flight.flight_number', read_only=True)
    fuel_truck_code = serializers.CharField(
        source='fuel_truck.truck_code', read_only=True)
    fuel_company_name = serializers.CharField(
        source='fuel_company.name', read_only=True)
    fuel_operator_name = serializers.CharField(
        source='fuel_operator.name', read_only=True)
    duration_minutes = serializers.ReadOnlyField()

    class Meta:
        model = FuelOperation
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def validate_quantity_liters(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                'Quantity must be greater than 0.')
        return value

    def validate(self, data):
        start = data.get(
            'fuel_start_time',
            getattr(
                self.instance,
                'fuel_start_time',
                None))
        end = data.get(
            'fuel_end_time',
            getattr(
                self.instance,
                'fuel_end_time',
                None))
        if start and end and end < start:
            raise serializers.ValidationError(
                'fuel_end_time cannot be before fuel_start_time.')
        return data
