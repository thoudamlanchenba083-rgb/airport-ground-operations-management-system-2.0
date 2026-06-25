from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StaffViewSet,
    ShiftViewSet,
    ScheduleViewSet
)

router = DefaultRouter()

router.register(r'staff', StaffViewSet)
router.register(r'shifts', ShiftViewSet)
router.register(r'schedules', ScheduleViewSet)

urlpatterns = [
    path('', include(router.urls)),
]