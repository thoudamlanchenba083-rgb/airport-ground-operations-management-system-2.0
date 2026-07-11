"""
Business logic for building operational summary reports.
Pulled out of the view actions so the aggregation rules can be tested
and reused (e.g. by a future scheduled/emailed report) independently
of the HTTP layer.
"""
from django.utils import timezone
from datetime import timedelta

from flights.models import Flight
from baggage.models import Baggage, BaggageTracking
from maintenance.models import MaintenanceRequest
from staff.models import Staff, Schedule


class ReportSummaryService:
    @staticmethod
    def flight_summary(days=7):
        since = timezone.now() - timedelta(days=days)
        flights = Flight.objects.filter(departure_time__gte=since)
        data = {
            'total': flights.count(),
            'by_status': {},
            'period': f'Last {days} days',
        }
        for status, label in Flight.STATUS_CHOICES:
            data['by_status'][label] = flights.filter(status=status).count()
        return data

    @staticmethod
    def baggage_summary():
        tracking_by_status = {
            label: BaggageTracking.objects.filter(status=status).count()
            for status, label in BaggageTracking.STATUS_CHOICES
        }
        return {
            'total_baggage': Baggage.objects.count(),
            'tracking_by_status': tracking_by_status,
        }

    @staticmethod
    def maintenance_summary():
        requests = MaintenanceRequest.objects.all()
        data = {
            'total': requests.count(),
            'by_status': {},
            'by_priority': {},
        }
        for status, label in MaintenanceRequest.STATUS_CHOICES:
            data['by_status'][label] = requests.filter(status=status).count()
        for priority, label in [
                ('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High')]:
            data['by_priority'][label] = requests.filter(
                priority=priority).count()
        return data

    @staticmethod
    def staff_summary():
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
        return data
