from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EquipmentTypeViewSet, GroundEquipmentViewSet, EquipmentAssignmentViewSet

router = DefaultRouter()
router.register(r'equipment-types', EquipmentTypeViewSet)
router.register(r'equipment', GroundEquipmentViewSet)
router.register(r'assignments', EquipmentAssignmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
