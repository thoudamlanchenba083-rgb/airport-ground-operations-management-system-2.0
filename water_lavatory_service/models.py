from django.db import models
from flights.models import Flight


class WaterLavatoryService(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('SKIPPED', 'Skipped'),
    ]

    flight = models.ForeignKey(Flight, on_delete=models.CASCADE, related_name='water_lavatory_services')

    assigned_staff = models.ForeignKey(
        'staff.Staff',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='water_lavatory_services'
    )

    potable_water_refilled = models.BooleanField(default=False)
    water_quantity_liters = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)

    lavatory_serviced = models.BooleanField(default=False)
    waste_disposed = models.BooleanField(default=False)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.flight.flight_number} - Water/Lavatory ({self.status})"

    @property
    def service_completed(self):
        return self.potable_water_refilled and self.lavatory_serviced and self.waste_disposed