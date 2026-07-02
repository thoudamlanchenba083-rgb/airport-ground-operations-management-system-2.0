from django.contrib import admin
from .models import FlightScheduleUpload, FlightScheduleRow


@admin.register(FlightScheduleUpload)
class FlightScheduleUploadAdmin(admin.ModelAdmin):
    list_display = ('original_filename', 'uploaded_by', 'uploaded_at', 'row_count', 'status')
    list_filter = ('status',)


@admin.register(FlightScheduleRow)
class FlightScheduleRowAdmin(admin.ModelAdmin):
    list_display = ('flight_number', 'origin', 'destination', 'scheduled_time', 'upload')
    list_filter = ('upload',)
