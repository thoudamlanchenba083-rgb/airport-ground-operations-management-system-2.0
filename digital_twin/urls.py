from django.urls import path
from .views import DigitalTwinView, GateHeatmapView, WhatIfGateClosureView

urlpatterns = [
    path(
        'snapshot/',
        DigitalTwinView.as_view(),
        name='digital-twin-snapshot'),
    path(
        'heatmap/',
        GateHeatmapView.as_view(),
        name='digital-twin-heatmap'),
    path(
        'what-if/gate-closure/<str:gate_number>/',
        WhatIfGateClosureView.as_view(),
        name='what-if-gate-closure'),
]
