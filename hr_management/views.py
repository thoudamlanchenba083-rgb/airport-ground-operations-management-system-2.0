from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Department, Designation, HRProfile, LeaveType, LeaveRequest, Attendance, Payroll
from .serializers import (
    DepartmentSerializer, DesignationSerializer, HRProfileSerializer,
    LeaveTypeSerializer, LeaveRequestSerializer, AttendanceSerializer, PayrollSerializer
)

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]

class DesignationViewSet(viewsets.ModelViewSet):
    queryset = Designation.objects.all()
    serializer_class = DesignationSerializer
    permission_classes = [IsAuthenticated]

class HRProfileViewSet(viewsets.ModelViewSet):
    queryset = HRProfile.objects.all()
    serializer_class = HRProfileSerializer
    permission_classes = [IsAuthenticated]

class LeaveTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LeaveType.objects.all()
    serializer_class = LeaveTypeSerializer
    permission_classes = [IsAuthenticated]

class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.staff.role in ['manager', 'admin']:
            return LeaveRequest.objects.all()
        return LeaveRequest.objects.filter(staff=user.staff)
    
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
        leave.approved_by = request.user.staff
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
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.staff.role in ['manager', 'admin']:
            return Attendance.objects.all()
        return Attendance.objects.filter(staff=user.staff)
    
    @action(detail=False, methods=['post'])
    def check_in(self, request):
        """Mark check-in for today"""
        staff = request.user.staff
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
        staff = request.user.staff
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
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or user.staff.role in ['manager', 'admin']:
            return Payroll.objects.all()
        return Payroll.objects.filter(staff=user.staff)
    
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
