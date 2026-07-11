from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import ULD, CargoManifest, CargoItem
from .serializers import ULDSerializer, CargoManifestSerializer, CargoItemSerializer
from .services import ULDService, CargoItemService, CargoManifestService
from core_app.utils import log_action
from core_app.permissions import HasRole


class ULDViewSet(viewsets.ModelViewSet):
    queryset = ULD.objects.select_related('flight').all()
    serializer_class = ULDSerializer
    permission_classes = [
        HasRole(
            'OPERATIONS_MANAGER',
            'SUPERVISOR',
            'CARGO_SUPERVISOR',
            'GROUND_STAFF')]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'uld_type', 'flight']
    search_fields = ['uld_id', 'position']

    def perform_create(self, serializer):
        ULDService.validate_weight(
            weight_kg=serializer.validated_data.get('weight_kg'),
            max_weight_kg=serializer.validated_data.get('max_weight_kg'))
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'ULD', instance.id,
                   f'Created ULD: {instance}', self.request)

    def perform_update(self, serializer):
        weight_kg = serializer.validated_data.get(
            'weight_kg', serializer.instance.weight_kg)
        max_weight_kg = serializer.validated_data.get(
            'max_weight_kg', serializer.instance.max_weight_kg)
        ULDService.validate_weight(weight_kg=weight_kg, max_weight_kg=max_weight_kg)
        instance = serializer.save()
        log_action(self.request.user, 'UPDATE', 'ULD', instance.id,
                   f'Updated ULD: {instance}', self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'ULD', instance.id,
                   f'Deleted ULD: {instance}', self.request)
        instance.delete()


class CargoManifestViewSet(viewsets.ModelViewSet):
    queryset = CargoManifest.objects.select_related(
        'flight').prefetch_related('items').all()
    serializer_class = CargoManifestSerializer
    permission_classes = [
        HasRole(
            'OPERATIONS_MANAGER',
            'SUPERVISOR',
            'CARGO_SUPERVISOR',
            'GROUND_STAFF')]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['flight', 'is_finalized']
    search_fields = ['manifest_number', 'flight__flight_number']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'CargoManifest', instance.id,
                   f'Created cargo manifest: {instance}', self.request)

    def perform_update(self, serializer):
        becoming_finalized = (
            serializer.validated_data.get('is_finalized') is True
            and not serializer.instance.is_finalized
        )
        if becoming_finalized:
            CargoManifestService.validate_finalize(serializer.instance)
        instance = serializer.save()
        log_action(self.request.user, 'UPDATE', 'CargoManifest', instance.id,
                   f'Updated cargo manifest: {instance}', self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'CargoManifest', instance.id,
                   f'Deleted cargo manifest: {instance}', self.request)
        instance.delete()


class CargoItemViewSet(viewsets.ModelViewSet):
    queryset = CargoItem.objects.select_related('manifest', 'uld').all()
    serializer_class = CargoItemSerializer
    permission_classes = [
        HasRole(
            'OPERATIONS_MANAGER',
            'SUPERVISOR',
            'CARGO_SUPERVISOR',
            'GROUND_STAFF')]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['manifest', 'status', 'is_dangerous_goods', 'uld']
    search_fields = ['awb_number', 'description']

    def perform_create(self, serializer):
        CargoItemService.validate_dangerous_goods(
            serializer.validated_data.get('is_dangerous_goods', False),
            serializer.validated_data.get('dangerous_goods_class', ''))
        instance = serializer.save()
        CargoManifestService.recalculate_total_weight(instance.manifest)
        log_action(self.request.user, 'CREATE', 'CargoItem', instance.id,
                   f'Created cargo item: {instance}', self.request)

    def perform_update(self, serializer):
        is_dg = serializer.validated_data.get(
            'is_dangerous_goods', serializer.instance.is_dangerous_goods)
        dg_class = serializer.validated_data.get(
            'dangerous_goods_class', serializer.instance.dangerous_goods_class)
        CargoItemService.validate_dangerous_goods(is_dg, dg_class)
        instance = serializer.save()
        CargoManifestService.recalculate_total_weight(instance.manifest)
        log_action(self.request.user, 'UPDATE', 'CargoItem', instance.id,
                   f'Updated cargo item: {instance}', self.request)

    def perform_destroy(self, instance):
        manifest = instance.manifest
        log_action(self.request.user, 'DELETE', 'CargoItem', instance.id,
                   f'Deleted cargo item: {instance}', self.request)
        instance.delete()
        CargoManifestService.recalculate_total_weight(manifest)
