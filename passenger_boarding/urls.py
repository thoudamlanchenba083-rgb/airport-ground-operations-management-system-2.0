from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BoardingSessionViewSet, BoardingGroupViewSet

router = DefaultRouter()

router.register(
    r'boarding-sessions',
    BoardingSessionViewSet
)
router.register(
    r'boarding-groups',
    BoardingGroupViewSet
)

urlpatterns = [
    path('', include(router.urls)),
]
