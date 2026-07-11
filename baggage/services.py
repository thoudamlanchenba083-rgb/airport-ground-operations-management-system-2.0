"""
Business logic for baggage handling.
Kept out of views.py per the project's services-layer convention
(see docs/ARCHITECTURE.md) so the rules can be unit-tested and reused
without spinning up request/response cycles.
"""
from rest_framework.exceptions import ValidationError


class BaggageTrackingService:
    """Encapsulates the rules for valid baggage status transitions."""

    # A bag that has reached one of these terminal states shouldn't be
    # silently walked backwards through the pipeline again — that almost
    # always means a data-entry mistake rather than a real operational
    # event, and it would corrupt the tracking history/timeline.
    TERMINAL_STATES = {'CLAIMED', 'MISSING'}

    # Reasonable forward-only ordering of the normal happy path. MISSING can
    # be reached from anywhere (that's the point of a "missing" flag), so
    # it's deliberately not part of this sequence.
    NORMAL_SEQUENCE = ['CHECKED_IN', 'LOADED', 'IN_TRANSIT', 'ARRIVED', 'CLAIMED']

    @classmethod
    def validate_transition(cls, baggage, new_status):
        """
        Raises ValidationError if `new_status` is not a legal next status
        for this baggage item, based on its most recent tracking entry.
        """
        latest = baggage.tracking_history.first()
        current_status = latest.status if latest else None

        if current_status in cls.TERMINAL_STATES and new_status != 'MISSING':
            raise ValidationError(
                f'Baggage {baggage.baggage_tag} is already "{current_status}" '
                f'and cannot be moved to "{new_status}".'
            )

        if new_status in cls.NORMAL_SEQUENCE and current_status in cls.NORMAL_SEQUENCE:
            if cls.NORMAL_SEQUENCE.index(
                    new_status) < cls.NORMAL_SEQUENCE.index(current_status):
                raise ValidationError(
                    f'Cannot move baggage {baggage.baggage_tag} backwards from '
                    f'"{current_status}" to "{new_status}".'
                )

    @staticmethod
    def validate_weight(weight):
        if weight is not None and weight <= 0:
            raise ValidationError('Baggage weight must be greater than zero.')
