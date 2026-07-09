from rest_framework import viewsets, permissions
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .models import Notification
from .serializers import NotificationSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['type', 'is_read']
    search_fields = ['message']
    ordering_fields = ['created_at']

    def get_permissions(self):
        # Notifications are system-generated (flight/maintenance/baggage
        # events) — regular users don't create them directly, only admins
        # (or backend signals, which bypass permission checks entirely).
        # But every user CAN read/update/delete their own notifications,FV
        # since get_queryset already scopes non-staff to their own data.
        if self.action == 'create':
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Notification.objects.none()
        user = self.request.user
        if user.is_staff:
            return Notification.objects.all()
        return Notification.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
