from django.db import models
from django.conf import settings
from flights.models import Flight


class Baggage(models.Model):
    class BaggageType(models.TextChoices):
        CARRY_ON = 'CARRY_ON', 'Carry-on (Cabin)'
        CHECKED = 'CHECKED', 'Checked'
        PERSONAL_ITEM = 'PERSONAL_ITEM', 'Personal Item'
        SPECIAL = 'SPECIAL', 'Special'

    baggage_tag = models.CharField(max_length=50, unique=True)
    passenger_name = models.CharField(max_length=100)
    weight = models.DecimalField(max_digits=6, decimal_places=2)
    flight = models.ForeignKey(Flight, on_delete=models.CASCADE)
    baggage_type = models.CharField(
        max_length=20,
        choices=BaggageType.choices,
        default=BaggageType.CHECKED,
        help_text=(
            'Carry-on: taken into the cabin by the passenger, subject to '
            'airline size/weight limits. Checked: handed over at check-in '
            'and transported in the cargo hold. Personal item: a small bag '
            '(handbag, laptop bag, small backpack) that fits under the seat '
            'in front. Special: items needing special handling (sports '
            'equipment, musical instruments, wheelchairs, strollers, '
            'fragile items), may involve extra fees or packing.'
        ),
    )
    is_special_handling = models.BooleanField(
        default=False,
        help_text='Set for special baggage requiring extra fees/packing (e.g. sports gear, instruments, wheelchairs, strollers, fragile items).'
    )
    special_handling_notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['baggage_tag']

    def __str__(self):
        return f"{self.baggage_tag} ({self.get_baggage_type_display()})"


class BaggageTracking(models.Model):
    STATUS_CHOICES = [
        ('CHECKED_IN', 'Checked In'),
        ('LOADED', 'Loaded'),
        ('IN_TRANSIT', 'In Transit'),
        ('ARRIVED', 'Arrived'),
        ('CLAIMED', 'Claimed'),
        ('MISSING', 'Missing'),
    ]

    baggage = models.ForeignKey(
        Baggage,
        on_delete=models.CASCADE,
        related_name='tracking_history')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    location = models.CharField(max_length=100, blank=True, default='')
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    updated_at = models.DateTimeField(auto_now=True)
    notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.baggage.baggage_tag} - {self.status} at {self.location}"
