from rest_framework import serializers
from .models import CateringCompany, CateringOrder


class CateringCompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = CateringCompany
        fields = '__all__'


class CateringOrderSerializer(serializers.ModelSerializer):
    flight_number = serializers.CharField(source='flight.flight_number', read_only=True)
    catering_company_name = serializers.CharField(source='catering_company.name', read_only=True)

    class Meta:
        model = CateringOrder
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def validate_meal_count(self, value):
        if value < 0:
            raise serializers.ValidationError('Meal count cannot be negative.')
        return value

    def validate(self, data):
        loading_completed = data.get(
            'loading_completed', getattr(self.instance, 'loading_completed', False)
        )
        status = data.get('status', getattr(self.instance, 'status', None))
        if loading_completed and status != 'LOADED':
            raise serializers.ValidationError(
                'status must be LOADED when loading_completed is True.'
            )
        return data