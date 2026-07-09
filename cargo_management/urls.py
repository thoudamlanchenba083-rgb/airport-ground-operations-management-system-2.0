from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ULDViewSet, CargoManifestViewSet, CargoItemViewSet

router = DefaultRouter()

router.register(
    r'ulds',
    ULDViewSet
)
router.register(
    r'cargo-manifests',
    CargoManifestViewSet
)
router.register(
    r'cargo-items',
    CargoItemViewSet
)

urlpatterns = [
    path('', include(router.urls)),
]
