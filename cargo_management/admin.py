from django.contrib import admin
from .models import ULD, CargoManifest, CargoItem


@admin.register(ULD)
class ULDAdmin(admin.ModelAdmin):
    list_display = [
        'uld_id',
        'uld_type',
        'status',
        'flight',
        'position',
        'weight_kg',
        'max_weight_kg']
    list_filter = ['uld_type', 'status']
    search_fields = ['uld_id', 'position']


class CargoItemInline(admin.TabularInline):
    model = CargoItem
    extra = 0


@admin.register(CargoManifest)
class CargoManifestAdmin(admin.ModelAdmin):
    list_display = [
        'manifest_number',
        'flight',
        'total_weight_kg',
        'is_finalized',
        'created_at']
    list_filter = ['is_finalized']
    search_fields = ['manifest_number', 'flight__flight_number']
    inlines = [CargoItemInline]


@admin.register(CargoItem)
class CargoItemAdmin(admin.ModelAdmin):
    list_display = [
        'awb_number',
        'description',
        'manifest',
        'uld',
        'weight_kg',
        'status',
        'is_dangerous_goods',
        'dangerous_goods_class']
    list_filter = ['status', 'is_dangerous_goods', 'dangerous_goods_class']
    search_fields = ['awb_number', 'description']
