from django.contrib import admin
from .models import BoardingSession, BoardingGroup


class BoardingGroupInline(admin.TabularInline):
    model = BoardingGroup
    extra = 0


@admin.register(BoardingSession)
class BoardingSessionAdmin(admin.ModelAdmin):
    list_display = [
        'flight',
        'status',
        'boarding_gate',
        'passenger_count',
        'passengers_boarded',
        'boarding_started_at',
        'boarding_completed_at']
    list_filter = ['status', 'boarding_gate']
    search_fields = ['flight__flight_number', 'boarding_gate']
    inlines = [BoardingGroupInline]


@admin.register(BoardingGroup)
class BoardingGroupAdmin(admin.ModelAdmin):
    list_display = [
        'boarding_session',
        'group_name',
        'called_at',
        'passenger_count']
    list_filter = ['group_name']
    search_fields = ['boarding_session__flight__flight_number', 'group_name']
