from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import EquipmentType, GroundEquipment, EquipmentAssignment
from .serializers import EquipmentTypeSerializer, GroundEquipmentSerializer, EquipmentAssignmentSerializer
from ai_module.ml.predictor import predict_equipment_failure
from core_app.permissions import IsAuthenticatedBlockGroundStaffWrite
class EquipmentTypeViewSet(viewsets.ModelViewSet):
    queryset = EquipmentType.objects.all()
    serializer_class = EquipmentTypeSerializer
    permission_classes = [IsAuthenticatedBlockGroundStaffWrite]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']

class GroundEquipmentViewSet(viewsets.ModelViewSet):
    queryset = GroundEquipment.objects.all()
    serializer_class = GroundEquipmentSerializer
    permission_classes = [IsAuthenticatedBlockGroundStaffWrite]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'equipment_type', 'location']
    search_fields = ['equipment_id', 'location']
    ordering_fields = ['created_at', 'last_maintenance']
    
    @action(detail=True, methods=['post'])
    def release_equipment(self, request, pk=None):
        """Release equipment from assigned flight"""
        equipment = self.get_object()
        assignment = EquipmentAssignment.objects.filter(
            equipment=equipment,
            released_at__isnull=True
        ).first()
        
        if not assignment:
            return Response(
                {'error': 'No active assignment found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        assignment.released_at = timezone.now()
        assignment.save()
        equipment.status = 'available'
        equipment.save()
        
        return Response({
            'message': 'Equipment released successfully',
            'equipment': GroundEquipmentSerializer(equipment).data
        })
    
    @action(detail=True, methods=['get'])
    def predict_failure(self, request, pk=None):
        """Predict failure risk / maintenance need for this equipment"""
        equipment = self.get_object()
        result, confidence = predict_equipment_failure(equipment)
        return Response({
            'equipment': GroundEquipmentSerializer(equipment).data,
            'prediction': result,
            'confidence': confidence,
        })

class EquipmentAssignmentViewSet(viewsets.ModelViewSet):
    queryset = EquipmentAssignment.objects.all()
    serializer_class = EquipmentAssignmentSerializer
    permission_classes = [IsAuthenticatedBlockGroundStaffWrite]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['equipment', 'flight']
    ordering_fields = ['assigned_at', 'released_at']
    
    def perform_create(self, serializer):
        """Override create to update equipment status"""
        assignment = serializer.save()
        equipment = assignment.equipment
        equipment.status = 'in_use'
        equipment.save()
    
    @action(detail=True, methods=['post'])
    def release(self, request, pk=None):
        """Release assignment"""
        assignment = self.get_object()
        assignment.released_at = timezone.now()
        assignment.save()
        
        equipment = assignment.equipment
        equipment.status = 'available'
        equipment.save()
        
        return Response({
            'message': 'Assignment released',
            'assignment': EquipmentAssignmentSerializer(assignment).data
        })
