import { useEffect, useState } from 'react'
import axiosClient from '../../api/axiosClient'
import { useAuth } from '../../context/AuthContext'

export default function GatesTab() {
  const { user } = useAuth()
  const canWrite = ['ADMIN', 'GATE_MANAGER', 'OPERATIONS_MANAGER', 'GROUND_STAFF'].includes(user?.role)
  const [gates, setGates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ gate_number: '', terminal: '', is_available: true })

  const load = () => {
    setLoading(true)
    axiosClient.get('/gates/gates/')
      .then(r => setGates(r.data.results ?? r.data))
      .catch(() => setError('Failed to load gates.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = gates.filter(g =>
    g.gate_number.toLowerCase().includes(search.toLowerCase()) ||
    g.terminal.toLowerCase().includes(search.toLowerCase())
  )

  const handleSubmit = () => {
    setSaving(true)
    axiosClient.post('/gates/gates/', form)
      .then(() => { load(); setShowForm(false); setForm({ gate_number: '', terminal: '', is_available: true }) })
      .catch(() => setError('Failed to save gate.'))
      .finally(() => setSaving(false))
  }

  const toggleAvailability = (gate) => {
    axiosClient.patch(`/gates/gates/${gate.id}/`, { is_available: !gate.is_available })
      .then(load)
      .catch(() => setError('Failed to update gate.'))
  }

  const deleteGate = (id) => {
    if (!window.confirm('Delete this gate?')) return
    axiosClient.delete(`/gates/gates/${id}/`).then(load).catch(() => setError('Failed to delete.'))
  }

  if (loading) return <p className="text-neutral-500 dark:text-neutral-400 p-4">Loading gates...</p>

  return (
    <div>
      {error && <p className="text-red-500 mb-3 text-sm">{error}</p>}

      <div className="flex gap-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search gate or terminal..."
          className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
        />
        {canWrite && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
          >
            {showForm ? 'Cancel' : '+ Add Gate'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="glass rounded-xl p-4 mb-4 grid grid-cols-3 gap-3">
          <input
            placeholder="Gate Number (e.g. A1)"
            value={form.gate_number}
            onChange={e => setForm(f => ({ ...f, gate_number: e.target.value }))}
            className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Terminal (e.g. Terminal 1)"
            value={form.terminal}
            onChange={e => setForm(f => ({ ...f, terminal: e.target.value }))}
            className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm"
          />
          <select style={{ colorScheme: 'dark' }}
            value={form.is_available}
            onChange={e => setForm(f => ({ ...f, is_available: e.target.value === 'true' }))}
            className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm"
          >
            <option value="true" className="bg-neutral-800 text-white">Available</option>
            <option value="false" className="bg-neutral-800 text-white">Unavailable</option>
          </select>
          <div className="col-span-3 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-5 py-2 rounded-lg"
            >
              {saving ? 'Saving...' : 'Save Gate'}
            </button>
          </div>
        </div>
      )}

      <div className="glass rounded-[26px] overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-black/3 dark:bg-white/4 text-neutral-500 dark:text-neutral-400 uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Gate</th>
              <th className="px-4 py-3 text-left">Terminal</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-neutral-400 dark:text-neutral-500 py-6">No gates found.</td></tr>
            ) : filtered.map(g => (
              <tr key={g.id} className="hover:bg-black/2 dark:hover:bg-white/3">
                <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">{g.gate_number}</td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{g.terminal}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${g.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {g.is_available ? 'Available' : 'Unavailable'}
                  </span>
                </td>
                {canWrite && (
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      onClick={() => toggleAvailability(g)}
                      className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded"
                    >
                      Toggle
                    </button>
                    <button
                      onClick={() => deleteGate(g.id)}
                      className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded"
                    >
                      Delete
                    </button>
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