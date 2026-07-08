"""
What-If Simulation Engine
Read-only "what happens if X closes" predictions for the What-If Simulation Manager.
Nothing here writes to the database - it only reads current state and projects impact.
"""
from datetime import timedelta

from gates.models import Gate, GateAssignment
from turnaround.models import TurnaroundTask
from ground_equipment.models import EquipmentAssignment

REASSIGNMENT_DELAY_MINUTES = 20


def _find_alternative_gate(gate, excluded_gate_ids, aircraft):
    """Best-fit replacement gate: same type, open, not under maintenance,
    not already occupied, big enough for the aircraft."""
    candidates = (
        Gate.objects
        .filter(gate_type=gate.gate_type, is_available=True, is_under_maintenance=False)
        .exclude(id__in=excluded_gate_ids)
        .order_by('width', 'length')
    )
    for candidate in candidates:
        if GateAssignment.objects.filter(gate=candidate, status='assigned').exists():
            continue
        if aircraft and (candidate.width < aircraft.width or candidate.length < aircraft.length):
            continue
        return candidate
    return None


def simulate_gate_closure(gate):
    """
    Core 'what if Gate X closes' engine.
    Returns delayed_flights, new_gate_assignments, staff_changes, equipment_movement.
    """
    active_assignments = (
        GateAssignment.objects
        .filter(gate=gate, status='assigned')
        .select_related('flight', 'flight__aircraft', 'flight__airline')
    )
    affected_flights = [a.flight for a in active_assignments]

    delayed_flights = []
    new_gate_assignments = []
    used_alt_gate_ids = {gate.id}

    for flight in affected_flights:
        alt_gate = _find_alternative_gate(gate, used_alt_gate_ids, flight.aircraft)
        if alt_gate:
            used_alt_gate_ids.add(alt_gate.id)
            new_departure = flight.departure_time + timedelta(minutes=REASSIGNMENT_DELAY_MINUTES)
            delayed_flights.append({
                'flight_number': flight.flight_number,
                'airline': flight.airline.name,
                'original_departure': flight.departure_time.strftime('%H:%M'),
                'new_departure': new_departure.strftime('%H:%M'),
                'delay_minutes': REASSIGNMENT_DELAY_MINUTES,
                'reason': f'Reassigned from Gate {gate.gate_number} to Gate {alt_gate.gate_number}',
            })
            new_gate_assignments.append({
                'flight_number': flight.flight_number,
                'old_gate': gate.gate_number,
                'new_gate': alt_gate.gate_number,
            })
        else:
            delayed_flights.append({
                'flight_number': flight.flight_number,
                'airline': flight.airline.name,
                'original_departure': flight.departure_time.strftime('%H:%M'),
                'new_departure': None,
                'delay_minutes': None,
                'reason': 'No compatible open gate available - manual intervention required',
            })

    flight_ids = [f.id for f in affected_flights]

    staff_changes = []
    tasks = (
        TurnaroundTask.objects
        .filter(flight_id__in=flight_ids, status__in=['PENDING', 'IN_PROGRESS'])
        .select_related('assigned_staff', 'flight')
    )
    for task in tasks:
        if task.assigned_staff:
            staff_changes.append({
                'staff_name': task.assigned_staff.name,
                'employee_id': task.assigned_staff.employee_id,
                'flight_number': task.flight.flight_number,
                'task': task.get_task_type_display(),
                'action': 'Reassign to new gate location',
            })

    equipment_movement = []
    equipment_assignments = (
        EquipmentAssignment.objects
        .filter(flight_id__in=flight_ids, released_at__isnull=True)
        .select_related('equipment', 'equipment__equipment_type', 'flight')
    )
    for ea in equipment_assignments:
        equipment_movement.append({
            'equipment_id': ea.equipment.equipment_id,
            'equipment_type': ea.equipment.equipment_type.get_name_display(),
            'flight_number': ea.flight.flight_number,
            'action': f'Move from Gate {gate.gate_number} to reassigned gate',
        })

    return {
        'closed_gate': gate.gate_number,
        'affected_flight_count': len(affected_flights),
        'delayed_flights': delayed_flights,
        'new_gate_assignments': new_gate_assignments,
        'staff_changes': staff_changes,
        'equipment_movement': equipment_movement,
    }