"""
Business logic for staff-to-flight assignment — kept separate from views.py.
Wraps core_app.business_rules.BusinessRuleValidator with the actual
assignment creation and auto-assignment candidate selection.
"""
from .models import Staff, StaffAssignment
from core_app.business_rules import BusinessRuleValidator


class StaffAssignmentError(Exception):
    """Raised when a staff assignment/auto-assignment cannot be completed."""
    def __init__(self, message, details=None):
        self.message = message
        self.details = details or []
        super().__init__(message)


class StaffAssignmentService:

    @staticmethod
    def assign(staff: Staff, flight) -> StaffAssignment:
        """Validates and creates a manual staff-to-flight assignment."""
        can_assign, reason = BusinessRuleValidator.can_assign_staff_to_flight(staff, flight)
        if not can_assign:
            raise StaffAssignmentError(reason)
        return StaffAssignment.objects.create(staff=staff, flight=flight)
    @staticmethod
    def auto_assign(flight, staff_type: str, turnaround_task_id=None) -> dict:
        """
        Picks the first active staff member of the requested type with no
        overlapping StaffAssignment for this flight's time window, creates
        the StaffAssignment, and (if turnaround_task_id is passed) links it
        to that task's assigned_staff field too.
        Returns a dict with the assignment, chosen staff, and task update result.
        Raises StaffAssignmentError if no eligible staff is found/available.
        """
        candidates = Staff.objects.filter(staff_type=staff_type, is_active=True).order_by('employee_id')
        if not candidates.exists():
            raise StaffAssignmentError(f'No active staff of type "{staff_type}" exist.')

        chosen = None
        reasons_tried = []
        for staff in candidates:
            ok, reason = BusinessRuleValidator.can_assign_staff_to_flight(staff, flight)
            if ok:
                chosen = staff
                break
            reasons_tried.append(f'{staff.name}: {reason}')

        if chosen is None:
            raise StaffAssignmentError(
                f'All available {staff_type} staff have a scheduling conflict with this flight.',
                details=reasons_tried,
            )

        instance = StaffAssignment.objects.create(staff=chosen, flight=flight)

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

        return {
            'assignment': instance,
            'staff': chosen,
            'task_updated': task_updated,
        }