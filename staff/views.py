from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import ValidationError

from .models import Staff, Shift, Schedule, StaffAssignment
from .serializers import StaffSerializer, ShiftSerializer, ScheduleSerializer, StaffAssignmentSerializer
from core_app.utils import log_action
from core_app.permissions import IsHR, HasRole
from core_app.business_rules import BusinessRuleValidator
from flights.models import Flight


class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all().order_by('name')
    serializer_class = StaffSerializer
    permission_classes = [IsHR]
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
    permission_classes = [IsHR]
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
    permission_classes = [IsHR]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['staff', 'shift']
    ordering_fields = ['date']
    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'Schedule', instance.id, f'Created schedule {instance.id}', self.request)
    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'Schedule', instance.id, f'Deleted schedule {instance.id}', self.request)
        instance.delete()


class StaffAssignmentViewSet(viewsets.ModelViewSet):
    """
    Links a Staff member to a Flight — this is the record
    BusinessRuleValidator.can_assign_staff_to_flight checks for overlap
    conflicts. Separate from TurnaroundTask.assigned_staff, which is just
    a per-task display FK with no conflict checking of its own.
    """
    queryset = StaffAssignment.objects.select_related('staff', 'flight').all()
    serializer_class = StaffAssignmentSerializer
    permission_classes = [HasRole('GROUND_STAFF', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'GATE_MANAGER', 'HR')]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['flight', 'staff']
    ordering_fields = ['assigned_at']

    def perform_create(self, serializer):
        staff = serializer.validated_data['staff']
        flight = serializer.validated_data['flight']

        can_assign, reason = BusinessRuleValidator.can_assign_staff_to_flight(staff, flight)
        if not can_assign:
            raise ValidationError({'staff': reason})

        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'StaffAssignment', instance.id,
                   f'Assigned {staff.name} to flight {flight.flight_number}', self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'StaffAssignment', instance.id,
                   f'Removed staff assignment {instance.id}', self.request)
        instance.delete()

    @action(detail=False, methods=['post'], url_path='auto-assign')
    def auto_assign(self, request):
        """
        POST /api/staff/staff-assignments/auto-assign/
        Body: { "flight": <flight_id>, "staff_type": "GROUND", "turnaround_task": <optional task id> }

        AI Conflict Detection (Phase 2 #3) for staff: picks the first
        active staff member of the requested type with no overlapping
        StaffAssignment for this flight's time window, creates the
        StaffAssignment, and (if turnaround_task is passed) links it to
        that task's assigned_staff field too.
        """
        flight_id = request.data.get('flight')
        staff_type = request.data.get('staff_type', 'GROUND')
        turnaround_task_id = request.data.get('turnaround_task')

        if not flight_id:
            return Response({'error': 'flight is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            flight = Flight.objects.get(id=flight_id)
        except Flight.DoesNotExist:
            return Response({'error': 'Flight not found'}, status=status.HTTP_404_NOT_FOUND)

        candidates = Staff.objects.filter(staff_type=staff_type, is_active=True).order_by('employee_id')
        if not candidates.exists():
            return Response(
                {'error': f'No active staff of type "{staff_type}" exist.'},
                status=status.HTTP_404_NOT_FOUND
            )

        chosen = None
        reasons_tried = []
        for staff in candidates:
            ok, reason = BusinessRuleValidator.can_assign_staff_to_flight(staff, flight)
            if ok:
                chosen = staff
                break
            reasons_tried.append(f'{staff.name}: {reason}')

        if chosen is None:
            return Response(
                {
                    'error': f'All available {staff_type} staff have a scheduling conflict with this flight.',
                    'checked': reasons_tried,
                },
                status=status.HTTP_409_CONFLICT
            )

        instance = StaffAssignment.objects.create(staff=chosen, flight=flight)
        log_action(request.user, 'CREATE', 'StaffAssignment', instance.id,
                   f'Auto-assigned {chosen.name} to flight {flight.flight_number}', request)

        task_updated = None
        if turnaround_task_id:
            from turnaround.models import TurnaroundTask
            try:
                task = TurnaroundTask.objects.get(id=turnaround_task_id, flight=flight)
                task.assigned_staff = chosen
                task.save()
                task_updated = task.id
            except TurnaroundTask.DoesNotExist:
                pass

        return Response({
            'assignment_id': instance.id,
            'assigned_staff': StaffSerializer(chosen).data,
            'turnaround_task_updated': task_updated,
        })