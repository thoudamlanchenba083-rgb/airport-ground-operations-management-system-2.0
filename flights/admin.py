from django.contrib import admin
from .models import Airline, Aircraft, Flight


admin.site.register(Airline)
admin.site.register(Aircraft)
admin.site.register(Flight)