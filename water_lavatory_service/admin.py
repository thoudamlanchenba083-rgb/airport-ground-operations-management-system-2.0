from django.contrib import admin
from .models import WaterLavatoryService


@admin.register(WaterLavatoryService)
class WaterLavatoryServiceAdmin(admin.ModelAdmin):
    list_display = [
        'flight', 'status', 'potable_water_refilled',
        'lavatory_serviced', 'waste_disposed', 'assigned_staff'
    ]
    list_filter = ['status', 'potable_water_refilled', 'lavatory_serviced']
    search_fields = ['flight__flight_number']
