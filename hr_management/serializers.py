from rest_framework import serializers
from .models import Department, Designation, HRProfile, LeaveType, LeaveRequest, Attendance, Payroll

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'description', 'created_at']
        read_only_fields = ['created_at']

class DesignationSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    class Meta:
        model = Designation
        fields = ['id', 'name', 'department', 'department_name', 'description', 'created_at']
        read_only_fields = ['created_at']

class HRProfileSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    designation_name = serializers.CharField(source='designation.name', read_only=True)
    
    class Meta:
        model = HRProfile
        fields = ['id', 'staff', 'staff_name', 'department', 'department_name', 'designation', 
                  'designation_name', 'date_of_joining', 'date_of_birth', 'aadhar_number', 
                  'pan_number', 'emergency_contact_name', 'emergency_contact_phone', 
                  'emergency_contact_relation', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = ['id', 'name', 'max_days_per_year', 'description', 'created_at']
        read_only_fields = ['created_at']

class LeaveRequestSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.name', read_only=True)
    leave_type_display = serializers.CharField(source='leave_type.get_name_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.name', read_only=True)
    
    class Meta:
        model = LeaveRequest
        fields = ['id', 'staff', 'staff_name', 'leave_type', 'leave_type_display', 'start_date', 
                  'end_date', 'reason', 'status', 'status_display', 'approved_by', 'approved_by_name', 
                  'approval_date', 'rejection_reason', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at', 'approval_date']

class AttendanceSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Attendance
        fields = ['id', 'staff', 'staff_name', 'date', 'status', 'status_display', 
                  'check_in_time', 'check_out_time', 'remarks', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

class PayrollSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    processed_by_name = serializers.CharField(source='processed_by.name', read_only=True)
    
    class Meta:
        model = Payroll
        fields = ['id', 'staff', 'staff_name', 'month', 'base_salary', 'overtime_hours', 
                  'overtime_rate', 'deductions', 'bonus', 'net_salary', 'status', 'status_display', 
                  'processed_by', 'processed_by_name', 'payment_date', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at', 'net_salary']
