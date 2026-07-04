import { useState, useEffect } from 'react'
import axiosClient from '../../api/axiosClient'

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const hr12 = ((hour + 11) % 12) + 1
  return `${hr12}:${m} ${suffix}`
}

export default function ShiftsTab() {
  const [shifts, setShifts] = useState([])
  const [schedules, setSchedules] = useState([])
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showShiftForm, setShowShiftForm] = useState(false)
  const [editShift, setEditShift] = useState(null)
  const [shiftForm, setShiftForm] = useState({ shift_name: '', start_time: '', end_time: '' })

  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({ staff: '', shift: '', date: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      setLoading(true)
      const [shiftRes, scheduleRes, staffRes] = await Promise.all([
        axiosClient.get('/staff/shifts/'),
        axiosClient.get('/staff/schedules/'),
        axiosClient.get('/staff/staff/'),
      ])
      setShifts(shiftRes.data.results ?? shiftRes.data)
      setSchedules(scheduleRes.data.results ?? scheduleRes.data)
      setStaffList(staffRes.data.results ?? staffRes.data)
    } catch (e) {
      setError('Failed to load shift data.')
    } finally {
      setLoading(false)
    }
  }

  // --- Shift definitions ---
  function openCreateShift() {
    setEditShift(null)
    setShiftForm({ shift_name: '', start_time: '', end_time: '' })
    setShowShiftForm(true)
  }

  function openEditShift(item) {
    setEditShift(item)
    setShiftForm({ shift_name: item.shift_name, start_time: item.start_time, end_time: item.end_time })
    setShowShiftForm(true)
  }

  async function handleShiftSubmit(e) {
    e.preventDefault()
    try {
      if (editShift) {
        await axiosClient.put(`/staff/shifts/${editShift.id}/`, shiftForm)
      } else {
        await axiosClient.post('/staff/shifts/', shiftForm)
      }
      setShowShiftForm(false)
      fetchAll()
    } catch (e) {
      alert('Error saving shift.')
    }
  }

  async function handleDeleteShift(id) {
    if (!confirm('Delete this shift? Any roster assignments using it will also be removed.')) return
    await axiosClient.delete(`/staff/shifts/${id}/`)
    fetchAll()
  }

  // --- Schedule / roster ---
  function openCreateSchedule() {
    setScheduleForm({ staff: '', shift: '', date: '' })
    setShowScheduleForm(true)
  }

  async function handleScheduleSubmit(e) {
    e.preventDefault()
    try {
      await axiosClient.post('/staff/schedules/', scheduleForm)
      setShowScheduleForm(false)
      fetchAll()
    } catch (e) {
      alert(e?.response?.data ? JSON.stringify(e.response.data) : 'Error assigning shift. Staff may already have a shift on this date.')
    }
  }

  async function handleDeleteSchedule(id) {
    if (!confirm('Remove this roster assignment?')) return
    await axiosClient.delete(`/staff/schedules/${id}/`)
    fetchAll()
  }

  if (loading) return <p className="text-gray-500 dark:text-neutral-400 p-4">Loading shifts...</p>
  if (error) return <p className="text-red-500 p-4">{error}</p>

  const sortedSchedules = [...schedules].sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div className="space-y-8">
      {/* Shift definitions */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">Shift Definitions</h3>
          <button onClick={openCreateShift} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">+ Add Shift</button>
        </div>

        {showShiftForm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 w-full max-w-sm shadow-xl">
              <h4 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">{editShift ? 'Edit Shift' : 'Add Shift'}</h4>
              <form onSubmit={handleShiftSubmit} className="space-y-3">
                <input required placeholder="Shift Name (e.g. Morning)" value={shiftForm.shift_name} onChange={e => setShiftForm({ ...shiftForm, shift_name: e.target.value })} className="w-full border border-gray-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white rounded px-3 py-2 text-sm" />
                <label className="block text-xs text-gray-500 dark:text-neutral-400">Start Time</label>
                <input required type="time" value={shiftForm.start_time} onChange={e => setShiftForm({ ...shiftForm, start_time: e.target.value })} className="w-full border border-gray-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white rounded px-3 py-2 text-sm" />
                <label className="block text-xs text-gray-500 dark:text-neutral-400">End Time</label>
                <input required type="time" value={shiftForm.end_time} onChange={e => setShiftForm({ ...shiftForm, end_time: e.target.value })} className="w-full border border-gray-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white rounded px-3 py-2 text-sm" />
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Save</button>
                  <button type="button" onClick={() => setShowShiftForm(false)} className="bg-gray-200 dark:bg-neutral-700 text-gray-800 dark:text-white px-4 py-2 rounded text-sm hover:bg-gray-300 dark:hover:bg-neutral-600">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm">
            <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300">
              <tr>
                <th className="px-4 py-2 text-left">Shift Name</th>
                <th className="px-4 py-2 text-left">Start Time</th>
                <th className="px-4 py-2 text-left">End Time</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shifts.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 dark:text-neutral-500">No shifts defined yet.</td></tr>
              )}
              {shifts.map(s => (
                <tr key={s.id} className="border-t border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-800 dark:text-neutral-200">
                  <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{s.shift_name}</td>
                  <td className="px-4 py-2">{formatTime(s.start_time)}</td>
                  <td className="px-4 py-2">{formatTime(s.end_time)}</td>
                  <td className="px-4 py-2 flex gap-2">
                    <button onClick={() => openEditShift(s)} className="text-blue-600 hover:underline text-xs">Edit</button>
                    <button onClick={() => handleDeleteShift(s.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roster / schedule assignment */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">Staff Roster</h3>
          <button onClick={openCreateSchedule} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">+ Assign Shift</button>
        </div>

        {showScheduleForm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 w-full max-w-sm shadow-xl">
              <h4 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Assign Shift</h4>
              <form onSubmit={handleScheduleSubmit} className="space-y-3">
                <select required value={scheduleForm.staff} onChange={e => setScheduleForm({ ...scheduleForm, staff: e.target.value })} className="w-full border border-gray-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white rounded px-3 py-2 text-sm">
                  <option value="">Select Staff</option>
                  {staffList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.employee_id})</option>)}
                </select>
                <select required value={scheduleForm.shift} onChange={e => setScheduleForm({ ...scheduleForm, shift: e.target.value })} className="w-full border border-gray-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white rounded px-3 py-2 text-sm">
                  <option value="">Select Shift</option>
                  {shifts.map(s => <option key={s.id} value={s.id}>{s.shift_name} ({formatTime(s.start_time)} - {formatTime(s.end_time)})</option>)}
                </select>
                <input required type="date" value={scheduleForm.date} onChange={e => setScheduleForm({ ...scheduleForm, date: e.target.value })} className="w-full border border-gray-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white rounded px-3 py-2 text-sm" />
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Assign</button>
                  <button type="button" onClick={() => setShowScheduleForm(false)} className="bg-gray-200 dark:bg-neutral-700 text-gray-800 dark:text-white px-4 py-2 rounded text-sm hover:bg-gray-300 dark:hover:bg-neutral-600">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm">
            <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Staff</th>
                <th className="px-4 py-2 text-left">Shift</th>
                <th className="px-4 py-2 text-left">Time</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedSchedules.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400 dark:text-neutral-500">No roster assignments yet.</td></tr>
              )}
              {sortedSchedules.map(sc => {
                const staffMember = staffList.find(s => s.id === sc.staff)
                const shift = shifts.find(s => s.id === sc.shift)
                return (
                  <tr key={sc.id} className="border-t border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-800 dark:text-neutral-200">
                    <td className="px-4 py-2">{sc.date}</td>
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{staffMember?.name ?? `#${sc.staff}`}</td>
                    <td className="px-4 py-2">{shift?.shift_name ?? `#${sc.shift}`}</td>
                    <td className="px-4 py-2">{shift ? `${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}` : '-'}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => handleDeleteSchedule(sc.id)} className="text-red-500 hover:underline text-xs">Remove</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
