from django.db import models
from flights.models import Flight

class EquipmentType(models.Model):
    EQUIPMENT_CHOICES = [
        ('fuel_truck', 'Fuel Truck'),
        ('pushback_tractor', 'Pushback Tractor'),
        ('gpu', 'GPU (Ground Power Unit)'),
        ('baggage_trolley', 'Baggage Trolley'),
        ('tow_vehicle', 'Tow Vehicle'),
        ('conveyor_belt', 'Conveyor Belt'),
        ('catering_truck', 'Catering Truck'),
        ('deicing_truck', 'De-icing Truck'),
    ]
    
    name = models.CharField(max_length=100, choices=EQUIPMENT_CHOICES, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.get_name_display()


class GroundEquipment(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('in_use', 'In Use'),
        ('maintenance', 'Under Maintenance'),
        ('damaged', 'Damaged'),
    ]
    
    equipment_type = models.ForeignKey(EquipmentType, on_delete=models.CASCADE)
    equipment_id = models.CharField(max_length=50, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    location = models.CharField(max_length=100, blank=True)
    last_maintenance = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('equipment_type', 'equipment_id')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.equipment_type.get_name_display()} - {self.equipment_id}"


class EquipmentAssignment(models.Model):
    equipment = models.ForeignKey(GroundEquipment, on_delete=models.CASCADE)
    flight = models.ForeignKey(Flight, on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)
    released_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('equipment', 'flight')
        ordering = ['-assigned_at']
    
    def __str__(self):
        return f"{self.equipment} - {self.flight.flight_number}"
