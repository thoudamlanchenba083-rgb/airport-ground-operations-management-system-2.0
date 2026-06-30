from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Airline, Aircraft, Flight, FlightWorkflowStep
from .serializers import AirlineSerializer, AircraftSerializer, FlightSerializer, FlightWorkflowStepSerializer
from core_app.utils import log_action
from core_app.permissions import IsAdminUser, IsAuthenticatedReadOnly


class AirlineViewSet(viewsets.ModelViewSet):
    queryset = Airline.objects.all()
    serializer_class = AirlineSerializer
    permission_classes = [IsAuthenticatedReadOnly]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'code']
    ordering_fields = ['name']
    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'Airline', instance.id, f'Created airline {instance.name}', self.request)
    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'UPDATE', 'Airline', instance.id, f'Updated airline {instance.name}', self.request)
    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'Airline', instance.id, f'Deleted airline {instance.name}', self.request)
        instance.delete()


class AircraftViewSet(viewsets.ModelViewSet):
    queryset = Aircraft.objects.all()
    serializer_class = AircraftSerializer
    permission_classes = [IsAuthenticatedReadOnly]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['registration_number', 'aircraft_type']
    ordering_fields = ['aircraft_type']
    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'Aircraft', instance.id, f'Created aircraft {instance.registration_number}', self.request)
    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'UPDATE', 'Aircraft', instance.id, f'Updated aircraft {instance.registration_number}', self.request)
    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'Aircraft', instance.id, f'Deleted aircraft {instance.registration_number}', self.request)
        instance.delete()


class FlightViewSet(viewsets.ModelViewSet):
    queryset = Flight.objects.all().order_by('-departure_time')
    serializer_class = FlightSerializer
    permission_classes = [IsAuthenticatedReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'airline', 'aircraft']
    search_fields = ['flight_number', 'origin', 'destination']
    ordering_fields = ['departure_time', 'arrival_time']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'Flight', instance.id, f'Created flight {instance.flight_number}', self.request)

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'UPDATE', 'Flight', instance.id, f'Updated flight {instance.flight_number}', self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'Flight', instance.id, f'Deleted flight {instance.flight_number}', self.request)
        instance.delete()

    @action(detail=True, methods=['post'], url_path='advance-step')
    def advance_step(self, request, pk=None):
        """
        Moves a flight to the next workflow step, enforcing business rules.
        Body: { "step": "GATE_ASSIGNED", "notes": "optional" }
        """
        flight = self.get_object()
        step = request.data.get('step')
        notes = request.data.get('notes', '')

        valid_steps = dict(FlightWorkflowStep.STEP_CHOICES).keys()
        if step not in valid_steps:
            return Response({'error': f'Invalid step "{step}".'}, status=status.HTTP_400_BAD_REQUEST)

        order = Flight.WORKFLOW_ORDER
        try:
            current_idx = order.index(flight.status)
        except ValueError:
            current_idx = -1
        try:
            target_idx = order.index(step)
        except ValueError:
            return Response({'error': f'"{step}" is not part of the normal workflow.'}, status=status.HTTP_400_BAD_REQUEST)

        # Rule: cannot skip steps - must advance exactly one step at a time
        if target_idx != current_idx + 1:
            return Response(
                {'error': f'Cannot jump to "{step}" from "{flight.status}". Steps must be completed in order.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Rule: cannot assign the same gate to two active flights
        if step == 'GATE_ASSIGNED':
            from gates.models import GateAssignment
            existing = GateAssignment.objects.filter(flight=flight).first()
            if existing:
                conflict = GateAssignment.objects.filter(
                    gate=existing.gate
                ).exclude(flight=flight).filter(
                    flight__status__in=[s for s in order if s != 'DEPARTED']
                ).exists()
                if conflict:
                    return Response(
                        {'error': f'Gate {existing.gate.gate_number} is already assigned to another active flight.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        # Rule: cannot mark maintenance check complete before inspection is approved/resolved
        if step == 'MAINTENANCE_CHECK':
            from maintenance.models import MaintenanceRequest
            open_issues = MaintenanceRequest.objects.filter(
                aircraft=flight.aircraft
            ).exclude(status__in=['RESOLVED', 'CLOSED', 'REJECTED']).exists()
            if open_issues:
                return Response(
                    {'error': 'Aircraft has unresolved maintenance requests. Cannot pass maintenance check.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Rule: cannot start boarding before baggage loading is complete
        if step == 'BOARDING':
            from baggage.models import Baggage, BaggageTracking
            bags = Baggage.objects.filter(flight=flight)
            for bag in bags:
                latest = bag.tracking_history.first()
                if not latest or latest.status not in ['LOADED', 'IN_TRANSIT']:
                    return Response(
                        {'error': f'Baggage {bag.baggage_tag} is not yet loaded. Cannot start boarding.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        # Rule: cannot close gate before boarding has started
        if step == 'GATE_CLOSED' and flight.status != 'BOARDING':
            return Response(
                {'error': 'Gate cannot be closed before boarding is complete.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Rule: cannot depart (takeoff) before gate is closed
        if step == 'DEPARTED' and current_idx + 1 != order.index('DEPARTED'):
            return Response(
                {'error': 'Flight cannot depart before all ground operations steps are complete.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        FlightWorkflowStep.objects.update_or_create(
            flight=flight,
            step=step,
            defaults={
                'completed_by': request.user if request.user.is_authenticated else None,
                'notes': notes,
            }
        )
        flight.status = step
        flight.save(update_fields=['status', 'updated_at'])

        log_action(request.user, 'UPDATE', 'Flight', flight.id,
                   f'Advanced flight {flight.flight_number} to step {step}', request)

        return Response(FlightSerializer(flight).data, status=status.HTTP_200_OK)
