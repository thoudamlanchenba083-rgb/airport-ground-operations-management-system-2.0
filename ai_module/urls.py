from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AIPredictionViewSet, AIChatViewSet, FlightScheduleViewSet

router = DefaultRouter()
router.register(r'predictions', AIPredictionViewSet, basename='ai-predictions')
router.register(r'chat', AIChatViewSet, basename='ai-chat')
router.register(r'schedule', FlightScheduleViewSet, basename='ai-schedule')

urlpatterns = [
    path('', include(router.urls)),
]
