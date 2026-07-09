from django.contrib import admin
from .models import CleaningTask


@admin.register(CleaningTask)
class CleaningTaskAdmin(admin.ModelAdmin):
    list_display = [
        'flight', 'cleaning_company', 'status',
        'interior_cleaned', 'exterior_wash', 'waste_removed', 'cabin_ready'
    ]
    list_filter = ['status', 'cabin_ready']
    search_fields = ['flight__flight_number', 'cleaning_company']
