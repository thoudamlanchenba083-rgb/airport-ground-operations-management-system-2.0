from django.contrib import admin
from django.urls import path, include
from rest_framework import permissions
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

schema_view = get_schema_view(
    openapi.Info(
        title="Airport Ground Operations Management API",
        default_version='v1',
        description="""
## Airport Ground Operations Management System

This API provides endpoints for managing all airport ground operations including:

- **Accounts** - User registration, login, profile management
- **Flights** - Airlines, aircraft, and flight management
- **Gates** - Gate listing and assignment to flights
- **Baggage** - Baggage tracking and management
- **Maintenance** - Maintenance requests and logs
- **Staff** - Staff, shifts, and scheduling
- **Notifications** - User notifications
- **Reports** - Operational reports

## Authentication
Use the `/api/token/` endpoint to get a JWT token, then click **Authorize** and enter:

    Bearer <your_token>
        """,
        contact=openapi.Contact(email="admin@airport.com"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('api/accounts/', include('accounts.urls')),
    path('api/', include('flights.urls')),
    path('api/', include('gates.urls')),
    path('api/', include('baggage.urls')),
    path('api/', include('maintenance.urls')),
    path('api/', include('staff.urls')),
    path('api/', include('notifications.urls')),
    path('api/', include('reports.urls')),

    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]