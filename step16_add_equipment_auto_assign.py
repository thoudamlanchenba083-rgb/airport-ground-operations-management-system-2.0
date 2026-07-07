path = "ground_equipment/views.py"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add needed imports
old_imports = "from ai_module.ml.predictor import predict_equipment_failure\nfrom core_app.permissions import IsAuthenticatedBlockGroundStaffWrite"
new_imports = (
    "from django.db import models\n"
    "from flights.models import Flight\n"
    "from gates.models import GateAssignment\n"
    "from ai_module.ml.predictor import predict_equipment_failure\n"
    "from core_app.permissions import IsAuthenticatedBlockGroundStaffWrite"
)
if old_imports in content and "from gates.models import GateAssignment" not in content:
    content = content.replace(old_imports, new_imports, 1)
    print("Imports added.")
else:
    print("Imports already present or pattern not found, skipping.")

# 2. Insert the auto_assign action right after release_equipment
marker = """        return Response({
            'message': 'Equipment released successfully',
            'equipment': GroundEquipmentSerializer(equipment).data
        })
    
    @action(detail=True, methods=['get'])
    def predict_failure(self, request, pk=None):"""

new_action = """        return Response({
            'message': 'Equipment released successfully',
            'equipment': GroundEquipmentSerializer(equipment).data
        })

    @action(detail=False, methods=['post'], url_path='auto-assign')
    def auto_assign(self, request):
        \"\"\"
        POST /api/ground-equipment/equipment/auto-assign/
        Body: { "equipment_type": "fuel_truck", "flight": <flight_id>, "turnaround_task": <optional task id> }

        Smart Equipment Allocation (Phase 1 #2): picks the best available
        unit of the requested type for a flight, without the user manually
        browsing/selecting equipment. Preference order:
          1. Available equipment whose free-text `location` matches the
             flight's currently assigned gate number or terminal.
          2. Any other available equipment of that type.
        Automatically creates the EquipmentAssignment and marks the
        equipment 'in_use'. If a turnaround_task id is passed, also links
        it to that task's assigned_equipment field.
        \"\"\"
        equipment_type_name = request.data.get('equipment_type')
        flight_id = request.data.get('flight')
        turnaround_task_id = request.data.get('turnaround_task')

        if not equipment_type_name or not flight_id:
            return Response({'error': 'equipment_type and flight are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            equipment_type = EquipmentType.objects.get(name=equipment_type_name)
        except EquipmentType.DoesNotExist:
            return Response({'error': f'Unknown equipment_type \"{equipment_type_name}\"'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            flight = Flight.objects.get(id=flight_id)
        except Flight.DoesNotExist:
            return Response({'error': 'Flight not found'}, status=status.HTTP_404_NOT_FOUND)

        candidates = GroundEquipment.objects.filter(equipment_type=equipment_type, status='available')
        if not candidates.exists():
            return Response(
                {'error': f'No available {equipment_type.get_name_display()} right now'},
                status=status.HTTP_404_NOT_FOUND
            )

        matched_by = 'fallback_any_available'
        chosen = None
        gate_assignment = GateAssignment.objects.filter(flight=flight, status='assigned').order_by('-assigned_at').first()

        if gate_assignment:
            gate = gate_assignment.gate
            location_matches = candidates.filter(
                models.Q(location__icontains=gate.gate_number) | models.Q(location__icontains=gate.terminal)
            ).order_by('equipment_id')
            if location_matches.exists():
                chosen = location_matches.first()
                matched_by = 'gate_location_match'

        if chosen is None:
            chosen = candidates.order_by('equipment_id').first()

        EquipmentAssignment.objects.create(equipment=chosen, flight=flight)
        chosen.status = 'in_use'
        chosen.save()

        task_updated = None
        if turnaround_task_id:
            from turnaround.models import TurnaroundTask
            try:
                task = TurnaroundTask.objects.get(id=turnaround_task_id, flight=flight)
                task.assigned_equipment = chosen
                task.save()
                task_updated = task.id
            except TurnaroundTask.DoesNotExist:
                pass

        return Response({
            'assigned_equipment': GroundEquipmentSerializer(chosen).data,
            'matched_by': matched_by,
            'gate': gate_assignment.gate.gate_number if gate_assignment else None,
            'turnaround_task_updated': task_updated,
        })

    @action(detail=True, methods=['get'])
    def predict_failure(self, request, pk=None):"""

if marker in content and "def auto_assign" not in content:
    content = content.replace(marker, new_action, 1)
    print("auto_assign action added.")
else:
    print("Pattern not found or already applied, skipping.")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done. ground_equipment/views.py updated.")
