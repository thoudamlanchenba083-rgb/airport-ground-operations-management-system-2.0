from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import EquipmentType, GroundEquipment, EquipmentAssignment
from .serializers import EquipmentTypeSerializer, GroundEquipmentSerializer, EquipmentAssignmentSerializer
from django.db import models
from flights.models import Flight
from gates.models import GateAssignment
from core_app.business_rules import BusinessRuleValidator
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

    @action(detail=False, methods=['post'], url_path='auto-assign')
    def auto_assign(self, request):
        """
        POST /api/ground-equipment/equipment/auto-assign/
        Body: { "equipment_type": "fuel_truck", "flight": <flight_id>, "turnaround_task": <optional task id> }

        Smart Equipment Allocation (Phase 1 #2): picks the best available
        unit of the requested type for a flight, without the user manually
        browsing/selecting equipment. Preference order:
          1. Available equipment whose free-text `location` matches the
             flight's currently assigned gate number or terminal.
          2. Any other available equipment of that type.
        Automatically creates the EquipmentAssignment and marks the
        equipment 'in_use'. If a turnaround_task id is passed, also links
        it to that task's assigned_equipment field.
        """
        equipment_type_name = request.data.get('equipment_type')
        flight_id = request.data.get('flight')
        turnaround_task_id = request.data.get('turnaround_task')

        if not equipment_type_name or not flight_id:
            return Response({'error': 'equipment_type and flight are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            equipment_type = EquipmentType.objects.get(name=equipment_type_name)
        except EquipmentType.DoesNotExist:
            return Response({'error': f'Unknown equipment_type "{equipment_type_name}"'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            flight = Flight.objects.get(id=flight_id)
        except Flight.DoesNotExist:
            return Response({'error': 'Flight not found'}, status=status.HTTP_404_NOT_FOUND)

        candidates = GroundEquipment.objects.filter(equipment_type=equipment_type, status='available')
        if not candidates.exists():
            return Response(
                {'error': f'No available {equipment_type.get_name_display()} right now'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Candidates ordered by preference: gate/terminal location match
        # first, then everything else. We then walk this ordered list and
        # pick the first unit that actually clears the existing
        # can_assign_equipment_to_flight business rule (status check +
        # overlapping-flight-time conflict check) rather than trusting the
        # `status` field alone, which can drift out of sync with the real
        # EquipmentAssignment history.
        gate_assignment = GateAssignment.objects.filter(flight=flight, status='assigned').order_by('-assigned_at').first()
        ordered_candidates = []

        if gate_assignment:
            gate = gate_assignment.gate
            location_matches = list(candidates.filter(
                models.Q(location__icontains=gate.gate_number) | models.Q(location__icontains=gate.terminal)
            ).order_by('equipment_id'))
            ordered_candidates.extend((c, 'gate_location_match') for c in location_matches)

        already_added_ids = {c.id for c, _ in ordered_candidates}
        fallback_candidates = candidates.exclude(id__in=already_added_ids).order_by('equipment_id')
        ordered_candidates.extend((c, 'fallback_any_available') for c in fallback_candidates)

        chosen = None
        matched_by = None
        for candidate, reason in ordered_candidates:
            ok, _reason_msg = BusinessRuleValidator.can_assign_equipment_to_flight(candidate, flight)
            if ok:
                chosen = candidate
                matched_by = reason
                break

        if chosen is None:
            return Response(
                {'error': f'All available {equipment_type.get_name_display()} units have a scheduling conflict with this flight.'},
                status=status.HTTP_409_CONFLICT
            )

        EquipmentAssignment.objects.create(equipment=chosen, flight=flight)
        chosen.status = 'in_use'
        chosen.save()

        task_updated = None
        if turnaround_task_id:
            from turnaround.models import TurnaroundTask
            try:
                task = TurnaroundTask.objects.get(id=turnaround_task_id, flight=flight)
                task.assigned_equipment = chosen
                task.save()
                task_updated = task.id
            except TurnaroundTask.DoesNotExist:
                pass

        return Response({
            'assigned_equipment': GroundEquipmentSerializer(chosen).data,
            'matched_by': matched_by,
            'gate': gate_assignment.gate.gate_number if gate_assignment else None,
            'turnaround_task_updated': task_updated,
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
    @action(detail=False, methods=['get'], url_path='health-scores')
    def health_scores(self, request):
        """
        GET /api/ground-equipment/equipment/health-scores/
        Fleet-wide health scores for every unit (respects existing filters,
        e.g. ?status=available or ?equipment_type=3).
        """
        from .health_utils import compute_equipment_health
        qs = self.filter_queryset(self.get_queryset())
        data = [compute_equipment_health(e) for e in qs]
        data.sort(key=lambda d: d['health_score'])
        return Response(data)

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
