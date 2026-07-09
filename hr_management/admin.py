from django.contrib import admin
from .models import Department, Designation, HRProfile, LeaveType, LeaveRequest, Attendance, Payroll


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)


@admin.register(Designation)
class DesignationAdmin(admin.ModelAdmin):
    list_display = ('name', 'department', 'created_at')
    list_filter = ('department',)
    search_fields = ('name',)


@admin.register(HRProfile)
class HRProfileAdmin(admin.ModelAdmin):
    list_display = ('staff', 'department', 'designation', 'date_of_joining')
    list_filter = ('department', 'designation', 'date_of_joining')
    search_fields = ('staff__name', 'aadhar_number', 'pan_number')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'max_days_per_year')
    search_fields = ('name',)


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = (
        'staff',
        'leave_type',
        'start_date',
        'end_date',
        'status',
        'approved_by')
    list_filter = ('status', 'leave_type', 'start_date')
    search_fields = ('staff__name',)
    readonly_fields = ('created_at', 'updated_at', 'approval_date')
    actions = ['approve_leaves', 'reject_leaves']

    def approve_leaves(self, request, queryset):
        queryset.update(status='approved', approved_by=request.user.staff)
    approve_leaves.short_description = "Approve selected leaves"

    def reject_leaves(self, request, queryset):
        queryset.update(status='rejected')
    reject_leaves.short_description = "Reject selected leaves"


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = (
        'staff',
        'date',
        'status',
        'check_in_time',
        'check_out_time')
    list_filter = ('status', 'date')
    search_fields = ('staff__name',)
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'date'


@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    list_display = (
        'staff',
        'month',
        'base_salary',
        'net_salary',
        'status',
        'payment_date')
    list_filter = ('status', 'month')
    search_fields = ('staff__name',)
    readonly_fields = ('created_at', 'updated_at', 'net_salary')
    date_hierarchy = 'month'
