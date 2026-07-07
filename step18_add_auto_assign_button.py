path = "frontend/src/components/flights/TurnaroundTab.jsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add task_type -> equipment_type mapping, right after DELAY_REASONS
old_marker = """const STATUS_STYLES = {"""
new_marker = """// Maps each checklist task to the equipment category that would normally
// handle it, so "Auto-Assign" knows what to request. Tasks left out here
// (e.g. DEBOARDING, CABIN_CLEANING) don't have a dedicated vehicle type in
// the equipment model, so no Auto button is shown for them.
const TASK_EQUIPMENT_MAP = {
  CHOCKS_ON: 'gpu',
  BAGGAGE_UNLOADING: 'baggage_trolley',
  CATERING: 'catering_truck',
  FUELING: 'fuel_truck',
  CARGO_LOADING: 'tow_vehicle',
  BAGGAGE_LOADING: 'baggage_trolley',
  PUSHBACK_READY: 'pushback_tractor',
  PUSHBACK: 'pushback_tractor',
}

const STATUS_STYLES = {"""

if old_marker in content and "TASK_EQUIPMENT_MAP" not in content:
    content = content.replace(old_marker, new_marker, 1)
    print("TASK_EQUIPMENT_MAP added.")
else:
    print("Pattern not found or already applied, skipping.")

# 2. Add autoAssigning state + note state, next to existing state hooks
old_state = "  const [initializing, setInitializing] = useState(false)\n  const [error, setError] = useState('')"
new_state = (
    "  const [initializing, setInitializing] = useState(false)\n"
    "  const [autoAssigningTaskId, setAutoAssigningTaskId] = useState(null)\n"
    "  const [note, setNote] = useState('')\n"
    "  const [error, setError] = useState('')"
)
if old_state in content and "autoAssigningTaskId" not in content:
    content = content.replace(old_state, new_state, 1)
    print("New state hooks added.")
else:
    print("Pattern not found or already applied, skipping.")

# 3. Add the autoAssignEquipment function, right after updateTask
old_fn_end = """  const updateTask = async (taskId, patch) => {
    setError('')
    try {
      await axiosClient.patch(`/turnaround/turnaround-tasks/${taskId}/`, patch)
      loadTasks(selectedFlightId)
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to update task')
    }
  }"""

new_fn = old_fn_end + """

  const autoAssignEquipment = async (task) => {
    const equipmentType = TASK_EQUIPMENT_MAP[task.task_type]
    if (!equipmentType) return
    setError('')
    setNote('')
    setAutoAssigningTaskId(task.id)
    try {
      const res = await axiosClient.post('/ground-equipment/equipment/auto-assign/', {
        equipment_type: equipmentType,
        flight: selectedFlightId,
        turnaround_task: task.id,
      })
      const eq = res.data.assigned_equipment
      const reason = res.data.matched_by === 'gate_location_match'
        ? `matched to gate ${res.data.gate}`
        : 'nearest available unit'
      setNote(`Auto-assigned ${eq.equipment_id} (${eq.equipment_type_display}) — ${reason}.`)
      loadTasks(selectedFlightId)
    } catch (err) {
      setError(err.response?.data?.error || 'Auto-assign failed \u2014 no available equipment of that type.')
    } finally {
      setAutoAssigningTaskId(null)
    }
  }"""

if old_fn_end in content and "autoAssignEquipment" not in content:
    content = content.replace(old_fn_end, new_fn, 1)
    print("autoAssignEquipment function added.")
else:
    print("Pattern not found or already applied, skipping.")

# 4. Show the note banner next to the error banner
old_banner = '      {error && <p className="text-red-600 text-sm">{error}</p>}'
new_banner = (
    '      {error && <p className="text-red-600 text-sm">{error}</p>}\n'
    '      {note && <p className="text-green-600 dark:text-green-400 text-sm">{note}</p>}'
)
if old_banner in content and 'text-green-600 dark:text-green-400 text-sm">{note}' not in content:
    content = content.replace(old_banner, new_banner, 1)
    print("Note banner added.")
else:
    print("Pattern not found or already applied, skipping.")

# 5. Add the Auto button next to the equipment select in the table row
old_equipment_cell = """                  <td className="px-4 py-2">
                    <select
                      value={t.assigned_equipment || ''}
                      disabled={!canWrite}
                      onChange={(e) => updateTask(t.id, { assigned_equipment: e.target.value || null })}
                      style={{ colorScheme: 'dark' }}
                      className="bg-neutral-100 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded px-2 py-1 text-xs"
                    >
                      <option value="" className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">None</option>
                      {equipmentList.map(eq => <option key={eq.id} value={eq.id} className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">{eq.equipment_id}</option>)}
                    </select>
                  </td>"""

new_equipment_cell = """                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <select
                        value={t.assigned_equipment || ''}
                        disabled={!canWrite}
                        onChange={(e) => updateTask(t.id, { assigned_equipment: e.target.value || null })}
                        style={{ colorScheme: 'dark' }}
                        className="bg-neutral-100 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded px-2 py-1 text-xs"
                      >
                        <option value="" className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">None</option>
                        {equipmentList.map(eq => <option key={eq.id} value={eq.id} className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">{eq.equipment_id}</option>)}
                      </select>
                      {canWrite && TASK_EQUIPMENT_MAP[t.task_type] && (
                        <button
                          onClick={() => autoAssignEquipment(t)}
                          disabled={autoAssigningTaskId === t.id}
                          title="Auto-assign nearest available equipment"
                          className="text-[10px] font-semibold px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                        >
                          {autoAssigningTaskId === t.id ? '...' : 'Auto'}
                        </button>
                      )}
                    </div>
                  </td>"""

if old_equipment_cell in content and "autoAssignEquipment(t)" not in content:
    content = content.replace(old_equipment_cell, new_equipment_cell, 1)
    print("Auto button added to equipment cell.")
else:
    print("Pattern not found or already applied, skipping.")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done. TurnaroundTab.jsx updated.")
