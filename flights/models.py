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
        ('BOARDING', 'Boarding'),
        ('DEPARTED', 'Departed'),
        ('ARRIVED', 'Arrived'),
        ('CANCELLED', 'Cancelled'),
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

    def __str__(self):
        return self.flight_number