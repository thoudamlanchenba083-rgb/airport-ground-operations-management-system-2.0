from django.db import models
from flights.models import Flight


class Baggage(models.Model):
    baggage_tag = models.CharField(max_length=50, unique=True)
    passenger_name = models.CharField(max_length=100)
    weight = models.DecimalField(max_digits=6, decimal_places=2)
    flight = models.ForeignKey(
        Flight,
        on_delete=models.CASCADE
    )

    def __str__(self):
        return self.baggage_tag


class BaggageTracking(models.Model):
    STATUS_CHOICES = [
        ('CHECKED_IN', 'Checked In'),
        ('LOADED', 'Loaded'),
        ('IN_TRANSIT', 'In Transit'),
        ('ARRIVED', 'Arrived'),
        ('CLAIMED', 'Claimed'),
    ]

    baggage = models.ForeignKey(
   
        Baggage,
        on_delete=models.CASCADE
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES
    )


    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.baggage.baggage_tag} - {self.status}"