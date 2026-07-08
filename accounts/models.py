from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models


class CustomUserManager(UserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('role', 'ADMIN')
        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
    objects = CustomUserManager()
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
        # Ramp & apron roles
        ('RAMP_SUPERVISOR', 'Ramp Supervisor'),
        ('RAMP_AGENT', 'Ramp Agent'),
        ('APRON_CONTROLLER', 'Apron Controller'),
        # Ops control & dispatch roles
        ('DISPATCHER', 'Dispatcher'),
        ('LOAD_CONTROLLER', 'Load Controller'),
        ('FLIGHT_COORDINATOR', 'Flight Coordinator'),
        ('OCC_MANAGER', 'Operations Control Center Manager'),
        # Service supervisor roles
        ('FUEL_SUPERVISOR', 'Fuel Supervisor'),
        ('CATERING_SUPERVISOR', 'Catering Supervisor'),
        ('CLEANING_SUPERVISOR', 'Cleaning Supervisor'),
        ('CARGO_SUPERVISOR', 'Cargo Supervisor'),
        # Passenger-facing / regulatory roles
        ('IMMIGRATION_OFFICER', 'Immigration Officer'),
        ('CUSTOMS_OFFICER', 'Customs Officer'),
        # Airside vehicle roles
        ('AIRSIDE_DRIVER', 'Airside Driver'),
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
