from django.db import models
from flights.models import Flight


class Gate(models.Model):
    GATE_TYPE_CHOICES = [
        ('domestic', 'Domestic'),
        ('international', 'International'),
    ]

    gate_number = models.CharField(max_length=10, unique=True)
    terminal = models.CharField(max_length=50)
    is_available = models.BooleanField(default=True)
    gate_type = models.CharField(
        max_length=20,
        choices=GATE_TYPE_CHOICES,
        default='domestic'
    )
    width = models.DecimalField(max_digits=6, decimal_places=2, default=45.00,
                                 help_text='Usable width in meters, used for aircraft compatibility checks')
    length = models.DecimalField(max_digits=6, decimal_places=2, default=45.00,
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