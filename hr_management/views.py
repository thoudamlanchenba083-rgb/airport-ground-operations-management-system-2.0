from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from core_app.permissions import HasRole
from .models import Department, Designation, HRProfile, LeaveType, LeaveRequest, Attendance, Payroll
from .serializers import (
    DepartmentSerializer, DesignationSerializer, HRProfileSerializer,
    LeaveTypeSerializer, LeaveRequestSerializer, AttendanceSerializer, PayrollSerializer
)
from .services import LeaveRequestService, AttendanceService, PayrollService

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
        leave = LeaveRequestService.approve(
            self.get_object(), request.user.staff_profile)
        return Response({
            'message': 'Leave approved successfully',
            'leave': LeaveRequestSerializer(leave).data
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject leave request"""
        reason = request.data.get('reason', '')
        leave = LeaveRequestService.reject(self.get_object(), reason)
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
        attendance = AttendanceService.check_in(
            request.user.staff_profile, Attendance)
        return Response({
            'message': 'Checked in successfully',
            'attendance': AttendanceSerializer(attendance).data
        })

    @action(detail=False, methods=['post'])
    def check_out(self, request):
        """Mark check-out for today"""
        try:
            attendance = AttendanceService.check_out(
                request.user.staff_profile, Attendance)
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
        created_count, month_date = PayrollService.generate_for_month(
            month, Staff, Payroll)
        return Response({
            'message': f'Payroll generated for {created_count} staff',
            'month': month
        })

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Mark a payroll record as paid"""
        payroll = PayrollService.mark_paid(self.get_object())
        return Response({
            'message': 'Payroll marked as paid',
            'payroll': PayrollSerializer(payroll).data
        })
