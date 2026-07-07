import { useEffect, useState } from 'react'
import axiosClient from '../../api/axiosClient'
import { useAuth } from '../../context/AuthContext'

const STATUS_COLORS = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  BOARDING:  'bg-purple-100 text-purple-700',
  DEPARTED:  'bg-yellow-100 text-yellow-700',
  ARRIVED:   'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  DELAYED:   'bg-orange-100 text-orange-700',
}

const STATUSES = ['SCHEDULED','BOARDING','DEPARTED','ARRIVED','DELAYED','CANCELLED']

// Mirrors Flight.WORKFLOW_ORDER on the backend. Used to figure out the next
// step for the "Advance" button, and to render a readable label for it.
const WORKFLOW_ORDER = [
  'SCHEDULED', 'GATE_ASSIGNED', 'CREW_ASSIGNED', 'FUELING', 'CLEANING',
  'MAINTENANCE_CHECK', 'BAGGAGE_LOADING', 'BOARDING', 'GATE_CLOSED',
  'PUSHBACK', 'TAXIING', 'DEPARTED', 'AIRBORNE', 'LANDING',
  'TAXI_TO_GATE', 'ARRIVED',
]

const STEP_LABELS = {
  SCHEDULED: 'Scheduled', GATE_ASSIGNED: 'Gate Assigned', CREW_ASSIGNED: 'Ground Crew Assigned',
  FUELING: 'Fuel Assigned', CLEANING: 'Cleaning Started', MAINTENANCE_CHECK: 'Maintenance Check',
  BAGGAGE_LOADING: 'Baggage Loading', BOARDING: 'Boarding', GATE_CLOSED: 'Gate Closed',
  PUSHBACK: 'Pushback', TAXIING: 'Taxiing', DEPARTED: 'Departed', AIRBORNE: 'Airborne',
  LANDING: 'Landing', TAXI_TO_GATE: 'Taxi to Gate', ARRIVED: 'Arrived (Landed)',
}

function nextWorkflowStep(status) {
  const idx = WORKFLOW_ORDER.indexOf(status)
  if (idx === -1 || idx === WORKFLOW_ORDER.length - 1) return null
  return WORKFLOW_ORDER[idx + 1]
}

function fmt(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function FlightsTab() {
  const { user } = useAuth()
  const isViewer = user?.role === 'VIEWER'
  const [flights,   setFlights]   = useState([])
  const [airlines,  setAirlines]  = useState([])
  const [aircraft,  setAircraft]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [search,    setSearch]    = useState('')
  const [showForm,  setShowForm]  = useState(false)
  const [formError, setFormError] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [form, setForm] = useState({
    flight_number: '', airline: '', aircraft: '',
    origin: '', destination: '',
    departure_time: '', arrival_time: '', status: 'SCHEDULED',
  })

  const load = () => {
    setLoading(true)
    Promise.all([
      axiosClient.get('/flights/flights/'),
      axiosClient.get('/flights/airlines/'),
      axiosClient.get('/flights/aircraft/'),
    ])
      .then(([f, a, ac]) => {
        setFlights(f.data.results  ?? f.data)
        setAirlines(a.data.results ?? a.data)
        setAircraft(ac.data.results ?? ac.data)
      })
      .catch(() => setError('Failed to load data.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleAdd = async (e) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      await axiosClient.post('/flights/flights/', form)
      setShowForm(false)
      setForm({ flight_number: '', airline: '', aircraft: '', origin: '', destination: '', departure_time: '', arrival_time: '', status: 'SCHEDULED' })
      load()
    } catch (err) {
      const d = err.response?.data
      setFormError(
        typeof d === 'string' ? d
        : d ? Object.values(d).flat().join(' ')
        : 'Failed to add flight.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this flight?')) return
    try {
      await axiosClient.delete(`/flights/flights/${id}/`)
      load()
    } catch {
      alert('Failed to delete flight.')
    }
  }

  const handleAdvance = async (flight) => {
    const step = nextWorkflowStep(flight.status)
    if (!step) return
    try {
      await axiosClient.post(`/flights/flights/${flight.id}/advance-step/`, { step })
      load()
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Failed to advance flight status.'
      alert(msg)
    }
  }

  const filtered = flights.filter(f =>
    f.flight_number?.toLowerCase().includes(search.toLowerCase()) ||
    f.airline_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.origin?.toLowerCase().includes(search.toLowerCase()) ||
    f.destination?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search flights, airline, route…"
          className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
        />
        {!isViewer && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            {showForm ? 'Cancel' : '+ Add Flight'}
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="glass rounded-2xl p-5">
          <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">New Flight</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Flight Number</label>
              <input name="flight_number" value={form.flight_number} onChange={handleChange} required placeholder="e.g. AI202" className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Airline</label>
              <select style={{ colorScheme: 'dark' }} name="airline" value={form.airline} onChange={handleChange} required className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="" className="bg-neutral-800 text-white">Select airline</option>
                {airlines.map(a => <option key={a.id} value={a.id} className="bg-neutral-800 text-white">{a.name} ({a.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Aircraft</label>
              <select style={{ colorScheme: 'dark' }} name="aircraft" value={form.aircraft} onChange={handleChange} required className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="" className="bg-neutral-800 text-white">Select aircraft</option>
                {aircraft.map(a => <option key={a.id} value={a.id} className="bg-neutral-800 text-white">{a.registration_number} — {a.aircraft_type}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Origin</label>
              <input name="origin" value={form.origin} onChange={handleChange} required placeholder="e.g. DEL" className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Destination</label>
              <input name="destination" value={form.destination} onChange={handleChange} required placeholder="e.g. BOM" className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Status</label>
              <select style={{ colorScheme: 'dark' }} name="status" value={form.status} onChange={handleChange} className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
                {STATUSES.map(s => <option key={s} value={s} className="bg-neutral-800 text-white">{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Departure Time</label>
              <input type="datetime-local" name="departure_time" value={form.departure_time} onChange={handleChange} required className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Arrival Time</label>
              <input type="datetime-local" name="arrival_time" value={form.arrival_time} onChange={handleChange} required className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          {formError && <p className="text-red-500 text-xs mt-3">{formError}</p>}
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition">
              {saving ? 'Saving…' : 'Save Flight'}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading && <p className="text-sm text-neutral-500 dark:text-neutral-500 animate-pulse">Loading flights…</p>}
      {error   && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-black/[0.03] dark:bg-white/[0.04] text-neutral-500 dark:text-neutral-400 uppercase text-xs tracking-wide">
                <tr>
                  <th className="px-5 py-3">Flight No.</th>
                  <th className="px-5 py-3">Airline</th>
                  <th className="px-5 py-3">Route</th>
                  <th className="px-5 py-3">Departure</th>
                  <th className="px-5 py-3">Arrival</th>
                  <th className="px-5 py-3">Status</th>
                  {!isViewer && <th className="px-5 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filtered.length === 0 && (
                  <tr><td colSpan="7" className="px-5 py-6 text-center text-neutral-400 dark:text-neutral-500">No flights found</td></tr>
                )}
                {filtered.map(f => (
                  <tr key={f.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition">
                    <td className="px-5 py-3 font-mono font-semibold text-blue-700">{f.flight_number}</td>
                    <td className="px-5 py-3 text-neutral-900 dark:text-neutral-100">{f.airline_name || f.airline}</td>
                    <td className="px-5 py-3 text-neutral-600 dark:text-neutral-300">{f.origin} → {f.destination}</td>
                    <td className="px-5 py-3 text-neutral-600 dark:text-neutral-300">{fmt(f.departure_time)}</td>
                    <td className="px-5 py-3 text-neutral-600 dark:text-neutral-300">{fmt(f.arrival_time)}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[f.status] || 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300'}`}>
                        {f.status}
                      </span>
                    </td>
                    {!isViewer && (
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {nextWorkflowStep(f.status) ? (
                            <button
                              onClick={() => handleAdvance(f)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium transition"
                              title={`Advance to ${STEP_LABELS[nextWorkflowStep(f.status)]}`}
                            >
                              Advance → {STEP_LABELS[nextWorkflowStep(f.status)]}
                            </button>
                          ) : (
                            <span className="text-xs text-neutral-400 dark:text-neutral-600">
                              {f.status === 'ARRIVED' ? 'Completed' : '—'}
                            </span>
                          )}
                          <button onClick={() => handleDelete(f.id)} className="text-red-500 hover:text-red-700 text-xs font-medium transition">
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-black/5 dark:border-white/5 text-xs text-neutral-400 dark:text-neutral-500">
            {filtered.length} of {flights.length} flights
          </div>
        </div>
      )}
    </div>
  )
}
