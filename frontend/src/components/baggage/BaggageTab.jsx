import { useEffect, useState } from 'react'
import axiosClient from '../../api/axiosClient'
import { useAuth } from '../../context/AuthContext'

const STATUS_COLORS = {
  CHECKED_IN:  'bg-blue-100 text-blue-700',
  LOADED:      'bg-purple-100 text-purple-700',
  IN_TRANSIT:  'bg-yellow-100 text-yellow-700',
  ARRIVED:     'bg-green-100 text-green-700',
  CLAIMED:     'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300',
  MISSING:     'bg-red-100 text-red-700',
}

const STATUSES = ['CHECKED_IN', 'LOADED', 'IN_TRANSIT', 'ARRIVED', 'CLAIMED', 'MISSING']

export default function BaggageTab() {
  const { user } = useAuth()
  const isViewer = user?.role === 'VIEWER'
  const [baggage,   setBaggage]   = useState([])
  const [flights,   setFlights]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [search,    setSearch]    = useState('')
  const [showForm,  setShowForm]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [selected,  setSelected]  = useState(null)   // baggage item to view tracking
  const [tracking,  setTracking]  = useState([])
  const [trackForm, setTrackForm] = useState({ status: 'CHECKED_IN', location: '', notes: '' })
  const [form, setForm] = useState({
    baggage_tag: '', passenger_name: '', weight: '', flight: ''
  })

  const load = () => {
    setLoading(true)
    Promise.all([
      axiosClient.get('/baggage/baggage/'),
      axiosClient.get('/flights/flights/'),
    ])
      .then(([b, f]) => {
        setBaggage(b.data.results ?? b.data)
        setFlights(f.data.results ?? f.data)
      })
      .catch(() => setError('Failed to load baggage data.'))
      .finally(() => setLoading(false))
  }

  const loadTracking = (bag) => {
    setSelected(bag)
    axiosClient.get(`/baggage/baggage-tracking/?baggage=${bag.id}`)
      .then(r => setTracking(r.data.results ?? r.data))
      .catch(() => setError('Failed to load tracking.'))
  }

  useEffect(() => { load() }, [])

  const filtered = baggage.filter(b =>
    b.baggage_tag.toLowerCase().includes(search.toLowerCase()) ||
    b.passenger_name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSubmit = () => {
    setSaving(true)
    axiosClient.post('/baggage/baggage/', { ...form, weight: parseFloat(form.weight) })
      .then(() => { load(); setShowForm(false); setForm({ baggage_tag: '', passenger_name: '', weight: '', flight: '' }) })
      .catch(() => setError('Failed to save baggage.'))
      .finally(() => setSaving(false))
  }

  const addTracking = () => {
    axiosClient.post('/baggage/baggage-tracking/', { ...trackForm, baggage: selected.id })
      .then(() => {
        loadTracking(selected)
        setTrackForm({ status: 'CHECKED_IN', location: '', notes: '' })
      })
      .catch(() => setError('Failed to add tracking update.'))
  }

  const deleteBaggage = (id) => {
    if (!window.confirm('Delete this baggage record?')) return
    axiosClient.delete(`/baggage/baggage/${id}/`).then(load).catch(() => setError('Failed to delete.'))
  }

  if (loading) return <p className="text-gray-500 dark:text-neutral-400 p-4">Loading baggage...</p>

  return (
    <div>
      {error && <p className="text-red-500 mb-3 text-sm">{error}</p>}

      {/* Tracking drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md h-full overflow-y-auto shadow-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">Tracking — {selected.baggage_tag}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-neutral-100 text-xl">✕</button>
            </div>

            {/* Add tracking form */}
            <div className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-3 mb-4 space-y-2">
              <select
                value={trackForm.status}
                onChange={e => setTrackForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-gray-300 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white rounded px-3 py-2 text-sm"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
              <input
                placeholder="Location"
                value={trackForm.location}
                onChange={e => setTrackForm(f => ({ ...f, location: e.target.value }))}
                className="w-full border border-gray-300 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white rounded px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Notes (optional)"
                value={trackForm.notes}
                onChange={e => setTrackForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-gray-300 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white rounded px-3 py-2 text-sm"
                rows={2}
              />
              <button
                onClick={addTracking}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg"
              >
                Add Update
              </button>
            </div>

            {/* Tracking history */}
            <div className="space-y-3">
              {tracking.length === 0 ? (
                <p className="text-gray-400 dark:text-neutral-500 text-sm text-center py-4">No tracking history yet.</p>
              ) : tracking.map(t => (
                <div key={t.id} className="border border-gray-200 dark:border-neutral-800 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-neutral-500">{new Date(t.updated_at).toLocaleString()}</span>
                  </div>
                  {t.location && <p className="text-xs text-gray-600 dark:text-neutral-300">📍 {t.location}</p>}
                  {t.notes && <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">{t.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search + Add */}
      <div className="flex gap-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tag or passenger..."
          className="border border-gray-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {!isViewer && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
          >
            {showForm ? 'Cancel' : '+ Add Baggage'}
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && !isViewer && (
        <div className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-4 mb-4 grid grid-cols-2 gap-3">
          <input
            placeholder="Baggage Tag (e.g. BG001)"
            value={form.baggage_tag}
            onChange={e => setForm(f => ({ ...f, baggage_tag: e.target.value }))}
            className="border border-gray-300 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white rounded px-3 py-2 text-sm"
          />
          <input
            placeholder="Passenger Name"
            value={form.passenger_name}
            onChange={e => setForm(f => ({ ...f, passenger_name: e.target.value }))}
            className="border border-gray-300 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white rounded px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Weight (kg)"
            value={form.weight}
            onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
            className="border border-gray-300 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white rounded px-3 py-2 text-sm"
          />
          <select
            value={form.flight}
            onChange={e => setForm(f => ({ ...f, flight: e.target.value }))}
            className="border border-gray-300 dark:border-neutral-600 dark:bg-neutral-900 dark:text-white rounded px-3 py-2 text-sm"
          >
            <option value="">Select Flight</option>
            {flights.map(fl => (
              <option key={fl.id} value={fl.id}>{fl.flight_number}</option>
            ))}
          </select>
          <div className="col-span-2 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-5 py-2 rounded-lg"
            >
              {saving ? 'Saving...' : 'Save Baggage'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-700">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Tag</th>
              <th className="px-4 py-3 text-left">Passenger</th>
              <th className="px-4 py-3 text-left">Weight</th>
              <th className="px-4 py-3 text-left">Flight</th>
              <th className="px-4 py-3 text-left">Current Status</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-gray-400 dark:text-neutral-500 py-6">No baggage found.</td></tr>
            ) : filtered.map(b => (
              <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800">
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{b.baggage_tag}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-neutral-300">{b.passenger_name}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-neutral-300">{b.weight} kg</td>
                <td className="px-4 py-3 text-gray-600 dark:text-neutral-300">
                  {flights.find(f => f.id === b.flight)?.flight_number ?? b.flight}
                </td>
                <td className="px-4 py-3">
                  {b.current_status ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.current_status] ?? 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                      {b.current_status.replace('_', ' ')}
                    </span>
                  ) : <span className="text-gray-400 dark:text-neutral-500 text-xs">No status</span>}
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button
                    onClick={() => loadTracking(b)}
                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded"
                  >
                    Tracking
                  </button>
                  {!isViewer && (
                    <button
                      onClick={() => deleteBaggage(b.id)}
                      className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}