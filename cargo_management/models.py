from django.db import models
from flights.models import Flight


class ULD(models.Model):
    """Unit Load Device - container or pallet used to load cargo/baggage."""
    ULD_TYPE_CHOICES = [
        ('CONTAINER', 'Container'),
        ('PALLET', 'Pallet'),
    ]

    STATUS_CHOICES = [
        ('EMPTY', 'Empty'),
        ('LOADING', 'Loading'),
        ('LOADED', 'Loaded'),
        ('IN_TRANSIT', 'In Transit'),
        ('OFFLOADED', 'Offloaded'),
        ('DAMAGED', 'Damaged'),
    ]

    uld_id = models.CharField(max_length=20, unique=True, help_text='Container or pallet identifier, e.g. AKE12345')
    uld_type = models.CharField(max_length=20, choices=ULD_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='EMPTY')

    flight = models.ForeignKey(
        Flight, on_delete=models.SET_NULL, null=True, blank=True, related_name='ulds'
    )
    position = models.CharField(max_length=20, blank=True, default='', help_text='Aircraft hold position, e.g. AKE-1')
    weight_kg = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    max_weight_kg = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['uld_id']
        indexes = [
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.uld_id} ({self.get_uld_type_display()})"


class CargoManifest(models.Model):
    flight = models.OneToOneField(Flight, on_delete=models.CASCADE, related_name='cargo_manifest')
    manifest_number = models.CharField(max_length=50, unique=True)
    total_weight_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_finalized = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Manifest {self.manifest_number} - {self.flight.flight_number}"


class CargoItem(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('WAREHOUSE', 'In Warehouse'),
        ('LOADED', 'Loaded'),
        ('OFFLOADED', 'Offloaded'),
        ('DELIVERED', 'Delivered'),
    ]

    DG_CLASS_CHOICES = [
        ('', 'Not Dangerous Goods'),
        ('CLASS_1', 'Class 1 - Explosives'),
        ('CLASS_2', 'Class 2 - Gases'),
        ('CLASS_3', 'Class 3 - Flammable Liquids'),
        ('CLASS_4', 'Class 4 - Flammable Solids'),
        ('CLASS_5', 'Class 5 - Oxidizers'),
        ('CLASS_6', 'Class 6 - Toxic Substances'),
        ('CLASS_7', 'Class 7 - Radioactive'),
        ('CLASS_8', 'Class 8 - Corrosives'),
        ('CLASS_9', 'Class 9 - Miscellaneous'),
    ]

    manifest = models.ForeignKey(CargoManifest, on_delete=models.CASCADE, related_name='items')
    uld = models.ForeignKey(
        ULD, on_delete=models.SET_NULL, null=True, blank=True, related_name='cargo_items'
    )

    awb_number = models.CharField(max_length=30, blank=True, default='', help_text='Air Waybill number')
    description = models.CharField(max_length=200)
    weight_kg = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    is_dangerous_goods = models.BooleanField(default=False)
    dangerous_goods_class = models.CharField(max_length=20, choices=DG_CLASS_CHOICES, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['is_dangerous_goods']),
        ]

    def __str__(self):
        return f"{self.awb_number or 'AWB-N/A'} - {self.description[:30]}"