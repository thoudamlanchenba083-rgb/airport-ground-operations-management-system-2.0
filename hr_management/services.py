"""
Business logic for HR management: leave approval, attendance
check-in/out, and payroll generation.
"""
from datetime import datetime

from django.utils import timezone
from rest_framework.exceptions import ValidationError


class LeaveRequestService:
    @staticmethod
    def approve(leave, approver_staff):
        if leave.status != 'pending':
            raise ValidationError('Only pending leaves can be approved.')
        leave.status = 'approved'
        leave.approved_by = approver_staff
        leave.approval_date = timezone.now()
        leave.save()
        return leave

    @staticmethod
    def reject(leave, reason):
        if leave.status != 'pending':
            raise ValidationError('Only pending leaves can be rejected.')
        leave.status = 'rejected'
        leave.rejection_reason = reason
        leave.save()
        return leave


class AttendanceService:
    """
    Uses timezone.localdate() (which respects settings.TIME_ZONE,
    'Asia/Kolkata') rather than timezone.now().date() (which is always
    the UTC calendar date when USE_TZ=True) so a check-in just after
    midnight IST is recorded against the correct local day.
    """

    @staticmethod
    def check_in(staff, model):
        today = timezone.localdate()
        attendance, created = model.objects.get_or_create(
            staff=staff,
            date=today,
            defaults={
                'status': 'present',
                'check_in_time': timezone.localtime().time()})

        if not created:
            attendance.check_in_time = timezone.localtime().time()
            attendance.save()

        return attendance

    @staticmethod
    def check_out(staff, model):
        today = timezone.localdate()
        attendance = model.objects.get(staff=staff, date=today)
        attendance.check_out_time = timezone.localtime().time()
        attendance.save()
        return attendance


class PayrollService:
    @staticmethod
    def generate_for_month(month_str, staff_model, payroll_model):
        if not month_str:
            raise ValidationError('Month required in format YYYY-MM-01.')
        try:
            month_date = datetime.strptime(month_str, '%Y-%m-%d').date()
        except ValueError:
            raise ValidationError('Invalid date format.')

        created_count = 0
        for staff in staff_model.objects.all():
            _, created = payroll_model.objects.get_or_create(
                staff=staff,
                month=month_date,
                defaults={
                    'base_salary': getattr(
                        staff, 'salary', 0)})
            if created:
                created_count += 1
        return created_count, month_date

    @staticmethod
    def mark_paid(payroll):
        payroll.status = 'paid'
        payroll.payment_date = timezone.now()
        payroll.save()
        return payroll
