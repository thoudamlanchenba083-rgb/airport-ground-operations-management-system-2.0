from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from datetime import datetime
from core_app.permissions import HasRole
from .models import Department, Designation, HRProfile, LeaveType, LeaveRequest, Attendance, Payroll
from .serializers import (
    DepartmentSerializer, DesignationSerializer, HRProfileSerializer,
    LeaveTypeSerializer, LeaveRequestSerializer, AttendanceSerializer, PayrollSerializer
)

# HR/org-management roles: manage department structure, HR profiles,
# approve leave, generate/mark payroll. ADMIN is always included by HasRole.
IsHRManagement = HasRole('HR', 'OPERATIONS_MANAGER', 'SUPERVISOR')


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsHRManagement]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']


class DesignationViewSet(viewsets.ModelViewSet):
    queryset = Designation.objects.all()
    serializer_class = DesignationSerializer
    permission_classes = [IsHRManagement]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['department']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']


class HRProfileViewSet(viewsets.ModelViewSet):
    queryset = HRProfile.objects.all()
    serializer_class = HRProfileSerializer
    permission_classes = [IsHRManagement]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['department', 'designation']
    search_fields = ['staff__name', 'aadhar_number', 'pan_number']
    ordering_fields = ['date_of_joining', 'created_at']


class LeaveTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LeaveType.objects.all()
    serializer_class = LeaveTypeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'max_days_per_year']


class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['staff', 'leave_type', 'status']
    ordering_fields = ['start_date', 'created_at']

    def get_permissions(self):
        # Any authenticated staff member can submit/view their own leave
        # request (self-service). Only HR/management can approve or reject.
        if self.action in ['approve', 'reject']:
            return [IsHRManagement()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.role in ['ADMIN', 'HR', 'OPERATIONS_MANAGER', 'SUPERVISOR']:
            return LeaveRequest.objects.all()
        return LeaveRequest.objects.filter(staff=user.staff_profile)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve leave request"""
        leave = self.get_object()

        if leave.status != 'pending':
            return Response(
                {'error': 'Only pending leaves can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )

        leave.status = 'approved'
        leave.approved_by = request.user.staff_profile
        leave.approval_date = timezone.now()
        leave.save()

        return Response({
            'message': 'Leave approved successfully',
            'leave': LeaveRequestSerializer(leave).data
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject leave request"""
        leave = self.get_object()
        reason = request.data.get('reason', '')

        if leave.status != 'pending':
            return Response(
                {'error': 'Only pending leaves can be rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )

        leave.status = 'rejected'
        leave.rejection_reason = reason
        leave.save()

        return Response({
            'message': 'Leave rejected',
            'leave': LeaveRequestSerializer(leave).data
        })


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['staff', 'status', 'date']
    ordering_fields = ['date', 'created_at']

    def get_permissions(self):
        # check_in/check_out are self-service (act on the caller's own
        # staff profile), as is viewing your own attendance history.
        # Directly creating/editing/deleting arbitrary attendance records
        # is an HR/management task.
        if self.action in ['check_in', 'check_out', 'list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsHRManagement()]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.role in ['ADMIN', 'HR', 'OPERATIONS_MANAGER', 'SUPERVISOR']:
            return Attendance.objects.all()
        return Attendance.objects.filter(staff=user.staff_profile)

    @action(detail=False, methods=['post'])
    def check_in(self, request):
        """Mark check-in for today"""
        staff = request.user.staff_profile
        today = timezone.now().date()

        attendance, created = Attendance.objects.get_or_create(
            staff=staff,
            date=today,
            defaults={'status': 'present', 'check_in_time': timezone.now().time()}
        )

        if not created:
            attendance.check_in_time = timezone.now().time()
            attendance.save()

        return Response({
            'message': 'Checked in successfully',
            'attendance': AttendanceSerializer(attendance).data
        })

    @action(detail=False, methods=['post'])
    def check_out(self, request):
        """Mark check-out for today"""
        staff = request.user.staff_profile
        today = timezone.now().date()

        try:
            attendance = Attendance.objects.get(staff=staff, date=today)
            attendance.check_out_time = timezone.now().time()
            attendance.save()

            return Response({
                'message': 'Checked out successfully',
                'attendance': AttendanceSerializer(attendance).data
            })
        except Attendance.DoesNotExist:
            return Response(
                {'error': 'No attendance record found for today'},
                status=status.HTTP_404_NOT_FOUND
            )


class PayrollViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['staff', 'status', 'month']
    ordering_fields = ['month', 'created_at']

    def get_permissions(self):
        # Staff can view their own payroll (queryset already scopes this).
        # Generating payroll, editing records, and marking paid are
        # HR/management-only actions — this is financial data.
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsHRManagement()]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.role in ['ADMIN', 'HR', 'OPERATIONS_MANAGER', 'SUPERVISOR']:
            return Payroll.objects.all()
        return Payroll.objects.filter(staff=user.staff_profile)

    @action(detail=False, methods=['post'])
    def generate_payroll(self, request):
        """Generate payroll for a month"""
        from staff.models import Staff
        month = request.data.get('month')  # Format: YYYY-MM-01

        if not month:
            return Response(
                {'error': 'Month required in format YYYY-MM-01'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            month_date = datetime.strptime(month, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format'},
                status=status.HTTP_400_BAD_REQUEST
            )

        created_count = 0
        for staff in Staff.objects.all():
            payroll, created = Payroll.objects.get_or_create(
                staff=staff,
                month=month_date,
                defaults={'base_salary': staff.salary if hasattr(staff, 'salary') else 0}
            )
            if created:
                created_count += 1

        return Response({
            'message': f'Payroll generated for {created_count} staff',
            'month': month
        })

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Mark a payroll record as paid"""
        payroll = self.get_object()
        payroll.status = 'paid'
        payroll.payment_date = timezone.now()
        payroll.save()

        return Response({
            'message': 'Payroll marked as paid',
            'payroll': PayrollSerializer(payroll).data
        })