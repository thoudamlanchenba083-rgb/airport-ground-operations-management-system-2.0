from django.contrib import admin
from .models import Gate, GateAssignment


@admin.register(Gate)
class GateAdmin(admin.ModelAdmin):
    list_display = [
        'gate_number', 'terminal', 'gate_type', 'connection_type',
        'body_type', 'purpose', 'is_available', 'is_under_maintenance',
    ]
    list_filter = [
        'gate_type', 'connection_type', 'body_type',
        'purpose', 'is_available', 'is_under_maintenance',
    ]
    search_fields = ['gate_number', 'terminal']


admin.site.register(GateAssignment)
