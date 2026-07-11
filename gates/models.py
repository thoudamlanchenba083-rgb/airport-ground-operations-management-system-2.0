from django.db import models
from flights.models import Flight


class Gate(models.Model):
    # Traffic type: which flights the gate is cleared to serve.
    # 'swing' gates can flex between domestic and international use
    # depending on the day's schedule.
    GATE_TYPE_CHOICES = [
        ('domestic', 'Domestic'),
        ('international', 'International'),
        ('swing', 'Swing'),
    ]

    # Physical connection between the terminal and the aircraft.
    CONNECTION_TYPE_CHOICES = [
        ('contact', 'Contact (Jet Bridge)'),
        ('remote', 'Remote (Apron Stand)'),
    ]

    # Aircraft size class the gate is built to serve.
    BODY_TYPE_CHOICES = [
        ('narrow_body', 'Narrow-Body'),
        ('wide_body', 'Wide-Body'),
    ]

    # What the gate is used for: moving passengers or handling freight.
    PURPOSE_CHOICES = [
        ('passenger', 'Passenger'),
        ('cargo', 'Cargo'),
    ]

    gate_number = models.CharField(max_length=10, unique=True)
    terminal = models.CharField(max_length=50)
    is_available = models.BooleanField(default=True)
    gate_type = models.CharField(
        max_length=20,
        choices=GATE_TYPE_CHOICES,
        default='domestic',
        help_text='Traffic type: domestic, international, or swing (either).'
    )
    connection_type = models.CharField(
        max_length=20,
        choices=CONNECTION_TYPE_CHOICES,
        default='contact',
        help_text='Contact (jet bridge) or remote (apron stand, bus transfer).'
    )
    body_type = models.CharField(
        max_length=20,
        choices=BODY_TYPE_CHOICES,
        default='narrow_body',
        help_text='Aircraft size class the gate is designed for.'
    )
    purpose = models.CharField(
        max_length=20,
        choices=PURPOSE_CHOICES,
        default='passenger',
        help_text='Passenger gate or dedicated cargo stand.'
    )
    width = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=45.00,
        help_text='Usable width in meters, used for aircraft compatibility checks')
    length = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=45.00,
        help_text='Usable length in meters, used for aircraft compatibility checks')
    is_under_maintenance = models.BooleanField(default=False)

    class Meta:
        ordering = ['gate_number']

    def __str__(self):
        return self.gate_number


class GateAssignment(models.Model):
    STATUS_CHOICES = [
        ('assigned', 'Assigned'),
        ('released', 'Released'),
    ]

    flight = models.ForeignKey(Flight, on_delete=models.CASCADE)
    gate = models.ForeignKey(Gate, on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='assigned'
    )

    class Meta:
        unique_together = [['flight', 'gate']]

    def __str__(self):
        return f"{self.flight.flight_number} -> {self.gate.gate_number}"
