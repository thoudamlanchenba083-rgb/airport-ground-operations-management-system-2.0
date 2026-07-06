import { useEffect, useState } from 'react'
import axiosClient from '../../api/axiosClient'
import { useAuth } from '../../context/AuthContext'

export default function AircraftTab() {
  const { user } = useAuth()
  const isViewer = user?.role === 'VIEWER'
  const [aircraft,  setAircraft]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [showForm,  setShowForm]  = useState(false)
  const [formError, setFormError] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [form, setForm] = useState({ registration_number: '', aircraft_type: '', capacity: '' })

  const load = () => {
    setLoading(true)
    axiosClient.get('/flights/aircraft/')
      .then(res => setAircraft(res.data.results ?? res.data))
      .catch(() => setError('Failed to load aircraft.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleAdd = async (e) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      await axiosClient.post('/flights/aircraft/', { ...form, capacity: Number(form.capacity) })
      setShowForm(false)
      setForm({ registration_number: '', aircraft_type: '', capacity: '' })
      load()
    } catch (err) {
      const d = err.response?.data
      setFormError(d ? Object.values(d).flat().join(' ') : 'Failed to add aircraft.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this aircraft?')) return
    try {
      await axiosClient.delete(`/flights/aircraft/${id}/`)
      load()
    } catch {
      alert('Failed to delete aircraft.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!isViewer && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            {showForm ? 'Cancel' : '+ Add Aircraft'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="glass rounded-2xl p-5">
          <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">New Aircraft</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Registration No.</label>
              <input name="registration_number" value={form.registration_number} onChange={handleChange} required placeholder="e.g. VT-ANQ" className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Aircraft Type</label>
              <input name="aircraft_type" value={form.aircraft_type} onChange={handleChange} required placeholder="e.g. Boeing 737" className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Capacity</label>
              <input type="number" name="capacity" value={form.capacity} onChange={handleChange} required min="1" placeholder="e.g. 180" className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          {formError && <p className="text-red-500 text-xs mt-3">{formError}</p>}
          <div className="mt-4">
            <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition">
              {saving ? 'Saving…' : 'Save Aircraft'}
            </button>
          </div>
        </form>
      )}

      {loading && <p className="text-sm text-neutral-500 dark:text-neutral-500 animate-pulse">Loading aircraft…</p>}
      {error   && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-black/[0.03] dark:bg-white/[0.04] text-neutral-500 dark:text-neutral-400 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-5 py-3">Registration No.</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Capacity</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {aircraft.length === 0 && (
                <tr><td colSpan="4" className="px-5 py-6 text-center text-neutral-400 dark:text-neutral-500">No aircraft found</td></tr>
              )}
              {aircraft.map(a => (
                <tr key={a.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition">
                  <td className="px-5 py-3 font-mono font-semibold text-blue-700">{a.registration_number}</td>
                  <td className="px-5 py-3 text-neutral-900 dark:text-neutral-100">{a.aircraft_type}</td>
                  <td className="px-5 py-3 text-neutral-600 dark:text-neutral-300">{a.capacity} seats</td>
                  <td className="px-5 py-3">
                    <button onClick={() => handleDelete(a.id)} className="text-red-500 hover:text-red-700 text-xs font-medium transition">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-black/5 dark:border-white/5 text-xs text-neutral-400 dark:text-neutral-500">{aircraft.length} aircraft</div>
        </div>
      )}
    </div>
  )
}
