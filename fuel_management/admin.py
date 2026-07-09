from django.contrib import admin
from .models import FuelCompany, FuelTruck, FuelOperation


@admin.register(FuelCompany)
class FuelCompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_phone', 'contact_email', 'is_active']
    search_fields = ['name']


@admin.register(FuelTruck)
class FuelTruckAdmin(admin.ModelAdmin):
    list_display = ['truck_code', 'fuel_company', 'capacity_liters', 'status']
    list_filter = ['status', 'fuel_company']
    search_fields = ['truck_code']


@admin.register(FuelOperation)
class FuelOperationAdmin(admin.ModelAdmin):
    list_display = [
        'flight',
        'fuel_truck',
        'fuel_company',
        'quantity_liters',
        'status',
        'fuel_start_time',
        'fuel_end_time']
    list_filter = ['status', 'fuel_company']
    search_fields = ['flight__flight_number']
