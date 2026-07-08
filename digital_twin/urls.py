from django.urls import path
from .views import DigitalTwinView, GateHeatmapView

urlpatterns = [
    path('snapshot/', DigitalTwinView.as_view(), name='digital-twin-snapshot'),
    path('heatmap/', GateHeatmapView.as_view(), name='digital-twin-heatmap'),
]