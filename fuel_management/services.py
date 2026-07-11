"""
Business logic for aircraft fueling operations.
"""
from rest_framework.exceptions import ValidationError


class FuelOperationService:
    @staticmethod
    def validate_truck_capacity(fuel_truck, quantity_liters):
        if fuel_truck is None or quantity_liters is None:
            return
        if quantity_liters > fuel_truck.capacity_liters:
            raise ValidationError(
                f'Requested quantity ({quantity_liters}L) exceeds truck '
                f'{fuel_truck.truck_code}\'s capacity '
                f'({fuel_truck.capacity_liters}L).'
            )

    @staticmethod
    def validate_truck_availability(fuel_truck):
        if fuel_truck is not None and fuel_truck.status not in (
                'AVAILABLE', 'ASSIGNED', 'FUELING'):
            raise ValidationError(
                f'Fuel truck {fuel_truck.truck_code} is currently '
                f'"{fuel_truck.get_status_display()}" and cannot be '
                f'assigned to a new operation.'
            )

    @staticmethod
    def validate_time_window(fuel_start_time, fuel_end_time):
        if fuel_start_time and fuel_end_time and fuel_end_time < fuel_start_time:
            raise ValidationError(
                'Fuel end time cannot be earlier than fuel start time.')
