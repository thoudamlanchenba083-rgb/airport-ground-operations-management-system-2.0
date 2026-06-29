import { useEffect, useState } from 'react'
import axiosClient from '../../api/axiosClient'

const STATUS_COLORS = {
  SCHEDULED: 'bg-blue-100 text-blue-700',
  BOARDING:  'bg-purple-100 text-purple-700',
  DEPARTED:  'bg-yellow-100 text-yellow-700',
  ARRIVED:   'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

const STATUSES = ['SCHEDULED','BOARDING','DEPARTED','ARRIVED','CANCELLED']

function fmt(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function FlightsTab() {
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
      axiosClient.get('/flights/'),
      axiosClient.get('/airlines/'),
      axiosClient.get('/aircraft/'),
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
      await axiosClient.post('/flights/', form)
      setShowForm(false)
      setForm({ flight_number: '', airline: '', aircraft: '', origin: '', destination: '', departure_time: '', arrival_time: '', status: 'SCHEDULED' })
      load()
    } catch (err) {
      const d = err.response?.data
      setFormError(d ? Object.values(d).flat().join(' ') : 'Failed to add flight.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this flight?')) return
    try {
      await axiosClient.delete(`/flights/${id}/`)
      load()
    } catch {
      alert('Failed to delete flight.')
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
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          {showForm ? '✕ Cancel' : '+ Add Flight'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h4 className="font-semibold text-gray-700 mb-4">New Flight</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Flight Number</label>
              <input name="flight_number" value={form.flight_number} onChange={handleChange} required placeholder="e.g. AI202" className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Airline</label>
              <select name="airline" value={form.airline} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Select airline</option>
                {airlines.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Aircraft</label>
              <select name="aircraft" value={form.aircraft} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Select aircraft</option>
                {aircraft.map(a => <option key={a.id} value={a.id}>{a.registration_number} — {a.aircraft_type}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Origin</label>
              <input name="origin" value={form.origin} onChange={handleChange} required placeholder="e.g. DEL" className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Destination</label>
              <input name="destination" value={form.destination} onChange={handleChange} required placeholder="e.g. BOM" className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Departure Time</label>
              <input type="datetime-local" name="departure_time" value={form.departure_time} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Arrival Time</label>
              <input type="datetime-local" name="arrival_time" value={form.arrival_time} onChange={handleChange} required className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
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
      {loading && <p className="text-sm text-gray-400 animate-pulse">Loading flights…</p>}
      {error   && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
                <tr>
                  <th className="px-5 py-3">Flight No.</th>
                  <th className="px-5 py-3">Airline</th>
                  <th className="px-5 py-3">Route</th>
                  <th className="px-5 py-3">Departure</th>
                  <th className="px-5 py-3">Arrival</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr><td colSpan="7" className="px-5 py-6 text-center text-gray-400">No flights found</td></tr>
                )}
                {filtered.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-mono font-semibold text-blue-700">{f.flight_number}</td>
                    <td className="px-5 py-3 text-gray-700">{f.airline_name || f.airline}</td>
                    <td className="px-5 py-3 text-gray-600">{f.origin} → {f.destination}</td>
                    <td className="px-5 py-3 text-gray-600">{fmt(f.departure_time)}</td>
                    <td className="px-5 py-3 text-gray-600">{fmt(f.arrival_time)}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[f.status] || 'bg-gray-100 text-gray-600'}`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => handleDelete(f.id)} className="text-red-500 hover:text-red-700 text-xs font-medium transition">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t text-xs text-gray-400">
            {filtered.length} of {flights.length} flights
          </div>
        </div>
      )}
    </div>
  )
}
