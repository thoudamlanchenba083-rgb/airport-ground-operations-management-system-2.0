
from django.db import models
from flights.models import Flight
from accounts.models import User


class AIPrediction(models.Model):
    PREDICTION_TYPES = [
        ('DELAY', 'Delay Prediction'),
        ('MAINTENANCE', 'Predictive Maintenance'),
        ('GATE', 'Gate Recommendation'),
        ('STAFF', 'Staff Requirement'),
        ('PASSENGER_RUSH', 'Passenger Rush'),
        ('WEATHER_RISK', 'Weather Risk'),
        ('BAGGAGE_WEIGHT', 'Baggage Weight Risk'),
        ('RESOURCE', 'Resource Optimization'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]

    prediction_type = models.CharField(max_length=30, choices=PREDICTION_TYPES)
    flight = models.ForeignKey(
        Flight, on_delete=models.CASCADE,
        null=True, blank=True, related_name='ai_predictions'
    )
    input_data = models.JSONField(default=dict)
    result = models.JSONField(default=dict)
    confidence_score = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL,
        null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['prediction_type']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.prediction_type} - {self.created_at.date()}"


class AIChatMessage(models.Model):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_messages')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    session_id = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.user.username} [{self.role}] - {self.created_at}"


def schedule_upload_path(instance, filename):
    return f"flight_schedules/{filename}"


class FlightScheduleUpload(models.Model):
    """
    An Excel/CSV sheet of flight timings uploaded from the AI Assistant page.
    Only the most recent upload is treated as the "active" schedule the
    chatbot checks against (see chatbot.py schedule_check intent).
    """
    file = models.FileField(upload_to=schedule_upload_path, null=True, blank=True)
    original_filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    row_count = models.IntegerField(default=0)
    status = models.CharField(max_length=20, default='PROCESSED')  # PROCESSED | FAILED
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.original_filename} ({self.row_count} rows) - {self.uploaded_at.date()}"


class FlightScheduleRow(models.Model):
    """
    One parsed row from an uploaded FlightScheduleUpload sheet.
    scheduled_time is the primary departure time used for "is there a
    flight at this time" style chatbot lookups.
    """
    upload = models.ForeignKey(FlightScheduleUpload, on_delete=models.CASCADE, related_name='rows')
    flight_number = models.CharField(max_length=30, blank=True)
    origin = models.CharField(max_length=100, blank=True)
    destination = models.CharField(max_length=100, blank=True)
    scheduled_time = models.DateTimeField(null=True, blank=True)
    arrival_time = models.DateTimeField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)  # any other columns from the sheet

    class Meta:
        ordering = ['scheduled_time']
        indexes = [
            models.Index(fields=['scheduled_time']),
        ]

    def __str__(self):
        return f"{self.flight_number or 'Flight'}: {self.origin} -> {self.destination}"
