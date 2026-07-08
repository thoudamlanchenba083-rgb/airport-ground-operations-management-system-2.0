from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .simulation import simulate_gate_closure
from gates.models import Gate, GateAssignment
from ground_equipment.models import GroundEquipment, EquipmentAssignment
from turnaround.models import TurnaroundTask


class DigitalTwinView(APIView):
    """
    GET /api/digital-twin/snapshot/

    Returns a live snapshot of the airport: every gate (with whicheverfrom django.shortcuts import get_object_or_404
from .simulation import simulate_gate_closure
from gates.models import Gate
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from gates.models import Gate, GateAssignment
from ground_equipment.models import GroundEquipment, EquipmentAssignment
from turnaround.models import TurnaroundTask
    flight currently occupies it, if any) and every piece of ground
    equipment (with whichever flight/gate it is currently working, if any).
    The frontend uses this single payload to render the 2D live map.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        gates_data = []
        for gate in Gate.objects.all().order_by('gate_number'):
            active = (
                GateAssignment.objects
                .filter(gate=gate, status='assigned')
                .select_related('flight', 'flight__airline')
                .first()
            )
            gates_data.append({
                'gate_number': gate.gate_number,
                'terminal': gate.terminal,
                'gate_type': gate.gate_type,
                'is_available': gate.is_available,
                'is_under_maintenance': gate.is_under_maintenance,
                'flight': None if not active else {
                    'flight_number': active.flight.flight_number,
                    'status': active.flight.status,
                    'airline': active.flight.airline.name,
                }
            })

        # Map flight_id -> gate_number for equipment lookups below
        flight_gate_map = {
            row['flight'].id: row['gate_number']
            for row in [
                {'flight': a.flight, 'gate_number': a.gate.gate_number}
                for a in GateAssignment.objects.filter(status='assigned').select_related('flight', 'gate')
            ]
        }

        equipment_data = []
        for eq in GroundEquipment.objects.select_related(
                'equipment_type').all():
            active = (
                EquipmentAssignment.objects
                .filter(equipment=eq, released_at__isnull=True)
                .select_related('flight')
                .first()
            )
            equipment_data.append({
                'equipment_id': eq.equipment_id,
                'type': eq.equipment_type.name,
                'type_display': eq.equipment_type.get_name_display(),
                'status': eq.status,
                'location': eq.location,
                'flight_number': None if not active else active.flight.flight_number,
                'assigned_gate': None if not active else flight_gate_map.get(active.flight.id),
            })

        summary = {
            'total_gates': len(gates_data),
            'occupied_gates': sum(
                1 for g in gates_data if g['flight']),
            'total_equipment': len(equipment_data),
            'equipment_in_use': sum(
                1 for e in equipment_data if e['status'] == 'in_use'),
        }

        return Response({
            'gates': gates_data,
            'equipment': equipment_data,
            'summary': summary,
        })


class GateHeatmapView(APIView):
    """
    GET /api/digital-twin/heatmap/

    Congestion score (0-100) per gate, based on:
      - currently occupied by a flight            (+30)
      - how many flights it has handled today      (+15 each, capped at +45)
      - how many of today's turnaround tasks for
        those flights are DELAYED                  (+10 each, capped at +40)
      - under maintenance forces score to 100 (always shown as high risk)

    level: 'low' (<33) / 'medium' (33-65) / 'high' (>=66)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        results = []

        for gate in Gate.objects.all().order_by('gate_number'):
            todays_assignments = GateAssignment.objects.filter(
                gate=gate, assigned_at__date=today)
            assignments_count = todays_assignments.count()
            flight_ids = list(
                todays_assignments.values_list(
                    'flight_id', flat=True))

            delayed_tasks_count = TurnaroundTask.objects.filter(
                flight_id__in=flight_ids, status='DELAYED'
            ).count() if flight_ids else 0

            is_occupied = GateAssignment.objects.filter(
                gate=gate, status='assigned').exists()

            score = 0
            if is_occupied:
                score += 30
            score += min(assignments_count * 15, 45)
            score += min(delayed_tasks_count * 10, 40)
            if gate.is_under_maintenance:
                score = 100
            score = min(score, 100)

            level = 'high' if score >= 66 else (
                'medium' if score >= 33 else 'low')

            results.append({
                'gate_number': gate.gate_number,
                'terminal': gate.terminal,
                'is_under_maintenance': gate.is_under_maintenance,
                'is_occupied': is_occupied,
                'flights_handled_today': assignments_count,
                'delayed_tasks_today': delayed_tasks_count,
                'score': score,
                'level': level,
            })

        avg_score = round(sum(r['score'] for r in results) /
                          len(results), 1) if results else 0
        busiest = max(results, key=lambda r: r['score']) if results else None

        return Response({
            'gates': results,
            'average_score': avg_score,
            'busiest_gate': busiest['gate_number'] if busiest else None,
        })


class WhatIfGateClosureView(APIView):
    """
    GET /api/digital-twin/what-if/gate-closure/<gate_number>/

    Manager asks "what if Gate 4 closes?" - this returns the predicted
    impact: delayed flights, reassigned gates, staff changes, and
    equipment that needs to move. Read-only, nothing is actually changed.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, gate_number):
        gate = get_object_or_404(Gate, gate_number=gate_number)
        result = simulate_gate_closure(gate)
        return Response(result)
