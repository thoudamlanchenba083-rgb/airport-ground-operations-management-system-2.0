from django.db import models
from django.contrib.auth.models import User
from maintenance.models import MaintenanceRequest
from flights.models import Flight
from staff.models import Staff

class ApprovalRequest(models.Model):
    """
    Generic approval request model for all approval workflows
    """
    REQUEST_TYPE_CHOICES = [
        ('maintenance', 'Maintenance Request'),
        ('gate_change', 'Gate Change Request'),
        ('flight_delay', 'Flight Delay Approval'),
        ('emergency_flight', 'Emergency Flight Approval'),
        ('leave', 'Leave Approval'),
        ('shift_change', 'Shift Change Approval'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('on_hold', 'On Hold'),
    ]
    
    request_type = models.CharField(max_length=50, choices=REQUEST_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Generic relationships using content_type
    request_description = models.TextField()
    reason = models.TextField()
    
    # Flight association (if applicable)
    flight = models.ForeignKey(Flight, on_delete=models.CASCADE, null=True, blank=True, related_name='approval_requests')
    
    # Requested by
    requested_by = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True, related_name='approval_requests_created')
    
    # Approval chain
    approval_chain = models.ManyToManyField(Staff, through='ApprovalStep', related_name='approvals_pending')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    due_date = models.DateTimeField(null=True, blank=True)
    priority = models.CharField(
        max_length=20,
        choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('urgent', 'Urgent')],
        default='medium'
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Approval Request'
        verbose_name_plural = 'Approval Requests'
    
    def __str__(self):
        return f"{self.get_request_type_display()} - {self.get_status_display()}"
    
    @property
    def is_fully_approved(self):
        """Check if all approval steps are approved"""
        pending_steps = self.approval_steps.filter(status='pending').exists()
        return not pending_steps and self.status == 'approved'


class ApprovalStep(models.Model):
    """
    Individual step in an approval chain
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('skipped', 'Skipped'),
    ]
    
    approval_request = models.ForeignKey(ApprovalRequest, on_delete=models.CASCADE, related_name='approval_steps')
    approver = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='approval_steps')
    step_order = models.IntegerField(help_text="Order in approval chain")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Approval details
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['step_order']
        unique_together = ('approval_request', 'approver', 'step_order')
    
    def __str__(self):
        return f"{self.approval_request} - Step {self.step_order} ({self.approver.name})"


class MaintenanceApprovalRequest(models.Model):
    """
    Specific approval workflow for maintenance requests
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    maintenance_request = models.OneToOneField(MaintenanceRequest, on_delete=models.CASCADE, related_name='approval_request')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Approval chain
    tech_lead_approved = models.BooleanField(default=False)
    tech_lead_approved_at = models.DateTimeField(null=True, blank=True)
    tech_lead_approved_by = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True, blank=True, related_name='tech_approvals')
    
    manager_approved = models.BooleanField(default=False)
    manager_approved_at = models.DateTimeField(null=True, blank=True)
    manager_approved_by = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True, blank=True, related_name='manager_approvals')
    
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Maintenance Approval - {self.maintenance_request}"


class GateChangeApprovalRequest(models.Model):
    """
    Approval workflow for gate change requests
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    flight = models.ForeignKey(Flight, on_delete=models.CASCADE, related_name='gate_change_requests')
    old_gate_id = models.IntegerField()
    new_gate_id = models.IntegerField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    requested_by = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True, related_name='gate_changes_requested')
    approved_by = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True, blank=True, related_name='gate_changes_approved')
    approval_date = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Gate Change - {self.flight.flight_number} (Gate {self.old_gate_id} → {self.new_gate_id})"


class FlightDelayApprovalRequest(models.Model):
    """
    Approval workflow for flight delays
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    flight = models.ForeignKey(Flight, on_delete=models.CASCADE, related_name='delay_approvals')
    delay_minutes = models.IntegerField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    requested_by = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True, related_name='delays_requested')
    approved_by = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True, blank=True, related_name='delays_approved')
    approval_date = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Flight Delay - {self.flight.flight_number} (+{self.delay_minutes} min)"


class EmergencyFlightApprovalRequest(models.Model):
    """
    Approval workflow for emergency flights
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    flight = models.ForeignKey(Flight, on_delete=models.CASCADE, related_name='emergency_approvals')
    emergency_reason = models.TextField()
    severity = models.CharField(
        max_length=20,
        choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High'), ('critical', 'Critical')],
        default='high'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    requested_by = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True, related_name='emergency_flights_requested')
    approved_by = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True, blank=True, related_name='emergency_flights_approved')
    approval_date = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Emergency Flight - {self.flight.flight_number} ({self.get_severity_display()})"
