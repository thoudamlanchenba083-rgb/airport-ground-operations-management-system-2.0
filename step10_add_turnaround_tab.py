path = "frontend/src/pages/Flights.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add icon import (PlaneTakeoff for the turnaround tab) and component import
old_imports = "import { Plane, Building2, Cog } from 'lucide-react'\n"
new_imports = "import { Plane, Building2, Cog, ListChecks } from 'lucide-react'\n"
if old_imports in content and new_imports not in content:
    content = content.replace(old_imports, new_imports, 1)
    print("Icon import updated.")
else:
    print("Icon import already updated or pattern not found.")

old_component_import = "import FlightsTab   from '../components/flights/FlightsTab'\n"
new_component_import = old_component_import + "import TurnaroundTab from '../components/flights/TurnaroundTab'\n"
if old_component_import in content and "import TurnaroundTab" not in content:
    content = content.replace(old_component_import, new_component_import, 1)
    print("Component import added.")
else:
    print("Component import already added or pattern not found.")

# 2. Add tab entry
old_tabs = """const tabs = [
  { key: 'flights',  label: 'Flights',  icon: Plane },
  { key: 'airlines', label: 'Airlines', icon: Building2 },
  { key: 'aircraft', label: 'Aircraft', icon: Cog },
]"""
new_tabs = """const tabs = [
  { key: 'flights',    label: 'Flights',    icon: Plane },
  { key: 'turnaround', label: 'Turnaround', icon: ListChecks },
  { key: 'airlines',   label: 'Airlines',   icon: Building2 },
  { key: 'aircraft',   label: 'Aircraft',   icon: Cog },
]"""
if old_tabs in content and "turnaround" not in content:
    content = content.replace(old_tabs, new_tabs, 1)
    print("Tab entry added.")
else:
    print("Tab entry already added or pattern not found.")

# 3. Render the tab content
old_render = """        {activeTab === 'flights'  && <FlightsTab />}
        {activeTab === 'airlines' && <AirlinesTab />}
        {activeTab === 'aircraft' && <AircraftTab />}"""
new_render = """        {activeTab === 'flights'    && <FlightsTab />}
        {activeTab === 'turnaround' && <TurnaroundTab />}
        {activeTab === 'airlines'   && <AirlinesTab />}
        {activeTab === 'aircraft'   && <AircraftTab />}"""
if old_render in content and "<TurnaroundTab" not in content.split(old_render)[0]:
    content = content.replace(old_render, new_render, 1)
    print("Render block updated.")
else:
    print("Render block already updated or pattern not found.")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done. Flights.jsx updated.")
