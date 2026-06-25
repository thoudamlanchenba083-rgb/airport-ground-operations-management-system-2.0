from django.contrib import admin
from .models import MaintenanceRequest, MaintenanceLog

admin.site.register(MaintenanceRequest)
admin.site.register(MaintenanceLog)