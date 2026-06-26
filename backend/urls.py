from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.conf.urls.static import static
from rest_framework import permissions
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
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
    public=True,
    permission_classes=(permissions.AllowAny,),
)

FRONTEND = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend')

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

    # Serve frontend
    path('', RedirectView.as_view(url='/pages/landing.html')),
    path('pages/<path:path>', static_serve, {'document_root': os.path.join(FRONTEND, 'pages')}),
    path('css/<path:path>', static_serve, {'document_root': os.path.join(FRONTEND, 'css')}),
    path('js/<path:path>', static_serve, {'document_root': os.path.join(FRONTEND, 'js')}),
]