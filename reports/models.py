from django.db import models
from accounts.models import User

class Report(models.Model):
    REPORT_TYPE_CHOICES = [
        ('FLIGHT', 'Flight Report'),
        ('BAGGAGE', 'Baggage Report'),
        ('MAINTENANCE', 'Maintenance Report'),
        ('STAFF', 'Staff Report'),
    ]

    title = models.CharField(max_length=255)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPE_CHOICES)
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.report_type}"