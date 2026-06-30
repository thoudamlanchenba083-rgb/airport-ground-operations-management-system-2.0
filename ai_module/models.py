
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
