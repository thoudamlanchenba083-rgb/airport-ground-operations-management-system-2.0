from django.db import models
from django.conf import settings
from flights.models import Flight


class FuelCompany(models.Model):
    name = models.CharField(max_length=100, unique=True)
    contact_phone = models.CharField(max_length=20, blank=True, default='')
    contact_email = models.EmailField(blank=True, default='')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Fuel companies'

    def __str__(self):
        return self.name


class FuelTruck(models.Model):
    STATUS_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('ASSIGNED', 'Assigned'),
        ('FUELING', 'Fueling'),
        ('MAINTENANCE', 'Maintenance'),
        ('OUT_OF_SERVICE', 'Out of Service'),
    ]

    truck_code = models.CharField(max_length=20, unique=True)
    fuel_company = models.ForeignKey(FuelCompany, on_delete=models.CASCADE, related_name='trucks')
    capacity_liters = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')

    def __str__(self):
        return self.truck_code


class FuelOperation(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('DELAYED', 'Delayed'),
        ('CANCELLED', 'Cancelled'),
    ]

    flight = models.ForeignKey(Flight, on_delete=models.CASCADE, related_name='fuel_operations')
    fuel_truck = models.ForeignKey(FuelTruck, on_delete=models.SET_NULL, null=True, blank=True, related_name='operations')
    fuel_company = models.ForeignKey(FuelCompany, on_delete=models.SET_NULL, null=True, blank=True, related_name='operations')

    fuel_operator = models.ForeignKey(
        'staff.Staff',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='fuel_operations'
    )

    quantity_liters = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    fuel_start_time = models.DateTimeField(null=True, blank=True)
    fuel_end_time = models.DateTimeField(null=True, blank=True)

    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.flight.flight_number} - {self.quantity_liters}L ({self.status})"

    @property
    def duration_minutes(self):
        if self.fuel_start_time and self.fuel_end_time:
            delta = self.fuel_end_time - self.fuel_start_time
            return round(delta.total_seconds() / 60, 1)
        return None