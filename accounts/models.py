from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ('ADMIN', 'Admin'),
        ('GROUND_STAFF', 'Ground Staff'),
        ('MAINTENANCE_ENGINEER', 'Maintenance Engineer'),
        ('GATE_MANAGER', 'Gate Manager'),
        ('HR', 'HR'),
        ('OPERATIONS_MANAGER', 'Operations Manager'),
        ('BAGGAGE_SUPERVISOR', 'Baggage Supervisor'),
        ('SECURITY_OFFICER', 'Security Officer'),
        ('VIEWER', 'Viewer'),
        # Legacy roles kept for backward compatibility with existing data
        ('SUPERVISOR', 'Supervisor (legacy)'),
        ('MAINTENANCE', 'Maintenance (legacy)'),
    ]

    role = models.CharField(
        max_length=30,
        choices=ROLE_CHOICES,
        default='VIEWER'
    )

    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    class Meta:
        ordering = ['username']

    def __str__(self):
        return self.username
