from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Baggage, BaggageTracking
from .serializers import BaggageSerializer, BaggageTrackingSerializer
from core_app.utils import log_action
from core_app.permissions import IsAdminUser, IsAuthenticatedReadOnly

class BaggageViewSet(viewsets.ModelViewSet):
    queryset = Baggage.objects.all()
    serializer_class = BaggageSerializer
    permission_classes = [IsAuthenticatedReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['flight']
    search_fields = ['tag_number']
    ordering_fields = ['created_at']
    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'Baggage', instance.id, f'Created baggage: {instance.id}')
    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'UPDATE', 'Baggage', instance.id, f'Updated baggage: {instance.id}')
    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'Baggage', instance.id, f'Deleted baggage: {instance.id}')
        instance.delete()

class BaggageTrackingViewSet(viewsets.ModelViewSet):
    queryset = BaggageTracking.objects.all()
    serializer_class = BaggageTrackingSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['baggage']
    search_fields = ['location']
    ordering_fields = ['timestamp']
    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'BaggageTracking', instance.id, f'Created baggage tracking: {instance.id}')
    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'UPDATE', 'BaggageTracking', instance.id, f'Updated baggage tracking: {instance.id}')
    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'BaggageTracking', instance.id, f'Deleted baggage tracking: {instance.id}')
        instance.delete()
