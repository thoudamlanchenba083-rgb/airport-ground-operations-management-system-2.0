from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Report
from .serializers import ReportSerializer
from .services import ReportSummaryService
from core_app.permissions import IsReportsUser


class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [IsReportsUser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['report_type']
    search_fields = ['title', 'content']
    ordering_fields = ['created_at']

    def perform_create(self, serializer):
        serializer.save(generated_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='summary/flight')
    def flight_summary(self, request):
        return Response(ReportSummaryService.flight_summary())

    @action(detail=False, methods=['get'], url_path='summary/baggage')
    def baggage_summary(self, request):
        return Response(ReportSummaryService.baggage_summary())

    @action(detail=False, methods=['get'], url_path='summary/maintenance')
    def maintenance_summary(self, request):
        return Response(ReportSummaryService.maintenance_summary())

    @action(detail=False, methods=['get'], url_path='summary/staff')
    def staff_summary(self, request):
        return Response(ReportSummaryService.staff_summary())
