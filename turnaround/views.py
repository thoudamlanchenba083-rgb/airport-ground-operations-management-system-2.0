from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import TurnaroundTask
from .serializers import TurnaroundTaskSerializer
from core_app.utils import log_action
from core_app.permissions import HasRole


class TurnaroundTaskViewSet(viewsets.ModelViewSet):
    queryset = TurnaroundTask.objects.select_related('flight', 'assigned_staff', 'completed_by').all()
    serializer_class = TurnaroundTaskSerializer
    permission_classes = [HasRole('GROUND_STAFF', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'GATE_MANAGER')]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['flight', 'task_type', 'status', 'assigned_staff']
    search_fields = ['flight__flight_number', 'notes']
    ordering_fields = ['scheduled_time', 'actual_start_time', 'actual_end_time', 'status']

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'CREATE', 'TurnaroundTask', instance.id,
                    f'Created task: {instance}', self.request)

    def perform_update(self, serializer):
        # Auto-stamp who completed it and when, based on status change
        extra = {}
        new_status = serializer.validated_data.get('status')
        if new_status == 'COMPLETED':
            extra['completed_by'] = self.request.user
            if not serializer.validated_data.get('actual_end_time'):
                extra['actual_end_time'] = timezone.now()
        if new_status == 'IN_PROGRESS' and not serializer.instance.actual_start_time:
            extra['actual_start_time'] = timezone.now()

        instance = serializer.save(**extra)
        log_action(self.request.user, 'UPDATE', 'TurnaroundTask', instance.id,
                    f'Updated task: {instance}', self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, 'DELETE', 'TurnaroundTask', instance.id,
                    f'Deleted task: {instance}', self.request)
        instance.delete()

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """
        GET /api/turnaround/turnaround-tasks/summary/?flight=<id>
        Returns progress percentage and status breakdown for one flight's turnaround.
        """
        flight_id = request.query_params.get('flight')
        qs = self.get_queryset()
        if flight_id:
            qs = qs.filter(flight_id=flight_id)

        total = qs.count()
        completed = qs.filter(status='COMPLETED').count()
        delayed = qs.filter(status='DELAYED').count()
        in_progress = qs.filter(status='IN_PROGRESS').count()
        pending = qs.filter(status='PENDING').count()

        progress_percent = round((completed / total) * 100, 1) if total else 0

        return Response({
            'flight': flight_id,
            'total_tasks': total,
            'completed': completed,
            'in_progress': in_progress,
            'delayed': delayed,
            'pending': pending,
            'progress_percent': progress_percent,
        })