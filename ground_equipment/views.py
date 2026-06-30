from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import EquipmentType, GroundEquipment, EquipmentAssignment
from .serializers import EquipmentTypeSerializer, GroundEquipmentSerializer, EquipmentAssignmentSerializer

class EquipmentTypeViewSet(viewsets.ModelViewSet):
    queryset = EquipmentType.objects.all()
    serializer_class = EquipmentTypeSerializer
    permission_classes = [IsAuthenticated]

class GroundEquipmentViewSet(viewsets.ModelViewSet):
    queryset = GroundEquipment.objects.all()
    serializer_class = GroundEquipmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        status_filter = self.request.query_params.get('status')
        if status_filter:
            return GroundEquipment.objects.filter(status=status_filter)
        return GroundEquipment.objects.all()
    
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
    
    @action(detail=True, methods=['post'])
    def mark_maintenance(self, request, pk=None):
        """Mark equipment for maintenance"""
        equipment = self.get_object()
        equipment.status = 'maintenance'
        equipment.save()
        
        return Response({
            'message': 'Equipment marked for maintenance',
            'equipment': GroundEquipmentSerializer(equipment).data
        })

class EquipmentAssignmentViewSet(viewsets.ModelViewSet):
    queryset = EquipmentAssignment.objects.all()
    serializer_class = EquipmentAssignmentSerializer
    permission_classes = [IsAuthenticated]
    
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
