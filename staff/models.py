from django.db import models
from django.conf import settings


class Staff(models.Model):
    STAFF_TYPES = [
        ('GROUND', 'Ground Staff'),
        ('SECURITY', 'Security'),
        ('MAINTENANCE', 'Maintenance'),
        ('SUPERVISOR', 'Supervisor'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='staff_profile'
    )
    name = models.CharField(max_length=100)
    employee_id = models.CharField(max_length=20, unique=True)
    staff_type = models.CharField(max_length=20, choices=STAFF_TYPES)
    phone = models.CharField(max_length=20)
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    class Meta:
        indexes = [
            models.Index(fields=['staff_type']),
            models.Index(fields=['is_active']),
            models.Index(fields=['employee_id']),
        ]

    def __str__(self):
        return f"{self.name} ({self.employee_id})"

    


class Shift(models.Model):
    shift_name = models.CharField(max_length=50)
    start_time = models.TimeField()
    end_time = models.TimeField()

    def __str__(self):
        return self.shift_name


class Schedule(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE)
    date = models.DateField()

    class Meta:
        unique_together = [['staff', 'date']]

    def __str__(self):
        return f"{self.staff.name} - {self.shift.shift_name} on {self.date}"

class StaffAssignment(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='assignments')
    flight = models.ForeignKey('flights.Flight', on_delete=models.CASCADE, related_name='staff_assignments')
    role = models.CharField(max_length=50, blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['staff', 'flight']]

    def __str__(self):
        return f"{self.staff.name} -> {self.flight}"
