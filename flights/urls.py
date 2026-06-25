from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AirlineViewSet, AircraftViewSet, FlightViewSet


router = DefaultRouter()

router.register(r'airlines', AirlineViewSet)
router.register(r'aircraft', AircraftViewSet)
router.register(r'flights', FlightViewSet)


urlpatterns = [
    path('', include(router.urls)),
]