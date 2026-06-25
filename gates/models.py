from django.db import models
from flights.models import Flight


class Gate(models.Model):
    gate_number = models.CharField(max_length=10, unique=True)
    terminal = models.CharField(max_length=50)
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return self.gate_number


class GateAssignment(models.Model):
    flight = models.ForeignKey(
        Flight,
        on_delete=models.CASCADE
    )

    gate = models.ForeignKey(
        Gate,
        on_delete=models.CASCADE
    )

    assigned_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.flight.flight_number} -> {self.gate.gate_number}"