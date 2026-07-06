from rest_framework import serializers
from .models import EquipmentType, GroundEquipment, EquipmentAssignment

class EquipmentTypeSerializer(serializers.ModelSerializer):
    name_display = serializers.CharField(source='get_name_display', read_only=True)

    class Meta:
        model = EquipmentType
        fields = ['id', 'name', 'name_display', 'description']

class GroundEquipmentSerializer(serializers.ModelSerializer):
    equipment_type_display = serializers.CharField(source='equipment_type.get_name_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = GroundEquipment
        fields = ['id', 'equipment_type', 'equipment_type_display', 'equipment_id', 'status', 
                  'status_display', 'location', 'last_maintenance', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class EquipmentAssignmentSerializer(serializers.ModelSerializer):
    equipment_display = serializers.CharField(source='__str__', read_only=True)
    
    class Meta:
        model = EquipmentAssignment
        fields = ['id', 'equipment', 'equipment_display', 'flight', 'assigned_at', 'released_at']
        read_only_fields = ['assigned_at']
