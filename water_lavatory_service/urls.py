from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WaterLavatoryServiceViewSet

router = DefaultRouter()

router.register(
    r'water-lavatory-services',
    WaterLavatoryServiceViewSet
)

urlpatterns = [
    path('', include(router.urls)),
]