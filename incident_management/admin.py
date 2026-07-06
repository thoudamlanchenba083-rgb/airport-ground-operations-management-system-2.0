from django.contrib import admin
from .models import Incident, IncidentUpdate


class IncidentUpdateInline(admin.TabularInline):
    model = IncidentUpdate
    extra = 0


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ['incident_type', 'severity', 'status', 'flight', 'location', 'occurred_at', 'resolved_at']
    list_filter = ['incident_type', 'severity', 'status']
    search_fields = ['flight__flight_number', 'location', 'description']
    inlines = [IncidentUpdateInline]


@admin.register(IncidentUpdate)
class IncidentUpdateAdmin(admin.ModelAdmin):
    list_display = ['incident', 'updated_by', 'created_at']
    search_fields = ['incident__incident_type', 'note']