from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MaintenanceRequestViewSet,
    MaintenanceLogViewSet
)

router = DefaultRouter()

router.register(
    r'maintenance',
    MaintenanceRequestViewSet
)

router.register(
    r'maintenance-logs',
    MaintenanceLogViewSet
)

urlpatterns = [
    path('', include(router.urls)),
]
