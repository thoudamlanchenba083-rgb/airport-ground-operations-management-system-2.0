from django.db import models
from flights.models import Flight


class CateringCompany(models.Model):
    name = models.CharField(max_length=100, unique=True)
    contact_phone = models.CharField(max_length=20, blank=True, default='')
    contact_email = models.EmailField(blank=True, default='')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Catering companies'

    def __str__(self):
        return self.name


class CateringOrder(models.Model):
    MEAL_TYPES = [
        ('STANDARD', 'Standard'),
        ('VEGETARIAN', 'Vegetarian'),
        ('VEGAN', 'Vegan'),
        ('DIABETIC', 'Diabetic'),
        ('KOSHER', 'Kosher'),
        ('HALAL', 'Halal'),
        ('GLUTEN_FREE', 'Gluten Free'),
        ('CHILD', 'Child Meal'),
        ('INFANT', 'Infant Meal'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PREPARING', 'Preparing'),
        ('IN_TRANSIT', 'In Transit'),
        ('LOADED', 'Loaded'),
        ('CANCELLED', 'Cancelled'),
    ]

    flight = models.ForeignKey(Flight, on_delete=models.CASCADE, related_name='catering_orders')
    catering_company = models.ForeignKey(
        CateringCompany, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders'
    )

    meal_type = models.CharField(max_length=20, choices=MEAL_TYPES, default='STANDARD')
    meal_count = models.PositiveIntegerField(default=0)
    is_special_meal = models.BooleanField(default=False)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    loading_completed = models.BooleanField(default=False)
    loaded_at = models.DateTimeField(null=True, blank=True)

    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['meal_type']),
        ]

    def __str__(self):
        return f"{self.flight.flight_number} - {self.get_meal_type_display()} x{self.meal_count} ({self.status})"