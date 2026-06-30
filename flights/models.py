from django.db import models


class Airline(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10, unique=True)

    def __str__(self):
        return self.name


class Aircraft(models.Model):
    registration_number = models.CharField(max_length=20, unique=True)
    aircraft_type = models.CharField(max_length=100)
    capacity = models.PositiveIntegerField()

    def __str__(self):
        return self.registration_number


class Flight(models.Model):
    STATUS_CHOICES = [
        ('SCHEDULED', 'Scheduled'),
        ('GATE_ASSIGNED', 'Gate Assigned'),
        ('CREW_ASSIGNED', 'Ground Crew Assigned'),
        ('FUELING', 'Fuel Assigned'),
        ('CLEANING', 'Cleaning Started'),
        ('MAINTENANCE_CHECK', 'Maintenance Check'),
        ('BAGGAGE_LOADING', 'Baggage Loading'),
        ('BOARDING', 'Boarding'),
        ('GATE_CLOSED', 'Gate Closed'),
        ('PUSHBACK', 'Pushback'),
        ('TAXIING', 'Taxiing'),
        ('DEPARTED', 'Departed'),
        ('AIRBORNE', 'Airborne'),
        ('LANDING', 'Landing'),
        ('TAXI_TO_GATE', 'Taxi to Gate'),
        ('ARRIVED', 'Arrived'),
        ('DELAYED', 'Delayed'),
        ('CANCELLED', 'Cancelled'),
        ('EMERGENCY', 'Emergency'),
    ]

    # Ordered sequence used to enforce valid forward transitions for a normal departure flow
    WORKFLOW_ORDER = [
        'SCHEDULED',
        'GATE_ASSIGNED',
        'CREW_ASSIGNED',
        'FUELING',
        'CLEANING',
        'MAINTENANCE_CHECK',
        'BAGGAGE_LOADING',
        'BOARDING',
        'GATE_CLOSED',
        'PUSHBACK',
        'TAXIING',
        'DEPARTED',
    ]

    flight_number = models.CharField(max_length=20, unique=True)

    airline = models.ForeignKey(
        Airline,
        on_delete=models.CASCADE
    )

    aircraft = models.ForeignKey(
        Aircraft,
        on_delete=models.CASCADE
    )

    origin = models.CharField(max_length=100)
    destination = models.CharField(max_length=100)

    departure_time = models.DateTimeField()
    arrival_time = models.DateTimeField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='SCHEDULED'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['departure_time']),
            models.Index(fields=['arrival_time']),
            models.Index(fields=['flight_number']),
        ]

    def __str__(self):
        return self.flight_number


class FlightWorkflowStep(models.Model):
    """
    Tracks each ground-operations stage a flight passes through.
    One row per (flight, step) combination, recording who completed it and when.
    """
    STEP_CHOICES = [
        ('GATE_ASSIGNED', 'Gate Assigned'),
        ('CREW_ASSIGNED', 'Ground Crew Assigned'),
        ('FUELING', 'Fuel Assigned'),
        ('CLEANING', 'Cleaning Started'),
        ('MAINTENANCE_CHECK', 'Maintenance Check'),
        ('BAGGAGE_LOADING', 'Baggage Loading'),
        ('BOARDING', 'Boarding'),
        ('GATE_CLOSED', 'Gate Closed'),
        ('PUSHBACK', 'Pushback'),
        ('TAXIING', 'Taxiing'),
        ('DEPARTED', 'Departed/Takeoff'),
    ]

    flight = models.ForeignKey(
        Flight,
        on_delete=models.CASCADE,
        related_name='workflow_steps'
    )
    step = models.CharField(max_length=30, choices=STEP_CHOICES)
    completed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    completed_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = [['flight', 'step']]
        ordering = ['completed_at']

    def __str__(self):
        return f"{self.flight.flight_number} - {self.step}"
