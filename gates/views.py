import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import ValidationError

from .models import Gate, GateAssignment
from .serializers import GateSerializer, GateAssignmentSerializer
from core_app.utils import log_action
from core_app.permissions import IsGateManager
from core_app.business_rules import BusinessRuleValidator
from flights.models import Flight

logger = logging.getLogger('gates')


class GateViewSet(viewsets.ModelViewSet):
    queryset = Gate.objects.all()
    serializer_class = GateSerializer
    permission_classes = [IsGateManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_available', 'terminal']
    search_fields = ['gate_number', 'terminal']
    ordering_fields = ['gate_number']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'Gate', instance.id,
                   f'Created gate {instance.gate_number}', self.request)

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'UPDATE', 'Gate', instance.id,
                   f'Updated gate {instance.gate_number}', self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'Gate', instance.id,
                   f'Deleted gate {instance.gate_number}', self.request)
        instance.delete()


class GateAssignmentViewSet(viewsets.ModelViewSet):
    queryset = GateAssignment.objects.all()
    serializer_class = GateAssignmentSerializer
    permission_classes = [IsGateManager]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['flight', 'gate']
    ordering_fields = ['assigned_at']

    def perform_create(self, serializer):
        gate = serializer.validated_data['gate']
        flight = serializer.validated_data['flight']

        # Full conflict check (Phase 2 #3 — AI Conflict Detection), not just
        # the is_available flag: time overlap, domestic/international
        # mismatch, aircraft-vs-gate size, and maintenance status.
        can_assign, reason = BusinessRuleValidator.can_assign_gate_to_flight(gate, flight)
        if not can_assign:
            logger.warning(
                f"Gate assignment failed: {reason} (attempted by {self.request.user})"
            )
            raise ValidationError({'gate': reason})

        instance = serializer.save()
        gate.is_available = False
        gate.save()
        logger.info(
            f"Gate {gate.gate_number} assigned to flight {instance.flight} "
            f"by {self.request.user}"
        )
        log_action(self.request.user, 'CREATE', 'GateAssignment', instance.id,
                   f'Assigned gate {gate.gate_number} to flight {instance.flight}',
                   self.request)

    def perform_destroy(self, instance):
        gate = instance.gate
        gate.is_available = True
        gate.save()
        log_action(self.request.user, 'DELETE', 'GateAssignment', instance.id,
                   f'Removed gate assignment {instance.id}', self.request)
        instance.delete()

    @action(detail=False, methods=['post'], url_path='auto-assign')
    def auto_assign(self, request):
        """
        POST /api/gates/gate-assignments/auto-assign/
        Body: { "flight": <flight_id> }

        AI Gate Recommendation (Phase 2 #4) + Conflict Detection (Phase 2 #3):
        picks the best available gate for a flight without the user manually
        browsing/selecting one. Candidates are filtered to matching
        gate_type + available + not-under-maintenance, ordered smallest-fit
        first (keeps larger gates free for bigger aircraft), then each is
        walked through the full BusinessRuleValidator check (this also
        catches time-overlap conflicts the initial filter can't).
        """
        flight_id = request.data.get('flight')
        if not flight_id:
            return Response({'error': 'flight is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            flight = Flight.objects.get(id=flight_id)
        except Flight.DoesNotExist:
            return Response({'error': 'Flight not found'}, status=status.HTTP_404_NOT_FOUND)

        candidates = Gate.objects.filter(
            is_available=True,
            is_under_maintenance=False,
            gate_type=flight.flight_type,
        ).order_by('width', 'length', 'gate_number')

        chosen = None
        reasons_tried = []
        for gate in candidates:
            ok, reason = BusinessRuleValidator.can_assign_gate_to_flight(gate, flight)
            if ok:
                chosen = gate
                break
            reasons_tried.append(f'{gate.gate_number}: {reason}')

        if chosen is None:
            return Response(
                {
                    'error': f'No available {flight.get_flight_type_display()} gate currently fits this flight without a conflict.',
                    'checked': reasons_tried,
                },
                status=status.HTTP_409_CONFLICT
            )

        instance = GateAssignment.objects.create(flight=flight, gate=chosen)
        chosen.is_available = False
        chosen.save()
        logger.info(
            f"Gate {chosen.gate_number} auto-assigned to flight {flight.flight_number} "
            f"by {request.user}"
        )
        log_action(request.user, 'CREATE', 'GateAssignment', instance.id,
                   f'Auto-assigned gate {chosen.gate_number} to flight {flight.flight_number}',
                   request)

        return Response({
            'assignment_id': instance.id,
            'assigned_gate': GateSerializer(chosen).data,
            'flight': flight.flight_number,
        })