from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.conf.urls.static import static
from rest_framework import permissions
from accounts.views import RateLimitedTokenObtainPairView, RateLimitedTokenRefreshView
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
import os
from django.views.static import serve as static_serve

schema_view = get_schema_view(
    openapi.Info(
        title="Airport Ground Operations Management API",
        default_version='v1',
        description="Airport Ground Operations Management System",
        contact=openapi.Contact(email="admin@airport.com"),
        license=openapi.License(name="MIT License"),
    ),
    public=False,
    permission_classes=(permissions.IsAuthenticated,),
)

FRONTEND = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend')
from django.conf import settings

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', RateLimitedTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', RateLimitedTokenRefreshView.as_view(), name='token_refresh'),
    path('api/accounts/', include('accounts.urls')),
    path('api/flights/', include('flights.urls')),
    path('api/gates/', include('gates.urls')),
    path('api/staff/', include('staff.urls')),
    path('api/maintenance/', include('maintenance.urls')),
    path('api/baggage/', include('baggage.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/core/', include('core_app.urls')),
    path('api/turnaround/', include('turnaround.urls')),
    path('api/ground-equipment/', include('ground_equipment.urls')),
    path('api/hr/', include('hr_management.urls')),  
    path('api/fuel/', include('fuel_management.urls')),
    path('api/cleaning/', include('aircraft_cleaning.urls')),
    path('api/water-lavatory/', include('water_lavatory_service.urls')),
    path('api/ai/', include('ai_module.urls')),
    path('api/catering/', include('catering.urls')),
    path('api/incidents/', include('incident_management.urls')),
    path('api/cargo/', include('cargo_management.urls')),
    path('api/ai/', include('ai_module.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
