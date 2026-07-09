from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GateViewSet, GateAssignmentViewSet

router = DefaultRouter()
router.register(r'gates', GateViewSet)
router.register(r'gate-assignments', GateAssignmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
