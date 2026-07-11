from django.core.exceptions import ValidationError
from flights.models import FlightService
from staff.models import StaffAssignment
from gates.models import GateAssignment
from ground_equipment.models import EquipmentAssignment
from maintenance.models import MaintenanceRequest


class BusinessRuleValidator:
    """
    Centralized business rules validation for airport operations
    """

    # ============ FLIGHT DEPARTURE PREVENTION RULES ============

    @staticmethod
    def can_flight_depart(flight):
        """
        Check if flight can depart - validates all departure requirements
        Returns: (bool, str) - (can_depart, error_message)
        """

        # Rule 1: Crew must be assigned
        crew_assigned = StaffAssignment.objects.filter(
            flight=flight,
            role__in=['pilot', 'co_pilot', 'flight_engineer']
        ).exists()

        if not crew_assigned:
            return False, "Crew members not assigned to this flight"

        # Rule 2: Fueling must be complete
        fueling_service = FlightService.objects.filter(
            flight=flight,
            service_type='fueling',
            status='completed'
        ).exists()

        if not fueling_service:
            return False, "Fueling service not completed"

        # Rule 3: Cleaning must be complete
        cleaning_service = FlightService.objects.filter(
            flight=flight,
            service_type='cleaning',
            status='completed'
        ).exists()

        if not cleaning_service:
            return False, "Aircraft cleaning not completed"

        # Rule 4: Maintenance approval must be complete
        maintenance_pending = MaintenanceRequest.objects.filter(
            flight=flight,
            status__in=['pending', 'in_progress']
        ).exists()

        if maintenance_pending:
            return False, "Pending maintenance approvals exist"

        # Rule 5: Passenger count vs aircraft capacity
        if flight.passenger_count is not None and flight.passenger_count > flight.aircraft.capacity:
            return False, f"Passenger count ({flight.passenger_count}) exceeds aircraft capacity ({flight.aircraft.capacity})"

        return True, "All departure requirements met"

    # ============ STAFF ASSIGNMENT RULES ============

    @staticmethod
    def can_assign_staff_to_flight(staff, flight):
        """
        Check if staff can be assigned to flight
        Validates: No overlapping flight assignments
        """

        # Get all assigned flights for this staff
        overlapping = StaffAssignment.objects.filter(
            staff=staff
        ).filter(
            flight__departure_time__lt=flight.arrival_time,
            flight__arrival_time__gt=flight.departure_time
        ).exists()

        if overlapping:
            return False, f"Staff {staff.name} has overlapping flight assignments"

        return True, "Staff can be assigned to this flight"

    # ============ GATE ASSIGNMENT RULES ============

    @staticmethod
    def can_assign_gate_to_flight(gate, flight):
        """
        Check if gate can be assigned to flight
        Validates: Gate capacity, purpose (passenger/cargo), traffic type
        (domestic/international/swing), time conflicts, availability
        """

        # Rule 1: Gate capacity validation
        if flight.aircraft.width > gate.width or flight.aircraft.length > gate.length:
            return False, "Aircraft dimensions exceed gate capacity"

        # Rule 2: Gate purpose validation (Cargo gates are reserved for freight)
        if gate.purpose == 'cargo':
            return False, "Cannot assign a cargo gate to a passenger flight"

        # Rule 3: Gate type validation (Domestic/International/Swing)
        # Swing gates flex either way, so they skip this check entirely.
        if gate.gate_type == 'domestic' and flight.flight_type == 'international':
            return False, "Cannot assign domestic gate to international flight"

        if gate.gate_type == 'international' and flight.flight_type == 'domestic':
            return False, "Cannot assign international gate to domestic flight"

        # Rule 4: Gate availability during flight time
        overlapping_gates = GateAssignment.objects.filter(
            gate=gate,
            status='assigned'
        ).filter(
            flight__departure_time__lt=flight.arrival_time,
            flight__arrival_time__gt=flight.departure_time
        ).exists()

        if overlapping_gates:
            return False, "Gate is already assigned during this time period"

        # Rule 5: Gate maintenance status
        if gate.is_under_maintenance:
            return False, "Gate is under maintenance"

        return True, "Gate can be assigned to this flight"

    # ============ GROUND EQUIPMENT RULES ============

    @staticmethod
    def can_assign_equipment_to_flight(equipment, flight):
        """
        Check if equipment can be assigned to flight
        Validates: Equipment availability, conflicts, maintenance status
        """

        # Rule 1: Equipment must be available
        if equipment.status != 'available':
            return False, f"Equipment {equipment.equipment_id} is not available (Status: {equipment.get_status_display()})"

        # Rule 2: Equipment conflict detection - same equipment cannot be used
        # by overlapping flights
        conflicting = EquipmentAssignment.objects.filter(
            equipment=equipment,
            released_at__isnull=True
        ).filter(
            flight__departure_time__lt=flight.arrival_time,
            flight__arrival_time__gt=flight.departure_time
        ).exists()

        if conflicting:
            return False, f"Equipment {equipment.equipment_id} is already assigned to another flight during this time"

        return True, "Equipment can be assigned to this flight"

    # ============ FLIGHT SERVICE VALIDATION ============

    @staticmethod
    def validate_flight_services(flight):
        """
        Validates all required services for a flight
        Returns: (bool, list) - (all_valid, missing_services)
        """

        required_services = ['fueling', 'cleaning', 'catering']
        missing_services = []

        for service in required_services:
            exists = FlightService.objects.filter(
                flight=flight,
                service_type=service
            ).exists()

            if not exists:
                missing_services.append(service)

        return len(missing_services) == 0, missing_services

    # ============ PASSENGER VALIDATION ============

    @staticmethod
    def validate_passenger_count(flight):
        """
        Validates passenger count against aircraft capacity
        """

        if flight.passenger_count > flight.aircraft.capacity:
            raise ValidationError(
                f"Passenger count ({flight.passenger_count}) exceeds "
                f"aircraft capacity ({flight.aircraft.capacity})"
            )

        if flight.passenger_count < 0:
            raise ValidationError("Passenger count cannot be negative")

        return True

    # ============ GATE CAPACITY VALIDATION ============

    @staticmethod
    def validate_gate_capacity(gate, aircraft):
        """
        Validates aircraft fits in gate
        """

        if aircraft.width > gate.width:
            raise ValidationError(
                f"Aircraft width ({aircraft.width}m) exceeds gate width ({gate.width}m)"
            )

        if aircraft.length > gate.length:
            raise ValidationError(
                f"Aircraft length ({aircraft.length}m) exceeds gate length ({gate.length}m)"
            )

        return True

    # ============ GATE TYPE VALIDATION ============

    @staticmethod
    def validate_gate_type_for_flight(gate, flight):
        """
        Validates gate type matches flight type
        """

        if gate.purpose == 'cargo':
            raise ValidationError(
                "Cannot assign a cargo gate to a passenger flight"
            )

        if gate.gate_type == 'domestic' and flight.flight_type == 'international':
            raise ValidationError(
                "Cannot assign domestic gate to international flight"
            )

        if gate.gate_type == 'international' and flight.flight_type == 'domestic':
            raise ValidationError(
                "Cannot assign international gate to domestic flight"
            )

        return True
