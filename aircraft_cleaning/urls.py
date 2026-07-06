from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CleaningTaskViewSet

router = DefaultRouter()

router.register(
    r'cleaning-tasks',
    CleaningTaskViewSet
)

urlpatterns = [
    path('', include(router.urls)),
]