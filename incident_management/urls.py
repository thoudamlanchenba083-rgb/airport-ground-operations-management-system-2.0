from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IncidentViewSet, IncidentUpdateViewSet

router = DefaultRouter()

router.register(
    r'incidents',
    IncidentViewSet
)
router.register(
    r'incident-updates',
    IncidentUpdateViewSet
)

urlpatterns = [
    path('', include(router.urls)),
]