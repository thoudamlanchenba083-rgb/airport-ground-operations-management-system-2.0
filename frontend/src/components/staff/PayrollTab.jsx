import { useState, useEffect } from 'react'
import axiosClient from '../../api/axiosClient'
import { useAuth } from '../../context/AuthContext'

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-700',
  processed: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
}

function currency(n) {
  const num = Number(n ?? 0)
  return num.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
}

function monthLabel(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatApiError(e, fallback) {
  const data = e?.response?.data
  if (!data) return fallback
  const messages = data.message ?? data
  if (typeof messages === 'string') return messages
  if (typeof messages === 'object') {
    const lines = Object.entries(messages).map(([field, msgs]) => {
      const label = field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      const text = Array.isArray(msgs) ? msgs.join(' ') : String(msgs)
      return `${label}: ${text}`
    })
    if (lines.length) return lines.join('\n')
  }
  return fallback
}

export default function PayrollTab() {
  const { user } = useAuth()
  // Matches backend IsHRManagement (HasRole('HR','OPERATIONS_MANAGER','SUPERVISOR')):
  // generating payroll, editing records, deleting, and marking paid are
  // HR/management-only. Everyone can still view their own payroll (list/retrieve).
  const canWrite = ['ADMIN', 'HR', 'OPERATIONS_MANAGER', 'SUPERVISOR'].includes(user?.role)
  const [payroll, setPayroll] = useState([])
  const [staffList, setStaffList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [genMonth, setGenMonth] = useState('')
  const [form, setForm] = useState({
    staff: '', month: '', base_salary: '', overtime_hours: 0,
    overtime_rate: 0, deductions: 0, bonus: 0, status: 'pending',
  })

  useEffect(() => { fetchPayroll(); fetchStaff() }, [])

  async function fetchPayroll() {
    try {
      setLoading(true)
      const res = await axiosClient.get('/hr/payroll/')
      setPayroll(res.data.results ?? res.data)
    } catch (e) {
      setError('Failed to load payroll records.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchStaff() {
    try {
      const res = await axiosClient.get('/staff/staff/')
      setStaffList(res.data.results ?? res.data)
    } catch (e) {
      // non-fatal
    }
  }

  function openCreate() {
    setEditItem(null)
    setForm({ staff: '', month: '', base_salary: '', overtime_hours: 0, overtime_rate: 0, deductions: 0, bonus: 0, status: 'pending' })
    setShowForm(true)
  }

  function openEdit(item) {
    setEditItem(item)
    setForm({
      staff: item.staff, month: item.month, base_salary: item.base_salary,
      overtime_hours: item.overtime_hours, overtime_rate: item.overtime_rate,
      deductions: item.deductions, bonus: item.bonus, status: item.status,
    })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const payload = { ...form, month: form.month.length === 7 ? `${form.month}-01` : form.month }
      if (editItem) {
        await axiosClient.put(`/hr/payroll/${editItem.id}/`, payload)
      } else {
        await axiosClient.post('/hr/payroll/', payload)
      }
      setShowForm(false)
      fetchPayroll()
    } catch (e) {
      alert(formatApiError(e, 'Error saving payroll record.'))
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this payroll record?')) return
    await axiosClient.delete(`/hr/payroll/${id}/`)
    fetchPayroll()
  }

  async function handleMarkPaid(id) {
    if (!confirm('Mark this payroll record as paid?')) return
    try {
      await axiosClient.post(`/hr/payroll/${id}/mark_paid/`)
      fetchPayroll()
    } catch (e) {
      alert('Failed to mark as paid.')
    }
  }

  async function handleGenerate(e) {
    e.preventDefault()
    if (!genMonth) return
    try {
      await axiosClient.post('/hr/payroll/generate_payroll/', { month: `${genMonth}-01` })
      setShowGenerate(false)
      setGenMonth('')
      fetchPayroll()
    } catch (e) {
      alert(formatApiError(e, 'Failed to generate payroll.'))
    }
  }

  const totalNet = payroll.reduce((sum, p) => sum + Number(p.net_salary || 0), 0)
  const totalPending = payroll.filter(p => p.status !== 'paid').reduce((sum, p) => sum + Number(p.net_salary || 0), 0)

  if (loading) return <p className="text-neutral-500 dark:text-neutral-400 p-4">Loading payroll...</p>
  if (error) return <p className="text-red-500 p-4">{error}</p>

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Total Records</p>
          <p className="text-xl font-bold text-neutral-900 dark:text-white">{payroll.length}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Total Net Payout</p>
          <p className="text-xl font-bold text-neutral-900 dark:text-white">{currency(totalNet)}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Pending Payout</p>
          <p className="text-xl font-bold text-yellow-600">{currency(totalPending)}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Salary / Payroll</h3>
        <div className="flex gap-2">
          {canWrite && (
            <>
              <button onClick={() => setShowGenerate(true)} className="bg-black/5 dark:bg-white/10 text-neutral-800 dark:text-white px-4 py-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/15 text-sm border border-black/10 dark:border-white/10">Generate for Month</button>
              <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">+ Add Payroll Record</button>
            </>
          )}
        </div>
      </div>

      {showGenerate && canWrite && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-strong rounded-[26px] p-6 w-full max-w-sm">
            <h4 className="text-lg font-bold mb-4 text-neutral-900 dark:text-white">Generate Payroll</h4>
            <form onSubmit={handleGenerate} className="space-y-3">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Creates a pending payroll record for every staff member for the selected month (skips staff who already have one).</p>
              <input required type="month" value={genMonth} onChange={e => setGenMonth(e.target.value)} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm" />
              <div className="flex gap-2 pt-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Generate</button>
                <button type="button" onClick={() => setShowGenerate(false)} className="bg-black/5 dark:bg-white/10 text-neutral-800 dark:text-white px-4 py-2 rounded-lg text-sm hover:bg-black/10 dark:hover:bg-white/15">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showForm && canWrite && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-strong rounded-[26px] p-6 w-full max-w-md">
            <h4 className="text-lg font-bold mb-4 text-neutral-900 dark:text-white">{editItem ? 'Edit Payroll Record' : 'Add Payroll Record'}</h4>
            <form onSubmit={handleSubmit} className="space-y-3">
              <select style={{ colorScheme: 'dark' }} required value={form.staff} onChange={e => setForm({ ...form, staff: e.target.value })} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm">
                <option value="" className="bg-neutral-800 text-white">Select Staff</option>
                {staffList.map(s => <option key={s.id} value={s.id} className="bg-neutral-800 text-white">{s.name} ({s.employee_id})</option>)}
              </select>
              <div>
                <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Month</label>
                <input required type="month" value={form.month?.slice(0,7) ?? ''} onChange={e => setForm({ ...form, month: e.target.value })} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Base Salary</label>
                <input required type="number" step="0.01" min="0" placeholder="0.00" value={form.base_salary} onChange={e => setForm({ ...form, base_salary: e.target.value })} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Overtime Hours <span className="opacity-60">(max 999)</span></label>
                  <input type="number" step="0.01" min="0" max="999" value={form.overtime_hours} onChange={e => setForm({ ...form, overtime_hours: e.target.value })} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Overtime Rate <span className="opacity-60">(per hr)</span></label>
                  <input type="number" step="0.01" min="0" value={form.overtime_rate} onChange={e => setForm({ ...form, overtime_rate: e.target.value })} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Bonus</label>
                  <input type="number" step="0.01" min="0" value={form.bonus} onChange={e => setForm({ ...form, bonus: e.target.value })} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Deductions</label>
                  <input type="number" step="0.01" min="0" value={form.deductions} onChange={e => setForm({ ...form, deductions: e.target.value })} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <select style={{ colorScheme: 'dark' }} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm">
                <option value="pending" className="bg-neutral-800 text-white">Pending</option>
                <option value="processed" className="bg-neutral-800 text-white">Processed</option>
                <option value="paid" className="bg-neutral-800 text-white">Paid</option>
              </select>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Save</button>
                <button type="button" onClick={() => setShowForm(false)} className="bg-black/5 dark:bg-white/10 text-neutral-800 dark:text-white px-4 py-2 rounded-lg text-sm hover:bg-black/10 dark:hover:bg-white/15">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="glass rounded-[26px] overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-black/3 dark:bg-white/4 text-neutral-500 dark:text-neutral-400 uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-2 text-left">Staff</th>
              <th className="px-4 py-2 text-left">Month</th>
              <th className="px-4 py-2 text-left">Base Salary</th>
              <th className="px-4 py-2 text-left">Overtime</th>
              <th className="px-4 py-2 text-left">Bonus</th>
              <th className="px-4 py-2 text-left">Deductions</th>
              <th className="px-4 py-2 text-left">Net Salary</th>
              <th className="px-4 py-2 text-left">Status</th>
              {canWrite && <th className="px-4 py-2 text-left">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {payroll.length === 0 && (
              <tr><td colSpan={canWrite ? 9 : 8} className="px-4 py-6 text-center text-neutral-400 dark:text-neutral-500">No payroll records found.</td></tr>
            )}
            {payroll.map(p => (
              <tr key={p.id} className="border-t border-black/5 dark:border-white/5 hover:bg-black/2 dark:hover:bg-white/3 text-neutral-800 dark:text-neutral-200">
                <td className="px-4 py-2 font-medium text-neutral-900 dark:text-white">{p.staff_name}</td>
                <td className="px-4 py-2">{monthLabel(p.month)}</td>
                <td className="px-4 py-2">{currency(p.base_salary)}</td>
                <td className="px-4 py-2">{currency((p.overtime_hours || 0) * (p.overtime_rate || 0))}</td>
                <td className="px-4 py-2">{currency(p.bonus)}</td>
                <td className="px-4 py-2 text-red-500">-{currency(p.deductions)}</td>
                <td className="px-4 py-2 font-semibold text-neutral-900 dark:text-white">{currency(p.net_salary)}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[p.status] ?? 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300'}`}>
                    {p.status_display ?? p.status}
                  </span>
                </td>
                {canWrite && (
                  <td className="px-4 py-2">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline text-xs">Edit</button>
                      {p.status !== 'paid' && (
                        <button onClick={() => handleMarkPaid(p.id)} className="text-green-600 hover:underline text-xs">Mark Paid</button>
                      )}
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
