from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DepartmentViewSet, DesignationViewSet, HRProfileViewSet,
    LeaveTypeViewSet, LeaveRequestViewSet, AttendanceViewSet, PayrollViewSet
)

router = DefaultRouter()
router.register(r'departments', DepartmentViewSet)
router.register(r'designations', DesignationViewSet)
router.register(r'hr-profiles', HRProfileViewSet)
router.register(r'leave-types', LeaveTypeViewSet)
router.register(
    r'leave-requests',
    LeaveRequestViewSet,
    basename='leave-request')
router.register(r'attendance', AttendanceViewSet, basename='attendance')
router.register(r'payroll', PayrollViewSet, basename='payroll')

urlpatterns = [
    path('', include(router.urls)),
]
