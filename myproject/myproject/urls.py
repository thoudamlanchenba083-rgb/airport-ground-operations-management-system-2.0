from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/', include('flights.urls')),
    path('api/', include('gates.urls')),
    path('api/', include('baggage.urls')),
    path('api/', include('maintenance.urls')),
    path('api/', include('staff.urls')),
]