import re

path = "turnaround/models.py"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add import for GroundEquipment
old_import = "from flights.models import Flight"
new_import = "from flights.models import Flight\nfrom ground_equipment.models import GroundEquipment"
if old_import in content and new_import not in content:
    content = content.replace(old_import, new_import, 1)
    print("Import added.")
else:
    print("Import already present or pattern not found, skipping.")

# 2. Insert DELAY_REASON_CHOICES right before STATUS_CHOICES
old_status_block = "    STATUS_CHOICES = [\n        ('PENDING', 'Pending'),"
new_status_block = (
    "    DELAY_REASON_CHOICES = [\n"
    "        ('NONE', 'No Delay'),\n"
    "        ('FUEL', 'Fuel'),\n"
    "        ('WEATHER', 'Weather'),\n"
    "        ('CLEANING', 'Cleaning'),\n"
    "        ('CREW', 'Crew'),\n"
    "        ('GATE_UNAVAILABLE', 'Gate Unavailable'),\n"
    "        ('EQUIPMENT_UNAVAILABLE', 'Equipment Unavailable'),\n"
    "        ('BAGGAGE', 'Baggage Handling'),\n"
    "        ('CATERING', 'Catering'),\n"
    "        ('OTHER', 'Other'),\n"
    "    ]\n\n"
    "    STATUS_CHOICES = [\n        ('PENDING', 'Pending'),"
)
if old_status_block in content and "DELAY_REASON_CHOICES" not in content:
    content = content.replace(old_status_block, new_status_block, 1)
    print("DELAY_REASON_CHOICES added.")
else:
    print("DELAY_REASON_CHOICES already present or pattern not found, skipping.")

# 3. Add delay_reason and assigned_equipment fields after assigned_staff FK block
old_staff_block = (
    "    assigned_staff = models.ForeignKey(\n"
    "        'staff.Staff',\n"
    "        on_delete=models.SET_NULL,\n"
    "        null=True, blank=True,\n"
    "        related_name='turnaround_tasks'\n"
    "    )\n"
)
new_staff_block = old_staff_block + (
    "    assigned_equipment = models.ForeignKey(\n"
    "        GroundEquipment,\n"
    "        on_delete=models.SET_NULL,\n"
    "        null=True, blank=True,\n"
    "        related_name='turnaround_tasks'\n"
    "    )\n"
    "    delay_reason = models.CharField(\n"
    "        max_length=30,\n"
    "        choices=DELAY_REASON_CHOICES,\n"
    "        blank=True,\n"
    "        default='NONE'\n"
    "    )\n"
)
if old_staff_block in content and "assigned_equipment = models.ForeignKey" not in content:
    content = content.replace(old_staff_block, new_staff_block, 1)
    print("assigned_equipment and delay_reason fields added.")
else:
    print("Fields already present or pattern not found, skipping.")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done. turnaround/models.py updated.")
