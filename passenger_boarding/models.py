from django.db import models
from flights.models import Flight


class BoardingSession(models.Model):
    STATUS_CHOICES = [
        ('NOT_STARTED', 'Not Started'),
        ('BOARDING', 'Boarding'),
        ('FINAL_CALL', 'Final Call'),
        ('COMPLETED', 'Completed'),
        ('DELAYED', 'Delayed'),
    ]

    flight = models.OneToOneField(Flight, on_delete=models.CASCADE, related_name='boarding_session')

    boarding_gate = models.CharField(max_length=20, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NOT_STARTED')

    boarding_started_at = models.DateTimeField(null=True, blank=True)
    boarding_completed_at = models.DateTimeField(null=True, blank=True)
    final_call_at = models.DateTimeField(null=True, blank=True)

    passenger_count = models.PositiveIntegerField(null=True, blank=True)
    passengers_boarded = models.PositiveIntegerField(default=0)

    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.flight.flight_number} - Boarding ({self.status})"


class BoardingGroup(models.Model):
    """
    Represents a boarding group/zone called during the session
    (e.g. Group 1, Priority, Zone A).
    """
    boarding_session = models.ForeignKey(
        BoardingSession, on_delete=models.CASCADE, related_name='groups'
    )
    group_name = models.CharField(max_length=50)
    called_at = models.DateTimeField(null=True, blank=True)
    passenger_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['id']
        unique_together = [['boarding_session', 'group_name']]

    def __str__(self):
        return f"{self.boarding_session.flight.flight_number} - {self.group_name}"