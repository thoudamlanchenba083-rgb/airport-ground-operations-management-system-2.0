from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BaggageViewSet,
    BaggageTrackingViewSet
)

router = DefaultRouter()

router.register(
    r'baggage',
    BaggageViewSet
)

router.register(
    r'baggage-tracking',
    BaggageTrackingViewSet
)

urlpatterns = [
    path('', include(router.urls)),
]