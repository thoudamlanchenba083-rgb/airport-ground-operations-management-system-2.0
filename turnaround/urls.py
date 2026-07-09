from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TurnaroundTaskViewSet

router = DefaultRouter()

router.register(
    r'turnaround-tasks',
    TurnaroundTaskViewSet
)

urlpatterns = [
    path('', include(router.urls)),
]
