import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import { useAuth } from '../context/AuthContext'
import usePageMeta from '../hooks/usePageMeta'

const STATUS_STYLES = {
  'On Time':   'bg-green-100 text-green-700',
  'Delayed':   'bg-yellow-100 text-yellow-700',
  'Cancelled': 'bg-red-100 text-red-700',
  'Boarding':  'bg-blue-100 text-blue-700',
  'Landed':    'bg-neutral-900 text-neutral-300',
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className={`rounded-xl p-5 flex items-center gap-4 shadow-sm border ${color}`}>
      <div>
        <p className="text-sm font-medium opacity-70">{label}</p>
        <p className="text-2xl font-bold">{value ?? '-'}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  usePageMeta('Dashboard', 'Airport Ground Operations live dashboard — flights, gates, baggage and staff overview.')
  const { user } = useAuth()
  const [flights,  setFlights]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [now,      setNow]      = useState(new Date())

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    axiosClient.get('/flights/flights/')
      .then((res) => {
        const data = res.data
        const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
        setFlights(list)
      })
      .catch(() => setError('Failed to load flight data.'))
      .finally(() => setLoading(false))
  }, [])

  const stats = {
    total:     flights.length,
    onTime:    flights.filter(f => f.status === 'On Time').length,
    delayed:   flights.filter(f => f.status === 'Delayed').length,
    cancelled: flights.filter(f => f.status === 'Cancelled').length,
  }

  const recent = flights.slice(0, 8)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Welcome back{user?.username ? `, ${user.username}` : ''}
          </h2>
          <p className="text-sm text-neutral-400 mt-0.5">
            {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' · '}
            {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <Link to="/flights" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          View All Flights {'->'}
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Flights"  value={stats.total}     color="bg-neutral-900 border-neutral-700 text-white"      icon="" />
        <StatCard label="On Time"        value={stats.onTime}    color="bg-neutral-900 border-neutral-700 text-green-800"  icon="" />
        <StatCard label="Delayed"        value={stats.delayed}   color="bg-neutral-900 border-neutral-700 text-yellow-800" icon="" />
        <StatCard label="Cancelled"      value={stats.cancelled} color="bg-neutral-900 border-neutral-700 text-red-800"        icon="" />
      </div>

      <div className="bg-neutral-900 rounded-xl shadow-sm border border-neutral-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-white">Recent Flights</h3>
          {loading && <span className="text-xs text-neutral-500 animate-pulse">Loading…</span>}
        </div>
        {error && <p className="text-red-500 text-sm px-5 py-4">{error}</p>}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-neutral-900 text-neutral-400 uppercase text-xs tracking-wide">
                <tr>
                  <th className="px-5 py-3">Flight No.</th>
                  <th className="px-5 py-3">Airline</th>
                  <th className="px-5 py-3">Origin</th>
                  <th className="px-5 py-3">Destination</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {recent.length === 0 && (
                  <tr><td colSpan="5" className="px-5 py-6 text-center text-neutral-500">No flights available</td></tr>
                )}
                {recent.map((f) => (
                  <tr key={f.id} className="hover:bg-neutral-900 transition">
                    <td className="px-5 py-3 font-mono font-semibold text-blue-700">{f.flight_number}</td>
                    <td className="px-5 py-3 text-neutral-100">{f.airline_name || f.airline}</td>
                    <td className="px-5 py-3 text-neutral-300">{f.origin || '—'}</td>
                    <td className="px-5 py-3 text-neutral-300">{f.destination || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[f.status] || 'bg-neutral-900 text-neutral-300'}`}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { to: '/flights',       label: 'Flights',       icon: '' },
          { to: '/gates',         label: 'Gates',         icon: '' },
          { to: '/baggage',       label: 'Baggage',       icon: '' },
          { to: '/maintenance',   label: 'Maintenance',   icon: '' },
          { to: '/staff',         label: 'Staff',         icon: '' },
          { to: '/notifications', label: 'Notifications', icon: '' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center justify-center gap-1 bg-neutral-900 border border-neutral-700 rounded-xl py-4 hover:border-blue-400 hover:shadow transition text-center"
          >
            <span className="text-xs font-medium text-neutral-300">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}



