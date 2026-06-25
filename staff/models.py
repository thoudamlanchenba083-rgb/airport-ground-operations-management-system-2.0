from django.db import models


class Staff(models.Model):
    STAFF_TYPES = [
        ('GROUND', 'Ground Staff'),
        ('SECURITY', 'Security'),
        ('MAINTENANCE', 'Maintenance'),
        ('SUPERVISOR', 'Supervisor'),
    ]

    name = models.CharField(max_length=100)
    employee_id = models.CharField(max_length=20, unique=True)
    staff_type = models.CharField(max_length=20, choices=STAFF_TYPES)
    phone = models.CharField(max_length=20)
    email = models.EmailField()

    def __str__(self):
        return self.name


class Shift(models.Model):
    shift_name = models.CharField(max_length=50)
    start_time = models.TimeField()
    end_time = models.TimeField()

    def __str__(self):
        return self.shift_name


class Schedule(models.Model):
    staff = models.ForeignKey(
        Staff,
        on_delete=models.CASCADE
    )

    shift = models.ForeignKey(
        Shift,
        on_delete=models.CASCADE
    )

    date = models.DateField()

    def __str__(self):
        return f"{self.staff.name} - {self.shift.shift_name}"