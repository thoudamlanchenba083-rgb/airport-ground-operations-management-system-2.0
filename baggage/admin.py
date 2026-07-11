from django.contrib import admin
from .models import Baggage, BaggageTracking


@admin.register(Baggage)
class BaggageAdmin(admin.ModelAdmin):
    list_display = ('baggage_tag', 'passenger_name', 'baggage_type', 'weight', 'flight', 'is_special_handling')
    list_filter = ('baggage_type', 'is_special_handling')
    search_fields = ('baggage_tag', 'passenger_name')


admin.site.register(BaggageTracking)
