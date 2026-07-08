from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Airline, Aircraft, Flight, FlightWorkflowStep
from .serializers import AirlineSerializer, AircraftSerializer, FlightSerializer, FlightWorkflowStepSerializer
from .services import FlightWorkflowService, FlightWorkflowError
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

        try:
            flight = FlightWorkflowService.advance_step(flight, step, notes, request.user)
        except FlightWorkflowError as e:
            return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)

        log_action(request.user, 'UPDATE', 'Flight', flight.id,
                   f'Advanced flight {flight.flight_number} to step {step}', request)

        return Response(FlightSerializer(flight).data, status=status.HTTP_200_OK)