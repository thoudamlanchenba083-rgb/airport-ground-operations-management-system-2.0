from rest_framework import serializers
from .models import ULD, CargoManifest, CargoItem


class ULDSerializer(serializers.ModelSerializer):
    flight_number = serializers.CharField(source='flight.flight_number', read_only=True)

    class Meta:
        model = ULD
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        weight = data.get('weight_kg', getattr(self.instance, 'weight_kg', 0))
        max_weight = data.get('max_weight_kg', getattr(self.instance, 'max_weight_kg', 0))
        if max_weight and weight and weight > max_weight:
            raise serializers.ValidationError('weight_kg cannot exceed max_weight_kg.')
        return data


class CargoItemSerializer(serializers.ModelSerializer):
    uld_code = serializers.CharField(source='uld.uld_id', read_only=True)

    class Meta:
        model = CargoItem
        fields = '__all__'
        read_only_fields = ['manifest', 'created_at', 'updated_at']

    def validate(self, data):
        is_dg = data.get('is_dangerous_goods', getattr(self.instance, 'is_dangerous_goods', False))
        dg_class = data.get('dangerous_goods_class', getattr(self.instance, 'dangerous_goods_class', ''))
        if is_dg and not dg_class:
            raise serializers.ValidationError('dangerous_goods_class is required when is_dangerous_goods is True.')
        if not is_dg and dg_class:
            raise serializers.ValidationError('dangerous_goods_class must be empty when is_dangerous_goods is False.')
        return data


class CargoManifestSerializer(serializers.ModelSerializer):
    flight_number = serializers.CharField(source='flight.flight_number', read_only=True)
    items = CargoItemSerializer(many=True, read_only=True)

    class Meta:
        model = CargoManifest
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']