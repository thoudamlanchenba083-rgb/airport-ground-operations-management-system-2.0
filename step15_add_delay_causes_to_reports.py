path = "frontend/src/components/reports/ReportsTab.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add import
old_import = "import axiosClient from '../../api/axiosClient'"
new_import = old_import + "\nimport DelayCausesCard from '../DelayCausesCard'"
if old_import in content and "DelayCausesCard" not in content:
    content = content.replace(old_import, new_import, 1)
    print("Import added.")
else:
    print("Import already present or pattern not found, skipping.")

# 2. Insert the card as its own section right before "Live Summaries"
old_block = """  return (
    <div>
      {/* Summary Cards */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Live Summaries</h3>"""

new_block = """  return (
    <div>
      {/* Delay Intelligence */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Delay Intelligence</h3>
        <DelayCausesCard />
      </div>

      {/* Summary Cards */}
      <div className="mb-6">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-3">Live Summaries</h3>"""

if old_block in content and "<DelayCausesCard" not in content:
    content = content.replace(old_block, new_block, 1)
    print("DelayCausesCard section inserted.")
else:
    print("Pattern not found or already applied, skipping.")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done. ReportsTab.jsx updated.")
