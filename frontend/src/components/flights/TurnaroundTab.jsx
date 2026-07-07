import { useEffect, useState, useCallback } from 'react'
import axiosClient from '../../api/axiosClient'
import { useAuth } from '../../context/AuthContext'

// Mirrors turnaround/models.py TASK_SEQUENCE — keep in sync if the backend changes.
const TASK_SEQUENCE = [
  ['CHOCKS_ON', 'Chocks On'],
  ['DEBOARDING', 'Passenger Deboarding'],
  ['BAGGAGE_UNLOADING', 'Baggage Unloading'],
  ['CABIN_CLEANING', 'Cabin Cleaning'],
  ['WATER_SERVICE', 'Water Service'],
  ['LAVATORY_SERVICE', 'Lavatory Service'],
  ['CATERING', 'Catering'],
  ['FUELING', 'Fueling'],
  ['CARGO_LOADING', 'Cargo Loading'],
  ['BAGGAGE_LOADING', 'Baggage Loading'],
  ['BOARDING_COMPLETE', 'Boarding Complete'],
  ['DOORS_CLOSED', 'Doors Closed'],
  ['PUSHBACK_READY', 'Pushback Ready'],
  ['PUSHBACK', 'Pushback'],
  ['TAKEOFF_READY', 'Takeoff Ready'],
]

const STATUS_CHOICES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'SKIPPED']

const DELAY_REASONS = [
  ['NONE', 'No Delay'],
  ['FUEL', 'Fuel'],
  ['WEATHER', 'Weather'],
  ['CLEANING', 'Cleaning'],
  ['CREW', 'Crew'],
  ['GATE_UNAVAILABLE', 'Gate Unavailable'],
  ['EQUIPMENT_UNAVAILABLE', 'Equipment Unavailable'],
  ['BAGGAGE', 'Baggage Handling'],
  ['CATERING', 'Catering'],
  ['OTHER', 'Other'],
]

// Maps each checklist task to the equipment category that would normally
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

const STATUS_STYLES = {
  PENDING: 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  COMPLETED: 'bg-green-500/10 text-green-600 dark:text-green-400',
  DELAYED: 'bg-red-500/10 text-red-600 dark:text-red-400',
  SKIPPED: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
}

export default function TurnaroundTab() {
  const { user } = useAuth()
  const canWrite = ['ADMIN', 'GROUND_STAFF', 'OPERATIONS_MANAGER', 'SUPERVISOR', 'GATE_MANAGER'].includes(user?.role)

  const [flights, setFlights] = useState([])
  const [selectedFlightId, setSelectedFlightId] = useState('')
  const [tasks, setTasks] = useState([])
  const [summary, setSummary] = useState(null)
  const [staffList, setStaffList] = useState([])
  const [equipmentList, setEquipmentList] = useState([])
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [autoAssigningTaskId, setAutoAssigningTaskId] = useState(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    axiosClient.get('/flights/flights/')
      .then((res) => setFlights(res.data.results || res.data))
      .catch(() => setError('Failed to load flights'))

    axiosClient.get('/staff/staff/')
      .then((res) => setStaffList(res.data.results || res.data))
      .catch(() => {})

    axiosClient.get('/ground-equipment/equipment/')
      .then((res) => setEquipmentList(res.data.results || res.data))
      .catch(() => {})
  }, [])

  const loadTasks = useCallback((flightId) => {
    if (!flightId) return
    setLoading(true)
    setError('')
    Promise.all([
      axiosClient.get('/turnaround/turnaround-tasks/', { params: { flight: flightId } }),
      axiosClient.get('/turnaround/turnaround-tasks/summary/', { params: { flight: flightId } }),
    ])
      .then(([tasksRes, summaryRes]) => {
        const list = tasksRes.data.results || tasksRes.data
        list.sort((a, b) => TASK_SEQUENCE.findIndex(t => t[0] === a.task_type) - TASK_SEQUENCE.findIndex(t => t[0] === b.task_type))
        setTasks(list)
        setSummary(summaryRes.data)
      })
      .catch(() => setError('Failed to load turnaround tasks'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedFlightId) loadTasks(selectedFlightId)
    else { setTasks([]); setSummary(null) }
  }, [selectedFlightId, loadTasks])

  const initializeTurnaround = async () => {
    if (!selectedFlightId) return
    setInitializing(true)
    setError('')
    try {
      const existingTypes = new Set(tasks.map(t => t.task_type))
      const missing = TASK_SEQUENCE.filter(([type]) => !existingTypes.has(type))
      for (const [task_type] of missing) {
        await axiosClient.post('/turnaround/turnaround-tasks/', {
          flight: selectedFlightId,
          task_type,
          status: 'PENDING',
        })
      }
      loadTasks(selectedFlightId)
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to initialize checklist')
    } finally {
      setInitializing(false)
    }
  }

  const updateTask = async (taskId, patch) => {
    setError('')
    try {
      await axiosClient.patch(`/turnaround/turnaround-tasks/${taskId}/`, patch)
      loadTasks(selectedFlightId)
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Failed to update task')
    }
  }

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
      setError(err.response?.data?.error || 'Auto-assign failed — no available equipment of that type.')
    } finally {
      setAutoAssigningTaskId(null)
    }
  }

  const selectedFlight = flights.find(f => String(f.id) === String(selectedFlightId))

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Flight</label>
          <select
            value={selectedFlightId}
            onChange={(e) => setSelectedFlightId(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="bg-neutral-100 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm min-w-[220px]"
          >
            <option value="" className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">Select a flight...</option>
            {flights.map((f) => (
              <option key={f.id} value={f.id} className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">{f.flight_number} — {f.status}</option>
            ))}
          </select>
        </div>

        {selectedFlightId && canWrite && (
          <button
            onClick={initializeTurnaround}
            disabled={initializing}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {initializing ? 'Setting up...' : 'Initialize / Sync Checklist'}
          </button>
        )}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {note && <p className="text-green-600 dark:text-green-400 text-sm">{note}</p>}

      {selectedFlightId && summary && (
        <div className="glass rounded-2xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {selectedFlight?.flight_number} Turnaround Progress
            </span>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">{summary.progress_percent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${summary.progress_percent}%` }}
            />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span>Completed: {summary.completed}</span>
            <span>In Progress: {summary.in_progress}</span>
            <span>Delayed: {summary.delayed}</span>
            <span>Pending: {summary.pending}</span>
          </div>
        </div>
      )}

      {loading && <p className="text-neutral-500 dark:text-neutral-400">Loading...</p>}

      {!loading && selectedFlightId && tasks.length === 0 && (
        <p className="text-neutral-400 dark:text-neutral-500 text-sm">
          No checklist yet for this flight. Click "Initialize / Sync Checklist" to create it.
        </p>
      )}

      {!loading && tasks.length > 0 && (
        <div className="glass rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/[0.03] dark:bg-white/[0.04] border-b border-black/5 dark:border-white/10 text-neutral-500 dark:text-neutral-400 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-2">Task</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Staff</th>
                <th className="px-4 py-2">Equipment</th>
                <th className="px-4 py-2">Delay Reason</th>
                <th className="px-4 py-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-b border-black/5 dark:border-white/5 text-neutral-800 dark:text-neutral-200">
                  <td className="px-4 py-2">{TASK_SEQUENCE.find(x => x[0] === t.task_type)?.[1] || t.task_type}</td>
                  <td className="px-4 py-2">
                    <select
                      value={t.status}
                      disabled={!canWrite}
                      onChange={(e) => updateTask(t.id, { status: e.target.value })}
                      style={{ colorScheme: 'dark' }}
                      className={`rounded px-2 py-1 text-xs border-0 ${STATUS_STYLES[t.status]}`}
                    >
                      {STATUS_CHOICES.map(s => <option key={s} value={s} className="bg-neutral-800 text-white">{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={t.assigned_staff || ''}
                      disabled={!canWrite}
                      onChange={(e) => updateTask(t.id, { assigned_staff: e.target.value || null })}
                      style={{ colorScheme: 'dark' }}
                      className="bg-neutral-100 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded px-2 py-1 text-xs"
                    >
                      <option value="" className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">Unassigned</option>
                      {staffList.map(s => <option key={s.id} value={s.id} className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">{s.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
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
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={t.delay_reason || 'NONE'}
                      disabled={!canWrite}
                      onChange={(e) => updateTask(t.id, { delay_reason: e.target.value })}
                      style={{ colorScheme: 'dark' }}
                      className="bg-neutral-100 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded px-2 py-1 text-xs"
                    >
                      {DELAY_REASONS.map(([val, label]) => <option key={val} value={val} className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white">{label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-xs text-neutral-500 dark:text-neutral-400">
                    {t.duration_minutes != null ? `${t.duration_minutes} min` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
