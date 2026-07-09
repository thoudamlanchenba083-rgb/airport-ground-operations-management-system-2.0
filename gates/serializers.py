from rest_framework import serializers
from .models import Gate, GateAssignment


class GateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gate
        fields = '__all__'


class GateAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = GateAssignment
        fields = '__all__'
