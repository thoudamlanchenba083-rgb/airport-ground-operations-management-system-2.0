from django.db import models
from django.conf import settings
from flights.models import Flight
from ground_equipment.models import GroundEquipment


class TurnaroundTask(models.Model):
    """
    Tracks every ground-operations activity that happens between an
    aircraft's arrival (chocks on) and its departure (takeoff ready).
    One row per (flight, task_type) combination.
    """

    TASK_TYPES = [
        ('CHOCKS_ON', 'Chocks On'),
        ('DEBOARDING', 'Passenger Deboarding'),
        ('FUELING', 'Fueling'),
        ('CATERING', 'Catering'),
        ('CABIN_CLEANING', 'Cabin Cleaning'),
        ('WATER_SERVICE', 'Water Service'),
        ('LAVATORY_SERVICE', 'Lavatory Service'),
        ('BAGGAGE_UNLOADING', 'Baggage Unloading'),
        ('BAGGAGE_LOADING', 'Baggage Loading'),
        ('CARGO_LOADING', 'Cargo Loading'),
        ('PUSHBACK_READY', 'Pushback Ready'),
        ('BOARDING_COMPLETE', 'Boarding Complete'),
        ('DOORS_CLOSED', 'Doors Closed'),
        ('PUSHBACK', 'Pushback'),
        ('TAKEOFF_READY', 'Takeoff Ready'),
    ]

    # Standard order of a normal turnaround; used to flag out-of-sequence completions
    TASK_SEQUENCE = [
        'CHOCKS_ON',
        'DEBOARDING',
        'BAGGAGE_UNLOADING',
        'CABIN_CLEANING',
        'WATER_SERVICE',
        'LAVATORY_SERVICE',
        'CATERING',
        'FUELING',
        'CARGO_LOADING',
        'BAGGAGE_LOADING',
        'BOARDING_COMPLETE',
        'DOORS_CLOSED',
        'PUSHBACK_READY',
        'PUSHBACK',
        'TAKEOFF_READY',
    ]

    DELAY_REASON_CHOICES = [
        ('NONE', 'No Delay'),
        ('FUEL', 'Fuel'),
        ('WEATHER', 'Weather'),
        ('CLEANING', 'Cleaning'),
        ('CREW', 'Crew'),
        ('GATE_UNAVAILABLE', 'Gate Unavailable'),
        ('EQUIPMENT_UNAVAILABLE', 'Equipment Unavailable'),
        ('BAGGAGE', 'Baggage Handling'),
        ('CATERING', 'Catering'),
        ('OTHER', 'Other'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('DELAYED', 'Delayed'),
        ('SKIPPED', 'Skipped'),
    ]

    flight = models.ForeignKey(
        Flight,
        on_delete=models.CASCADE,
        related_name='turnaround_tasks'
    )
    task_type = models.CharField(max_length=30, choices=TASK_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    scheduled_time = models.DateTimeField(null=True, blank=True)
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)

    assigned_staff = models.ForeignKey(
        'staff.Staff',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='turnaround_tasks'
    )
    assigned_equipment = models.ForeignKey(
        GroundEquipment,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='turnaround_tasks'
    )
    delay_reason = models.CharField(
        max_length=30,
        choices=DELAY_REASON_CHOICES,
        blank=True,
        default='NONE'
    )
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='completed_turnaround_tasks'
    )

    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [['flight', 'task_type']]
        ordering = ['flight', 'scheduled_time']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['task_type']),
        ]

    def __str__(self):
        return f"{self.flight.flight_number} - {self.get_task_type_display()} ({self.status})"

    @property
    def duration_minutes(self):
        if self.actual_start_time and self.actual_end_time:
            delta = self.actual_end_time - self.actual_start_time
            return round(delta.total_seconds() / 60, 1)
        return None