from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FuelCompanyViewSet, FuelTruckViewSet, FuelOperationViewSet

router = DefaultRouter()

router.register(
    r'fuel-companies',
    FuelCompanyViewSet
)
router.register(
    r'fuel-trucks',
    FuelTruckViewSet
)
router.register(
    r'fuel-operations',
    FuelOperationViewSet
)

urlpatterns = [
    path('', include(router.urls)),
]