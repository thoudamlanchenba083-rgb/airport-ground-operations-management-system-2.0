from rest_framework import serializers
from .models import RampInspection, PushbackOperation


class RampInspectionSerializer(serializers.ModelSerializer):
    flight_number = serializers.CharField(source='flight.flight_number', read_only=True)
    inspector_name = serializers.CharField(source='inspector.name', read_only=True)

    class Meta:
        model = RampInspection
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        status = data.get('status', getattr(self.instance, 'status', None))
        cone_ok = data.get('cone_placement_ok', getattr(self.instance, 'cone_placement_ok', False))
        zone_ok = data.get('safety_zone_clear', getattr(self.instance, 'safety_zone_clear', False))
        fod_ok = data.get('fod_check_clear', getattr(self.instance, 'fod_check_clear', False))

        if status == 'PASSED' and not (cone_ok and zone_ok and fod_ok):
            raise serializers.ValidationError(
                'All checks (cone placement, safety zone, FOD) must be clear before marking as Passed.'
            )
        return data


class PushbackOperationSerializer(serializers.ModelSerializer):
    flight_number = serializers.CharField(source='flight.flight_number', read_only=True)
    marshaller_name = serializers.CharField(source='marshaller.name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.name', read_only=True)

    class Meta:
        model = PushbackOperation
        fields = '__all__'
        read_only_fields = ['requested_at']

    def validate(self, data):
        status = data.get('status', getattr(self.instance, 'status', None))
        approved_by = data.get('approved_by', getattr(self.instance, 'approved_by', None))

        if status in ('IN_PROGRESS', 'COMPLETED') and not approved_by:
            raise serializers.ValidationError(
                'approved_by is required before pushback can be In Progress or Completed.'
            )
        return data