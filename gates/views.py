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
from .services import GateAssignmentService, GateAssignmentError
from flights.models import Flight

logger = logging.getLogger('gates')


class GateViewSet(viewsets.ModelViewSet):
    queryset = Gate.objects.all()
    serializer_class = GateSerializer
    permission_classes = [IsGateManager]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = [
        'is_available', 'terminal', 'gate_type',
        'connection_type', 'body_type', 'purpose',
    ]
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

        try:
            instance = GateAssignmentService.assign(
                gate, flight, self.request.user)
        except GateAssignmentError as e:
            raise ValidationError({'gate': e.message})

        log_action(
            self.request.user,
            'CREATE',
            'GateAssignment',
            instance.id,
            f'Assigned gate {gate.gate_number} to flight {instance.flight}',
            self.request)

    def perform_destroy(self, instance):
        GateAssignmentService.release(instance)
        log_action(self.request.user, 'DELETE', 'GateAssignment', instance.id,
                   f'Removed gate assignment {instance.id}', self.request)
        instance.delete()

    @action(detail=False, methods=['post'], url_path='auto-assign')
    def auto_assign(self, request):
        """
        POST /api/gates/gate-assignments/auto-assign/
        Body: { "flight": <flight_id> }
        """
        flight_id = request.data.get('flight')
        if not flight_id:
            return Response({'error': 'flight is required'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            flight = Flight.objects.get(id=flight_id)
        except Flight.DoesNotExist:
            return Response({'error': 'Flight not found'},
                            status=status.HTTP_404_NOT_FOUND)

        try:
            instance = GateAssignmentService.auto_assign(flight, request.user)
        except GateAssignmentError as e:
            return Response(
                {'error': e.message, 'checked': e.details},
                status=status.HTTP_409_CONFLICT
            )

        log_action(
            request.user,
            'CREATE',
            'GateAssignment',
            instance.id,
            f'Auto-assigned gate {instance.gate.gate_number} to flight {flight.flight_number}',
            request)

        return Response({
            'assignment_id': instance.id,
            'assigned_gate': GateSerializer(instance.gate).data,
            'flight': flight.flight_number,
        })
