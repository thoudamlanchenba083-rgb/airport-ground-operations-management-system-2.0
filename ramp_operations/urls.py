from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RampInspectionViewSet, PushbackOperationViewSet

router = DefaultRouter()

router.register(
    r'inspections',
    RampInspectionViewSet
)
router.register(
    r'pushback-operations',
    PushbackOperationViewSet
)

urlpatterns = [
    path('', include(router.urls)),
]