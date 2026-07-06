from django.contrib import admin
from .models import TurnaroundTask


@admin.register(TurnaroundTask)
class TurnaroundTaskAdmin(admin.ModelAdmin):
    list_display = ['flight', 'task_type', 'status', 'assigned_staff', 'scheduled_time', 'actual_start_time', 'actual_end_time']
    list_filter = ['status', 'task_type']
    search_fields = ['flight__flight_number']