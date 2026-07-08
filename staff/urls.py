from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StaffViewSet,
    ShiftViewSet,
    ScheduleViewSet,
    StaffAssignmentViewSet,
)

router = DefaultRouter()

router.register(r'staff', StaffViewSet)
router.register(r'shifts', ShiftViewSet)
router.register(r'schedules', ScheduleViewSet)
router.register(r'staff-assignments', StaffAssignmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]