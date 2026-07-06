from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CateringCompanyViewSet, CateringOrderViewSet

router = DefaultRouter()

router.register(
    r'catering-companies',
    CateringCompanyViewSet
)
router.register(
    r'catering-orders',
    CateringOrderViewSet
)

urlpatterns = [
    path('', include(router.urls)),
]