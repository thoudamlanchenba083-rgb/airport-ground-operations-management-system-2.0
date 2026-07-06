from django.db import models
from flights.models import Flight


class CleaningTask(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('SKIPPED', 'Skipped'),
    ]

    flight = models.ForeignKey(Flight, on_delete=models.CASCADE, related_name='cleaning_tasks')

    # Plain text for now — will become a FK to a shared vendor table once
    # Module 20 (Vendor Management) is built, instead of borrowing another app's model.
    cleaning_company = models.CharField(max_length=100, blank=True, default='')

    assigned_staff = models.ForeignKey(
        'staff.Staff',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='cleaning_tasks'
    )

    interior_cleaned = models.BooleanField(default=False)
    exterior_wash = models.BooleanField(default=False)
    waste_removed = models.BooleanField(default=False)
    cabin_ready = models.BooleanField(default=False)

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
        return f"{self.flight.flight_number} - Cleaning ({self.status})"

    def save(self, *args, **kwargs):
        # cabin_ready should only be true once all three sub-tasks are done
        if self.interior_cleaned and self.exterior_wash and self.waste_removed:
            self.cabin_ready = True
        super().save(*args, **kwargs)