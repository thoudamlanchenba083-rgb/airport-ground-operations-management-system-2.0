from django.db import models
from flights.models import Flight


class RampInspection(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PASSED', 'Passed'),
        ('FAILED', 'Failed'),
    ]

    flight = models.ForeignKey(
        Flight, on_delete=models.SET_NULL, null=True, blank=True, related_name='ramp_inspections'
    )
    stand = models.CharField(max_length=20, blank=True, default='', help_text='Parking stand or gate number')

    inspector = models.ForeignKey(
        'staff.Staff', on_delete=models.SET_NULL, null=True, blank=True, related_name='ramp_inspections'
    )

    cone_placement_ok = models.BooleanField(default=False)
    safety_zone_clear = models.BooleanField(default=False)
    fod_check_clear = models.BooleanField(default=False)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    findings = models.TextField(blank=True, default='')

    inspected_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Ramp Inspection - {self.stand} ({self.status})"


class PushbackOperation(models.Model):
    STATUS_CHOICES = [
        ('REQUESTED', 'Requested'),
        ('APPROVED', 'Approved'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('REJECTED', 'Rejected'),
    ]

    flight = models.ForeignKey(Flight, on_delete=models.CASCADE, related_name='pushback_operations')

    marshaller = models.ForeignKey(
        'staff.Staff', on_delete=models.SET_NULL, null=True, blank=True, related_name='marshalling_operations'
    )
    approved_by = models.ForeignKey(
        'staff.Staff', on_delete=models.SET_NULL, null=True, blank=True, related_name='pushback_approvals'
    )

    tow_vehicle_code = models.CharField(max_length=20, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='REQUESTED')

    requested_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-requested_at']
        indexes = [
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Pushback - {self.flight.flight_number} ({self.status})"