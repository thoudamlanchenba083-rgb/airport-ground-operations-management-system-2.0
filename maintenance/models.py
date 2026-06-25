from django.db import models
from flights.models import Aircraft


class MaintenanceRequest(models.Model):
    aircraft = models.ForeignKey(
        Aircraft,
        on_delete=models.CASCADE
    )

    issue_description = models.TextField()

    priority = models.CharField(
        max_length=20,
        choices=[
            ('LOW', 'Low'),
            ('MEDIUM', 'Medium'),
            ('HIGH', 'High'),
        ]
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.aircraft.registration_number


class MaintenanceLog(models.Model):
    request = models.ForeignKey(
        MaintenanceRequest,
        on_delete=models.CASCADE
    )

    action_taken = models.TextField()

    completed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    def __str__(self):
        return f"Log {self.id}"