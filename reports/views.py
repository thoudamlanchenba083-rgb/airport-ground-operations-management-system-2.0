from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from datetime import timedelta
from .models import Report
from .serializers import ReportSerializer
from core_app.permissions import IsAdminUser, IsSupervisor
from flights.models import Flight
from baggage.models import Baggage, BaggageTracking
from maintenance.models import MaintenanceRequest
from staff.models import Staff, Schedule


class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [IsSupervisor]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['report_type']
    search_fields = ['title', 'content']
    ordering_fields = ['created_at']

    def perform_create(self, serializer):
        serializer.save(generated_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='summary/flights')
    def flight_summary(self, request):
        now = timezone.now()
        last_7 = now - timedelta(days=7)
        flights = Flight.objects.filter(departure_time__gte=last_7)
        data = {
            'total': flights.count(),
            'by_status': {},
            'period': 'Last 7 days',
        }
        for status, label in Flight.STATUS_CHOICES:
            data['by_status'][label] = flights.filter(status=status).count()
        return Response(data)

    @action(detail=False, methods=['get'], url_path='summary/baggage')
    def baggage_summary(self, request):
        total_baggage = Baggage.objects.count()
        tracking_by_status = {}
        for status, label in BaggageTracking.STATUS_CHOICES:
            tracking_by_status[label] = BaggageTracking.objects.filter(
                status=status
            ).count()
        data = {
            'total_baggage': total_baggage,
            'tracking_by_status': tracking_by_status,
        }
        return Response(data)

    @action(detail=False, methods=['get'], url_path='summary/maintenance')
    def maintenance_summary(self, request):
        requests = MaintenanceRequest.objects.all()
        data = {
            'total': requests.count(),
            'by_status': {},
            'by_priority': {},
        }
        for status, label in MaintenanceRequest.STATUS_CHOICES:
            data['by_status'][label] = requests.filter(status=status).count()
        for priority, label in [('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High')]:
            data['by_priority'][label] = requests.filter(priority=priority).count()
        return Response(data)

    @action(detail=False, methods=['get'], url_path='summary/staff')
    def staff_summary(self, request):
        today = timezone.now().date()
        data = {
            'total_staff': Staff.objects.filter(is_active=True).count(),
            'by_type': {},
            'scheduled_today': Schedule.objects.filter(date=today).count(),
        }
        for stype, label in Staff.STAFF_TYPES:
            data['by_type'][label] = Staff.objects.filter(
                staff_type=stype, is_active=True
            ).count()
        return Response(data)