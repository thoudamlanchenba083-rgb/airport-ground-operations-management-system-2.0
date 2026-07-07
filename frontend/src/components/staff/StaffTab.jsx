import { useState, useEffect } from 'react'
import axiosClient from '../../api/axiosClient'

export default function StaffTab() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', employee_id: '', staff_type: 'GROUND', phone: '', email: '', is_active: true })

  const STAFF_TYPES = [
    { value: 'GROUND', label: 'Ground Staff' },
    { value: 'SECURITY', label: 'Security' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'SUPERVISOR', label: 'Supervisor' },
  ]

  useEffect(() => { fetchStaff() }, [])

  async function fetchStaff() {
    try {
      setLoading(true)
      const res = await axiosClient.get('/staff/staff/')
      setStaff(res.data.results ?? res.data)
    } catch (e) {
      setError('Failed to load staff.')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditItem(null)
    setForm({ name: '', employee_id: '', staff_type: 'GROUND', phone: '', email: '', is_active: true })
    setShowForm(true)
  }

  function openEdit(item) {
    setEditItem(item)
    setForm({ name: item.name, employee_id: item.employee_id, staff_type: item.staff_type, phone: item.phone, email: item.email, is_active: item.is_active })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (editItem) {
        await axiosClient.put(`/staff/staff/${editItem.id}/`, form)
      } else {
        await axiosClient.post('/staff/staff/', form)
      }
      setShowForm(false)
      fetchStaff()
    } catch (e) {
      alert('Error saving staff member.')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this staff member?')) return
    await axiosClient.delete(`/staff/staff/${id}/`)
    fetchStaff()
  }

  if (loading) return <p className="text-neutral-500 dark:text-neutral-400 p-4">Loading staff...</p>
  if (error) return <p className="text-red-500 p-4">{error}</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Staff Members</h3>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">+ Add Staff</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-strong rounded-2xl p-6 w-full max-w-md">
            <h4 className="text-lg font-bold mb-4 text-neutral-900 dark:text-white">{editItem ? 'Edit Staff' : 'Add Staff'}</h4>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input required placeholder="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm" />
              <input required placeholder="Employee ID" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm" />
              <select style={{ colorScheme: 'dark' }} value={form.staff_type} onChange={e => setForm({ ...form, staff_type: e.target.value })} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm">
                {STAFF_TYPES.map(t => <option key={t.value} value={t.value} className="bg-neutral-800 text-white">{t.label}</option>)}
              </select>
              <input required placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm" />
              <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm" />
              <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                Active
              </label>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Save</button>
                <button type="button" onClick={() => setShowForm(false)} className="bg-black/5 dark:bg-white/10 text-neutral-800 dark:text-white px-4 py-2 rounded-lg text-sm hover:bg-black/10 dark:hover:bg-white/15">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-black/[0.03] dark:bg-white/[0.04] text-neutral-500 dark:text-neutral-400 uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Employee ID</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Phone</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-neutral-400 dark:text-neutral-500">No staff members found.</td></tr>
            )}
            {staff.map(s => (
              <tr key={s.id} className="border-t border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] text-neutral-800 dark:text-neutral-200">
                <td className="px-4 py-2 font-medium text-neutral-900 dark:text-white">{s.name}</td>
                <td className="px-4 py-2">{s.employee_id}</td>
                <td className="px-4 py-2">{STAFF_TYPES.find(t => t.value === s.staff_type)?.label ?? s.staff_type}</td>
                <td className="px-4 py-2">{s.phone}</td>
                <td className="px-4 py-2">{s.email}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2 flex gap-2">
                  <button onClick={() => openEdit(s)} className="text-blue-600 hover:underline text-xs">Edit</button>
                  <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}