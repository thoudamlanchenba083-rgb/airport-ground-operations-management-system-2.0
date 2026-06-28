from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import ValidationError
from .models import Gate, GateAssignment
from .serializers import GateSerializer, GateAssignmentSerializer
from core_app.utils import log_action
from core_app.permissions import IsAdminUser, IsAuthenticatedReadOnly


class GateViewSet(viewsets.ModelViewSet):
    queryset = Gate.objects.all()
    serializer_class = GateSerializer
    permission_classes = [IsAuthenticatedReadOnly]
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
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['flight', 'gate']
    ordering_fields = ['assigned_at']

    def perform_create(self, serializer):
        gate = serializer.validated_data['gate']
        if not gate.is_available:
            raise ValidationError(
                {'gate': f'Gate {gate.gate_number} is not available.'}
            )
        instance = serializer.save()
        gate.is_available = False
        gate.save()
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