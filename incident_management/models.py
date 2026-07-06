from django.db import models
from flights.models import Flight


class Incident(models.Model):
    INCIDENT_TYPE_CHOICES = [
        ('FUEL_SPILL', 'Fuel Spill'),
        ('BIRD_STRIKE', 'Bird Strike'),
        ('FOD', 'Foreign Object Debris'),
        ('EQUIPMENT_FAILURE', 'Equipment Failure'),
        ('STAFF_INJURY', 'Staff Injury'),
        ('SECURITY_INCIDENT', 'Security Incident'),
        ('VEHICLE_COLLISION', 'Vehicle Collision'),
        ('OTHER', 'Other'),
    ]

    SEVERITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]

    STATUS_CHOICES = [
        ('REPORTED', 'Reported'),
        ('INVESTIGATING', 'Investigating'),
        ('RESOLVED', 'Resolved'),
        ('CLOSED', 'Closed'),
    ]

    incident_type = models.CharField(max_length=30, choices=INCIDENT_TYPE_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='LOW')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='REPORTED')

    flight = models.ForeignKey(
        Flight, on_delete=models.SET_NULL, null=True, blank=True, related_name='incidents'
    )
    location = models.CharField(max_length=100, blank=True, default='')

    reported_by = models.ForeignKey(
        'staff.Staff', on_delete=models.SET_NULL, null=True, blank=True, related_name='reported_incidents'
    )
    assigned_to = models.ForeignKey(
        'staff.Staff', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_incidents'
    )

    description = models.TextField()
    corrective_action = models.TextField(blank=True, default='')

    occurred_at = models.DateTimeField()
    resolved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-occurred_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['severity']),
            models.Index(fields=['incident_type']),
        ]

    def __str__(self):
        return f"{self.get_incident_type_display()} - {self.severity} ({self.status})"


class IncidentUpdate(models.Model):
    """Timeline entry / follow-up note logged against an incident."""
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='updates')
    note = models.TextField()
    updated_by = models.ForeignKey(
        'staff.Staff', on_delete=models.SET_NULL, null=True, blank=True, related_name='incident_updates'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Update on {self.incident_id} at {self.created_at:%Y-%m-%d %H:%M}"