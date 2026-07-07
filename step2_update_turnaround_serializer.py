path = "turnaround/serializers.py"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_block = """class TurnaroundTaskSerializer(serializers.ModelSerializer):
    flight_number = serializers.CharField(source='flight.flight_number', read_only=True)
    assigned_staff_name = serializers.CharField(source='assigned_staff.name', read_only=True)
    completed_by_username = serializers.CharField(source='completed_by.username', read_only=True)
    duration_minutes = serializers.ReadOnlyField()
"""

new_block = """class TurnaroundTaskSerializer(serializers.ModelSerializer):
    flight_number = serializers.CharField(source='flight.flight_number', read_only=True)
    assigned_staff_name = serializers.CharField(source='assigned_staff.name', read_only=True)
    completed_by_username = serializers.CharField(source='completed_by.username', read_only=True)
    assigned_equipment_label = serializers.CharField(source='assigned_equipment.equipment_id', read_only=True)
    assigned_equipment_type = serializers.CharField(source='assigned_equipment.equipment_type.name', read_only=True)
    delay_reason_display = serializers.CharField(source='get_delay_reason_display', read_only=True)
    duration_minutes = serializers.ReadOnlyField()
"""

if old_block in content and "assigned_equipment_label" not in content:
    content = content.replace(old_block, new_block, 1)
    print("Serializer fields added.")
else:
    print("Pattern not found or already applied, skipping.")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done. turnaround/serializers.py updated.")
