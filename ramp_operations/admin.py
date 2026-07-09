from django.contrib import admin
from .models import RampInspection, PushbackOperation


@admin.register(RampInspection)
class RampInspectionAdmin(admin.ModelAdmin):
    list_display = ['flight', 'stand', 'inspector', 'status', 'inspected_at']
    list_filter = ['status']
    search_fields = ['stand', 'flight__flight_number']


@admin.register(PushbackOperation)
class PushbackOperationAdmin(admin.ModelAdmin):
    list_display = [
        'flight',
        'marshaller',
        'tow_vehicle_code',
        'status',
        'requested_at']
    list_filter = ['status']
    search_fields = ['flight__flight_number', 'tow_vehicle_code']
