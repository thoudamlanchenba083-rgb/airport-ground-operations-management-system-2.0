"""
Business logic for gate assignment — kept separate from views.py.
Wraps core_app.business_rules.BusinessRuleValidator with the actual
assignment/release side-effects (availability toggling, candidate selection).
"""
import logging
from .models import Gate, GateAssignment
from core_app.business_rules import BusinessRuleValidator

logger = logging.getLogger('gates')


class GateAssignmentError(Exception):
    """Raised when a gate assignment/auto-assignment cannot be completed."""
    def __init__(self, message, details=None):
        self.message = message
        self.details = details or []
        super().__init__(message)


class GateAssignmentService:

    @staticmethod
    def assign(gate: Gate, flight, user) -> GateAssignment:
        """Validates and creates a manual gate assignment, toggling gate availability."""
        can_assign, reason = BusinessRuleValidator.can_assign_gate_to_flight(gate, flight)
        if not can_assign:
            logger.warning(f"Gate assignment failed: {reason} (attempted by {user})")
            raise GateAssignmentError(reason)

        instance = GateAssignment.objects.create(gate=gate, flight=flight)
        gate.is_available = False
        gate.save()
        logger.info(f"Gate {gate.gate_number} assigned to flight {flight} by {user}")
        return instance

    @staticmethod
    def release(assignment: GateAssignment):
        """Frees up the gate when an assignment is removed."""
        gate = assignment.gate
        gate.is_available = True
        gate.save()
    @staticmethod
    def auto_assign(flight, user) -> GateAssignment:
        """
        Picks the best available gate for a flight: filters to matching
        gate_type + available + not-under-maintenance, ordered smallest-fit
        first (keeps larger gates free for bigger aircraft), then walks each
        candidate through the full BusinessRuleValidator check (also catches
        time-overlap conflicts the initial filter can't).
        Raises GateAssignmentError if no gate fits without conflict.
        """
        candidates = Gate.objects.filter(
            is_available=True,
            is_under_maintenance=False,
            gate_type=flight.flight_type,
        ).order_by('width', 'length', 'gate_number')

        chosen = None
        reasons_tried = []
        for gate in candidates:
            ok, reason = BusinessRuleValidator.can_assign_gate_to_flight(gate, flight)
            if ok:
                chosen = gate
                break
            reasons_tried.append(f'{gate.gate_number}: {reason}')

        if chosen is None:
            raise GateAssignmentError(
                f'No available {flight.get_flight_type_display()} gate currently fits '
                f'this flight without a conflict.',
                details=reasons_tried,
            )

        instance = GateAssignment.objects.create(flight=flight, gate=chosen)
        chosen.is_available = False
        chosen.save()
        logger.info(f"Gate {chosen.gate_number} auto-assigned to flight {flight.flight_number} by {user}")
        return instance