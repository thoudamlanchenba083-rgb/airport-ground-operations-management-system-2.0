from django.contrib import admin
from .models import Staff, Shift, Schedule

admin.site.register(Staff)
admin.site.register(Shift)
admin.site.register(Schedule)