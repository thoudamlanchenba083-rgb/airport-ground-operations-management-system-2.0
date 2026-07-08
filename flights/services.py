"""
Business logic for flight ground-operations workflow.
Kept separate from views.py so validation rules can be tested, reused,
and read independently of HTTP/request concerns.
"""
from .models import Flight, FlightWorkflowStep


class FlightWorkflowError(Exception):
    """Raised when a workflow transition violates a business rule."""
    def __init__(self, message):
        self.message = message
        super().__init__(message)


class FlightWorkflowService:
    """Encapsulates all rules for advancing a flight through its ground-ops workflow."""

    @staticmethod
    def advance_step(flight: Flight, step: str, notes: str, user) -> Flight:
        """
        Validates and applies a single workflow step transition.
        Raises FlightWorkflowError on any rule violation.
        Returns the updated Flight on success.
        """
        valid_steps = dict(FlightWorkflowStep.STEP_CHOICES).keys()
        if step not in valid_steps:
            raise FlightWorkflowError(f'Invalid step "{step}".')

        order = Flight.WORKFLOW_ORDER
        try:
            current_idx = order.index(flight.status)
        except ValueError:
            current_idx = -1
        try:
            target_idx = order.index(step)
        except ValueError:
            raise FlightWorkflowError(f'"{step}" is not part of the normal workflow.')

        if target_idx != current_idx + 1:
            raise FlightWorkflowError(
                f'Cannot jump to "{step}" from "{flight.status}". Steps must be completed in order.'
            )

        FlightWorkflowService._check_gate_conflict(flight, step)
        FlightWorkflowService._check_maintenance(flight, step)
        FlightWorkflowService._check_baggage(flight, step)
        FlightWorkflowService._check_gate_close(flight, step)
        FlightWorkflowService._check_departure(flight, step, current_idx, order)

        FlightWorkflowStep.objects.update_or_create(
            flight=flight,
            step=step,
            defaults={
                'completed_by': user if user.is_authenticated else None,
                'notes': notes,
            }
        )
        flight.status = step
        flight.save(update_fields=['status', 'updated_at'])
        return flight
    @staticmethod
    def _check_gate_conflict(flight, step):
        if step != 'GATE_ASSIGNED':
            return
        from gates.models import GateAssignment
        existing = GateAssignment.objects.filter(flight=flight).first()
        if not existing:
            return
        order = Flight.WORKFLOW_ORDER
        conflict = GateAssignment.objects.filter(
            gate=existing.gate
        ).exclude(flight=flight).filter(
            flight__status__in=[s for s in order if s != 'DEPARTED']
        ).exists()
        if conflict:
            raise FlightWorkflowError(
                f'Gate {existing.gate.gate_number} is already assigned to another active flight.'
            )

    @staticmethod
    def _check_maintenance(flight, step):
        if step != 'MAINTENANCE_CHECK':
            return
        from maintenance.models import MaintenanceRequest
        open_issues = MaintenanceRequest.objects.filter(
            aircraft=flight.aircraft
        ).exclude(status__in=['RESOLVED', 'CLOSED', 'REJECTED']).exists()
        if open_issues:
            raise FlightWorkflowError(
                'Aircraft has unresolved maintenance requests. Cannot pass maintenance check.'
            )

    @staticmethod
    def _check_baggage(flight, step):
        if step != 'BOARDING':
            return
        from baggage.models import Baggage
        bags = Baggage.objects.filter(flight=flight)
        for bag in bags:
            latest = bag.tracking_history.first()
            if not latest or latest.status not in ['LOADED', 'IN_TRANSIT']:
                raise FlightWorkflowError(
                    f'Baggage {bag.baggage_tag} is not yet loaded. Cannot start boarding.'
                )

        from ai_module.ml.predictor import predict_baggage_weight_risk
        try:
            weight_result, _ = predict_baggage_weight_risk(flight)
            if weight_result['action_required']:
                raise FlightWorkflowError(
                    f"Cannot start boarding: total baggage weight "
                    f"({weight_result['total_baggage_kg']}kg) exceeds the weather-adjusted "
                    f"safe limit ({weight_result['safe_limit_kg']}kg) due to "
                    f"{weight_result['weather_risk_level'].lower()}-risk weather "
                    f"({weight_result['weather_conditions']}). "
                    f"Reduce baggage by {weight_result['over_limit_by_kg']}kg before boarding."
                )
        except FlightWorkflowError:
            raise
        except Exception:
            # Fail open if the weather/weight model itself errors (e.g. not trained yet)
            pass

    @staticmethod
    def _check_gate_close(flight, step):
        if step == 'GATE_CLOSED' and flight.status != 'BOARDING':
            raise FlightWorkflowError('Gate cannot be closed before boarding is complete.')

    @staticmethod
    def _check_departure(flight, step, current_idx, order):
        if step == 'DEPARTED' and current_idx + 1 != order.index('DEPARTED'):
            raise FlightWorkflowError('Flight cannot depart before all ground operations steps are complete.')