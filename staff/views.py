from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Staff, Shift, Schedule
from .serializers import StaffSerializer, ShiftSerializer, ScheduleSerializer
from core_app.utils import log_action
from core_app.permissions import IsAdminUser, IsAuthenticatedReadOnly

class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all().order_by('name')
    serializer_class = StaffSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['staff_type']
    search_fields = ['name', 'email']
    ordering_fields = ['name']
    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'Staff', instance.id, f'Created staff {instance.name}', self.request)
    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'UPDATE', 'Staff', instance.id, f'Updated staff {instance.name}', self.request)
    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'Staff', instance.id, f'Deleted staff {instance.name}', self.request)
        instance.delete()

class ShiftViewSet(viewsets.ModelViewSet):
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['shift_name']
    ordering_fields = ['start_time']
    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'Shift', instance.id, f'Created shift {instance.id}', self.request)
    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'Shift', instance.id, f'Deleted shift {instance.id}', self.request)
        instance.delete()

class ScheduleViewSet(viewsets.ModelViewSet):
    queryset = Schedule.objects.all()
    serializer_class = ScheduleSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['staff', 'shift']
    ordering_fields = ['date']
    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'Schedule', instance.id, f'Created schedule {instance.id}', self.request)
    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'Schedule', instance.id, f'Deleted schedule {instance.id}', self.request)
        instance.delete()
