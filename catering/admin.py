from django.contrib import admin
from .models import CateringCompany, CateringOrder


@admin.register(CateringCompany)
class CateringCompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_phone', 'contact_email', 'is_active']
    search_fields = ['name']


@admin.register(CateringOrder)
class CateringOrderAdmin(admin.ModelAdmin):
    list_display = [
        'flight',
        'catering_company',
        'meal_type',
        'meal_count',
        'is_special_meal',
        'status',
        'loading_completed']
    list_filter = ['status', 'meal_type', 'is_special_meal']
    search_fields = ['flight__flight_number']
