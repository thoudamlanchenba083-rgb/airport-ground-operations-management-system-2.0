from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Airline, Aircraft, Flight
from .serializers import AirlineSerializer, AircraftSerializer, FlightSerializer
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