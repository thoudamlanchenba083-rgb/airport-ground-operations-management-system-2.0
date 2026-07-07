files = [
    "frontend/src/components/baggage/BaggageTab.jsx",
    "frontend/src/components/equipment/EquipmentTab.jsx",
    "frontend/src/components/flights/FlightsTab.jsx",
    "frontend/src/components/gates/GatesTab.jsx",
    "frontend/src/components/maintenance/MaintenanceTab.jsx",
    "frontend/src/components/reports/ReportsTab.jsx",
    "frontend/src/components/staff/PayrollTab.jsx",
    "frontend/src/components/staff/ShiftsTab.jsx",
    "frontend/src/components/staff/StaffTab.jsx",
]

total_fixed = 0

for path in files:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    count = content.count("<select")
    already_done = content.count("colorScheme")

    if count == 0:
        print(f"{path}: no <select> found, skipping")
        continue

    if already_done >= count:
        print(f"{path}: already patched, skipping")
        continue

    new_content = content.replace("<select", "<select style={{ colorScheme: 'dark' }}")

    # Fix hardcoded text-black on <option> tags -- these were readable on the
    # old default white dropdown, but turn invisible (black-on-dark) once the
    # select renders with a dark color-scheme.
    black_option_count = new_content.count('className="text-black"')
    new_content = new_content.replace(
        'className="text-black"',
        'className="bg-neutral-800 text-white"'
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"{path}: patched {count} <select> tag(s), fixed {black_option_count} option(s)")
    total_fixed += count

print(f"\nTotal <select> tags patched: {total_fixed}")
