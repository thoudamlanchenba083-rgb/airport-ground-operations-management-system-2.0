from django.contrib import admin
from .models import EquipmentType, GroundEquipment, EquipmentAssignment

@admin.register(EquipmentType)
class EquipmentTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)

@admin.register(GroundEquipment)
class GroundEquipmentAdmin(admin.ModelAdmin):
    list_display = ('equipment_id', 'equipment_type', 'status', 'location', 'last_maintenance')
    list_filter = ('status', 'equipment_type', 'created_at')
    search_fields = ('equipment_id', 'location')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(EquipmentAssignment)
class EquipmentAssignmentAdmin(admin.ModelAdmin):
    list_display = ('equipment', 'flight', 'assigned_at', 'released_at')
    list_filter = ('assigned_at', 'equipment__equipment_type')
    search_fields = ('equipment__equipment_id', 'flight__flight_number')
    readonly_fields = ('assigned_at',)
