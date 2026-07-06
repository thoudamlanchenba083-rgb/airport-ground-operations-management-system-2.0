from django.utils import timezone
from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import CateringCompany, CateringOrder
from .serializers import CateringCompanySerializer, CateringOrderSerializer
from core_app.utils import log_action
from core_app.permissions import HasRole


class CateringCompanyViewSet(viewsets.ModelViewSet):
    queryset = CateringCompany.objects.all()
    serializer_class = CateringCompanySerializer
    permission_classes = [HasRole('OPERATIONS_MANAGER', 'SUPERVISOR')]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name']


class CateringOrderViewSet(viewsets.ModelViewSet):
    queryset = CateringOrder.objects.select_related('flight', 'catering_company').all()
    serializer_class = CateringOrderSerializer
    permission_classes = [HasRole('OPERATIONS_MANAGER', 'SUPERVISOR', 'GROUND_STAFF')]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['flight', 'status', 'meal_type', 'catering_company', 'is_special_meal']
    search_fields = ['flight__flight_number']
    ordering_fields = ['created_at', 'loaded_at']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'CateringOrder', instance.id,
                    f'Created catering order: {instance}', self.request)

    def perform_update(self, serializer):
        extra = {}
        if serializer.validated_data.get('status') == 'LOADED' and not serializer.instance.loaded_at:
            extra['loaded_at'] = timezone.now()
        instance = serializer.save(**extra)
        log_action(self.request.user, 'UPDATE', 'CateringOrder', instance.id,
                    f'Updated catering order: {instance}', self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'CateringOrder', instance.id,
                    f'Deleted catering order: {instance}', self.request)
        instance.delete()