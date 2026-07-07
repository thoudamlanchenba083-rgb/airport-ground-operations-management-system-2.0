path = "ground_equipment/views.py"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Import the existing business rule validator
old_imports = "from django.db import models\nfrom flights.models import Flight\nfrom gates.models import GateAssignment"
new_imports = (
    "from django.db import models\n"
    "from flights.models import Flight\n"
    "from gates.models import GateAssignment\n"
    "from core_app.business_rules import BusinessRuleValidator"
)
if old_imports in content and "BusinessRuleValidator" not in content:
    content = content.replace(old_imports, new_imports, 1)
    print("BusinessRuleValidator import added.")
else:
    print("Import already present or pattern not found, skipping.")

# 2. Replace the naive "first available" selection with one that actually
#    checks the existing overlap/conflict business rule before picking a unit
old_selection = """        matched_by = 'fallback_any_available'
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
        chosen.save()"""

new_selection = """        # Candidates ordered by preference: gate/terminal location match
        # first, then everything else. We then walk this ordered list and
        # pick the first unit that actually clears the existing
        # can_assign_equipment_to_flight business rule (status check +
        # overlapping-flight-time conflict check) rather than trusting the
        # `status` field alone, which can drift out of sync with the real
        # EquipmentAssignment history.
        gate_assignment = GateAssignment.objects.filter(flight=flight, status='assigned').order_by('-assigned_at').first()
        ordered_candidates = []

        if gate_assignment:
            gate = gate_assignment.gate
            location_matches = list(candidates.filter(
                models.Q(location__icontains=gate.gate_number) | models.Q(location__icontains=gate.terminal)
            ).order_by('equipment_id'))
            ordered_candidates.extend((c, 'gate_location_match') for c in location_matches)

        already_added_ids = {c.id for c, _ in ordered_candidates}
        fallback_candidates = candidates.exclude(id__in=already_added_ids).order_by('equipment_id')
        ordered_candidates.extend((c, 'fallback_any_available') for c in fallback_candidates)

        chosen = None
        matched_by = None
        for candidate, reason in ordered_candidates:
            ok, _reason_msg = BusinessRuleValidator.can_assign_equipment_to_flight(candidate, flight)
            if ok:
                chosen = candidate
                matched_by = reason
                break

        if chosen is None:
            return Response(
                {'error': f'All available {equipment_type.get_name_display()} units have a scheduling conflict with this flight.'},
                status=status.HTTP_409_CONFLICT
            )

        EquipmentAssignment.objects.create(equipment=chosen, flight=flight)
        chosen.status = 'in_use'
        chosen.save()"""

if old_selection in content and "ordered_candidates" not in content:
    content = content.replace(old_selection, new_selection, 1)
    print("Selection logic replaced with conflict-safe version.")
else:
    print("Pattern not found or already applied, skipping.")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done. ground_equipment/views.py updated.")
