from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AIPredictionViewSet, AIChatViewSet

router = DefaultRouter()
router.register(r'predictions', AIPredictionViewSet, basename='ai-predictions')
router.register(r'chat', AIChatViewSet, basename='ai-chat')

urlpatterns = [
    path('', include(router.urls)),
]
