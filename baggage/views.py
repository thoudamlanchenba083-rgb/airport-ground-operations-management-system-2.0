from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Baggage, BaggageTracking
from .serializers import BaggageSerializer, BaggageTrackingSerializer
from core_app.utils import log_action
from core_app.permissions import IsBaggageSupervisor


class BaggageViewSet(viewsets.ModelViewSet):
    queryset = Baggage.objects.all()
    serializer_class = BaggageSerializer
    permission_classes = [IsBaggageSupervisor]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['flight']
    search_fields = ['baggage_tag', 'passenger_name']
    ordering_fields = ['flight']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'Baggage', instance.id,
                   f'Created baggage: {instance.baggage_tag}', self.request)

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'UPDATE', 'Baggage', instance.id,
                   f'Updated baggage: {instance.baggage_tag}', self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'Baggage', instance.id,
                   f'Deleted baggage: {instance.baggage_tag}', self.request)
        instance.delete()


class BaggageTrackingViewSet(viewsets.ModelViewSet):
    queryset = BaggageTracking.objects.all()
    serializer_class = BaggageTrackingSerializer
    permission_classes = [IsBaggageSupervisor]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['baggage', 'status']
    search_fields = ['status', 'location']
    ordering_fields = ['updated_at']

    def perform_create(self, serializer):
        instance = serializer.save(updated_by=self.request.user)
        log_action(
            self.request.user,
            'CREATE',
            'BaggageTracking',
            instance.id,
            f'Tracking update: {instance.baggage.baggage_tag} -> {instance.status}',
            self.request)

    def perform_update(self, serializer):
        instance = serializer.save(updated_by=self.request.user)
        log_action(self.request.user, 'UPDATE', 'BaggageTracking', instance.id,
                   f'Tracking updated: {instance.id}', self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'BaggageTracking', instance.id,
                   f'Deleted tracking: {instance.id}', self.request)
        instance.delete()
