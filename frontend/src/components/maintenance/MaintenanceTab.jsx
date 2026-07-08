import { useEffect, useState } from 'react'
import axiosClient from '../../api/axiosClient'

const PRIORITY_COLORS = {
  LOW:    'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH:   'bg-red-100 text-red-700',
}

const STATUS_COLORS = {
  OPEN:             'bg-blue-100 text-blue-700',
  PENDING_APPROVAL: 'bg-orange-100 text-orange-700',
  APPROVED:         'bg-green-100 text-green-700',
  REJECTED:         'bg-red-100 text-red-700',
  IN_PROGRESS:      'bg-purple-100 text-purple-700',
  RESOLVED:         'bg-teal-100 text-teal-700',
  CLOSED:           'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400',
}

const STATUSES   = ['OPEN','PENDING_APPROVAL','APPROVED','REJECTED','IN_PROGRESS','RESOLVED','CLOSED']
const PRIORITIES = ['LOW','MEDIUM','HIGH']

export default function MaintenanceTab() {
  const [requests,  setRequests]  = useState([])
  const [aircraft,  setAircraft]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [search,    setSearch]    = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showForm,  setShowForm]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [selected,  setSelected]  = useState(null)
  const [logs,      setLogs]      = useState([])
  const [logForm,   setLogForm]   = useState({ action_taken: '', completed_at: '' })
  const [form, setForm] = useState({
    aircraft: '', issue_description: '', priority: 'LOW', assigned_to: ''
  })

  const load = () => {
    setLoading(true)
    Promise.all([
      axiosClient.get('/maintenance/maintenance/'),
      axiosClient.get('/flights/aircraft/'),
    ])
      .then(([m, a]) => {
        setRequests(m.data.results ?? m.data)
        setAircraft(a.data.results ?? a.data)
      })
      .catch(() => setError('Failed to load maintenance data.'))
      .finally(() => setLoading(false))
  }

  const loadLogs = (req) => {
    setSelected(req)
    axiosClient.get(`/maintenance/maintenance-logs/?request=${req.id}`)
      .then(r => setLogs(r.data.results ?? r.data))
      .catch(() => setError('Failed to load logs.'))
  }

  useEffect(() => { load() }, [])

  const filtered = requests.filter(r => {
    const matchSearch = r.issue_description.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus ? r.status === filterStatus : true
    return matchSearch && matchStatus
  })

  const handleSubmit = () => {
    setSaving(true)
    axiosClient.post('/maintenance/maintenance/', form)
      .then(() => {
        load()
        setShowForm(false)
        setForm({ aircraft: '', issue_description: '', priority: 'LOW', assigned_to: '' })
      })
      .catch(() => setError('Failed to create request.'))
      .finally(() => setSaving(false))
  }

  const updateStatus = (req, status) => {
    axiosClient.patch(`/maintenance/maintenance/${req.id}/`, { status })
      .then(load)
      .catch(() => setError('Failed to update status.'))
  }

  const addLog = () => {
    axiosClient.post('/maintenance/maintenance-logs/', { ...logForm, request: selected.id })
      .then(() => {
        loadLogs(selected)
        setLogForm({ action_taken: '', completed_at: '' })
      })
      .catch(() => setError('Failed to add log.'))
  }

  const deleteRequest = (id) => {
    if (!window.confirm('Delete this maintenance request?')) return
    axiosClient.delete(`/maintenance/maintenance/${id}/`).then(load).catch(() => setError('Failed to delete.'))
  }

  if (loading) return <p className="text-neutral-500 dark:text-neutral-400 p-4">Loading maintenance...</p>

  return (
    <div>
      {error && <p className="text-red-500 mb-3 text-sm">{error}</p>}

      {/* Log drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="glass-strong w-full max-w-md h-full overflow-y-auto p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-neutral-900 dark:text-white">Logs — Request #{selected.id}</h3>
              <button onClick={() => setSelected(null)} className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-100 text-xl">✕</button>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4 bg-black/5 dark:bg-white/10 rounded p-2">{selected.issue_description}</p>

            {/* Status quick-change */}
            <div className="mb-4">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 font-medium">Change Status</p>
              <div className="flex flex-wrap gap-1">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => { updateStatus(selected, s); setSelected(prev => ({ ...prev, status: s })) }}
                    className={`text-xs px-2 py-1 rounded border ${selected.status === s ? 'bg-blue-600 text-white border-blue-600' : 'border-black/10 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10'}`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Add log */}
            <div className="glass rounded-xl p-3 mb-4 space-y-2">
              <textarea
                placeholder="Action taken..."
                value={logForm.action_taken}
                onChange={e => setLogForm(f => ({ ...f, action_taken: e.target.value }))}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm"
                rows={3}
              />
              <input
                type="datetime-local"
                value={logForm.completed_at}
                onChange={e => setLogForm(f => ({ ...f, completed_at: e.target.value }))}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={addLog}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg"
              >
                Add Log Entry
              </button>
            </div>

            {/* Log history */}
            <div className="space-y-3">
              {logs.length === 0 ? (
                <p className="text-neutral-400 dark:text-neutral-500 text-sm text-center py-4">No logs yet.</p>
              ) : logs.map(l => (
                <div key={l.id} className="glass rounded-xl p-3">
                  <p className="text-sm text-neutral-900 dark:text-neutral-100">{l.action_taken}</p>
                  {l.completed_at && (
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                      Completed: {new Date(l.completed_at).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by issue..."
          className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm flex-1 min-w-45 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
        />
        <select style={{ colorScheme: 'dark' }}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm"
        >
          <option value="" className="bg-neutral-800 text-white">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s} className="bg-neutral-800 text-white">{s.replace('_', ' ')}</option>)}
        </select>
        <button
          onClick={() => setShowForm(v => !v)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
        >
          {showForm ? 'Cancel' : '+ New Request'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="glass rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
          <select style={{ colorScheme: 'dark' }}
            value={form.aircraft}
            onChange={e => setForm(f => ({ ...f, aircraft: e.target.value }))}
            className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm"
          >
            <option value="" className="bg-neutral-800 text-white">Select Aircraft</option>
            {aircraft.map(a => (
              <option key={a.id} value={a.id} className="bg-neutral-800 text-white">{a.registration_number} — {a.model}</option>
            ))}
          </select>
          <select style={{ colorScheme: 'dark' }}
            value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm"
          >
            {PRIORITIES.map(p => <option key={p} value={p} className="bg-neutral-800 text-white">{p}</option>)}
          </select>
          <textarea
            placeholder="Issue description..."
            value={form.issue_description}
            onChange={e => setForm(f => ({ ...f, issue_description: e.target.value }))}
            className="col-span-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm"
            rows={2}
          />
          <div className="col-span-2 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-5 py-2 rounded-lg"
            >
              {saving ? 'Saving...' : 'Submit Request'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass rounded-[26px] overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-black/3 dark:bg-white/4 text-neutral-500 dark:text-neutral-400 uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Aircraft</th>
              <th className="px-4 py-3 text-left">Issue</th>
              <th className="px-4 py-3 text-left">Priority</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-neutral-400 dark:text-neutral-500 py-6">No maintenance requests found.</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="hover:bg-black/2 dark:hover:bg-white/3">
                <td className="px-4 py-3 text-neutral-400 dark:text-neutral-500 text-xs">#{r.id}</td>
                <td className="px-4 py-3 font-medium text-neutral-900 dark:text-white">
                  {aircraft.find(a => a.id === r.aircraft)?.registration_number ?? r.aircraft}
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300 max-w-xs truncate">{r.issue_description}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[r.priority]}`}>
                    {r.priority}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400'}`}>
                    {r.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button
                    onClick={() => loadLogs(r)}
                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded"
                  >
                    Logs
                  </button>
                  <button
                    onClick={() => deleteRequest(r.id)}
                    className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
