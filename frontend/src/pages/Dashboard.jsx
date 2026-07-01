import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axiosClient from '../api/axiosClient'
import { useAuth } from '../context/AuthContext'
import usePageMeta from '../hooks/usePageMeta'

// Keyed on the REAL Flight.STATUS_CHOICES values from the backend
// (flights/models.py) - the old version keyed on display-style strings
// like 'On Time' / 'Landed' that never matched the actual status field,
// so every badge silently fell through to the default gray style.
const STATUS_STYLES = {
  SCHEDULED:          'bg-neutral-800 text-neutral-300',
  GATE_ASSIGNED:       'bg-neutral-800 text-neutral-300',
  CREW_ASSIGNED:       'bg-neutral-800 text-neutral-300',
  FUELING:             'bg-neutral-800 text-neutral-300',
  CLEANING:            'bg-neutral-800 text-neutral-300',
  BAGGAGE_LOADING:     'bg-neutral-800 text-neutral-300',
  MAINTENANCE_CHECK:   'bg-yellow-100 text-yellow-700',
  BOARDING:            'bg-blue-100 text-blue-700',
  GATE_CLOSED:         'bg-blue-100 text-blue-700',
  PUSHBACK:            'bg-blue-100 text-blue-700',
  TAXIING:             'bg-blue-100 text-blue-700',
  DEPARTED:            'bg-green-100 text-green-700',
  AIRBORNE:            'bg-green-100 text-green-700',
  LANDING:             'bg-green-100 text-green-700',
  TAXI_TO_GATE:        'bg-green-100 text-green-700',
  ARRIVED:             'bg-green-100 text-green-700',
  DELAYED:             'bg-yellow-100 text-yellow-700',
  CANCELLED:           'bg-red-100 text-red-700',
  EMERGENCY:           'bg-red-100 text-red-700',
}

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-xl p-5 flex items-center gap-4 shadow-sm border ${color}`}>
      <div>
        <p className="text-sm font-medium opacity-70">{label}</p>
        <p className="text-2xl font-bold">{value ?? '-'}</p>
      </div>
    </div>
  )
}

function IntelPanel({ title, badge, badgeTone, children }) {
  return (
    <div className="bg-neutral-900 rounded-xl shadow-sm border border-neutral-700 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm">{title}</h3>
        {badge !== undefined && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeTone || 'bg-neutral-800 text-neutral-300'}`}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ text }) {
  return <p className="text-xs text-neutral-500">{text}</p>
}

export default function Dashboard() {
  usePageMeta('Dashboard', 'Airport Ground Operations live dashboard - flights, gates, baggage and staff overview.')
  const { user } = useAuth()
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(new Date())

  const [intel, setIntel] = useState(null)
  const [intelLoading, setIntelLoading] = useState(true)
  const [intelError, setIntelError] = useState('')

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

  const loadIntel = useCallback(() => {
    setIntelLoading(true)
    axiosClient.get('/ai/predictions/dashboard/')
      .then((res) => {
        setIntel(res.data)
        setIntelError('')
      })
      .catch(() => setIntelError('Failed to load AI dashboard intelligence.'))
      .finally(() => setIntelLoading(false))
  }, [])

  useEffect(() => {
    loadIntel()
    // Auto-refresh the intelligence panel every 2 minutes - it's read-only
    // and cheap enough on the backend (capped sample size, no DB writes).
    const tick = setInterval(loadIntel, 120000)
    return () => clearInterval(tick)
  }, [loadIntel])

  const recent = flights.slice(0, 8)
  const kpis = intel?.live_kpis
  const delay = intel?.delay_forecast
  const weather = intel?.weather_alerts
  const maintenance = intel?.maintenance_alerts
  const passengers = intel?.passenger_prediction
  const staff = intel?.staff_shortage

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Welcome back{user?.username ? `, ${user.username}` : ''}
          </h2>
          <p className="text-sm text-neutral-400 mt-0.5">
            {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {'  '}
            {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadIntel}
            disabled={intelLoading}
            className="text-sm bg-neutral-800 border border-neutral-700 text-neutral-200 px-3 py-2 rounded-lg hover:border-blue-400 disabled:opacity-50 transition"
          >
            {intelLoading ? 'Refreshing...' : 'Refresh AI Insights'}
          </button>
          <Link to="/flights" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            View All Flights &rarr;
          </Link>
        </div>
      </div>

      {/* Live KPIs - from the AI dashboard endpoint's real DB counts */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Flights Today"  value={kpis?.total_flights_today} color="bg-neutral-900 border-neutral-700 text-white" />
        <StatCard label="Active"         value={kpis?.active_flights}      color="bg-neutral-900 border-neutral-700 text-blue-300" />
        <StatCard label="Delayed"        value={kpis?.delayed_flights}     color="bg-neutral-900 border-neutral-700 text-yellow-300" />
        <StatCard label="Cancelled"      value={kpis?.cancelled_flights}   color="bg-neutral-900 border-neutral-700 text-red-300" />
        <StatCard
          label="On-Time %"
          value={kpis?.on_time_pct != null ? `${kpis.on_time_pct}%` : 'N/A'}
          color="bg-neutral-900 border-neutral-700 text-green-300"
        />
      </div>

      {/* AI Intelligence panels */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white">AI Intelligence</h3>
          {intel?.generated_at && (
            <span className="text-xs text-neutral-500">
              Updated {new Date(intel.generated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {intelError && <p className="text-red-400 text-sm mb-3">{intelError}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <IntelPanel
            title="Delay Forecast"
            badge={delay ? `${delay.high_risk_count} high risk` : undefined}
            badgeTone={delay?.high_risk_count ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}
          >
            {!intel && !intelLoading && <EmptyState text="No data yet" />}
            {delay && (
              <>
                <p className="text-xs text-neutral-400">
                  Analyzed {delay.flights_analyzed} upcoming flight(s) - avg estimated delay {delay.avg_estimated_delay_min} min
                </p>
                {delay.flagged_flights.length === 0 && <EmptyState text="No high-risk flights right now" />}
                <ul className="space-y-1">
                  {delay.flagged_flights.map((f) => (
                    <li key={f.flight_number} className="text-xs text-neutral-200 flex justify-between">
                      <span className="font-mono">{f.flight_number}</span>
                      <span className="text-yellow-400">+{f.estimated_delay_minutes} min</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </IntelPanel>

          <IntelPanel
            title="Weather Alerts"
            badge={weather ? `${weather.high_risk_count} high risk` : undefined}
            badgeTone={weather?.high_risk_count ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}
          >
            {weather && (
              <>
                <p className="text-xs text-neutral-400">Analyzed {weather.flights_analyzed} upcoming flight(s)</p>
                {weather.flagged_flights.length === 0 && <EmptyState text="No severe weather risk detected" />}
                <ul className="space-y-1">
                  {weather.flagged_flights.map((f) => (
                    <li key={f.flight_number} className="text-xs text-neutral-200 flex justify-between">
                      <span className="font-mono">{f.flight_number}</span>
                      <span className="text-red-400">{f.conditions}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </IntelPanel>

          <IntelPanel
            title="Maintenance Alerts"
            badge={maintenance ? `${maintenance.high_priority_count} urgent` : undefined}
            badgeTone={maintenance?.high_priority_count ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}
          >
            {maintenance && (
              <>
                <p className="text-xs text-neutral-400">{maintenance.total_open_requests} open request(s) total</p>
                {maintenance.flagged_requests.length === 0 && <EmptyState text="No urgent maintenance requests" />}
                <ul className="space-y-1">
                  {maintenance.flagged_requests.map((r, idx) => (
                    <li key={idx} className="text-xs text-neutral-200">
                      <span className="font-mono text-neutral-400">{r.aircraft}</span> - {r.issue}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </IntelPanel>

          <IntelPanel title="Passenger Rush Prediction">
            {passengers && (
              <>
                <p className="text-2xl font-bold text-white">{passengers.total_expected_passengers}</p>
                <p className="text-xs text-neutral-400">
                  expected passengers across {passengers.flights_analyzed} flight(s) today
                  {passengers.high_rush_count > 0 && (
                    <span className="text-yellow-400"> - {passengers.high_rush_count} high-rush</span>
                  )}
                </p>
              </>
            )}
          </IntelPanel>

          <IntelPanel
            title="Staff Shortage Forecast"
            badge={staff ? `${Math.round((staff.confidence || 0) * 100)}% confidence` : undefined}
          >
            {staff && (
              <>
                {staff.recommendations.length === 0 && <EmptyState text="Staffing within forecast-safe range" />}
                <ul className="space-y-1">
                  {staff.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-xs text-yellow-300">{rec}</li>
                  ))}
                </ul>
              </>
            )}
          </IntelPanel>
        </div>
      </div>

      <div className="bg-neutral-900 rounded-xl shadow-sm border border-neutral-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <h3 className="font-semibold text-white">Recent Flights</h3>
          {loading && <span className="text-xs text-neutral-500 animate-pulse">Loading</span>}
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
                    <td className="px-5 py-3 font-mono font-semibold text-blue-400">{f.flight_number}</td>
                    <td className="px-5 py-3 text-neutral-100">{f.airline_name || f.airline}</td>
                    <td className="px-5 py-3 text-neutral-300">{f.origin || ''}</td>
                    <td className="px-5 py-3 text-neutral-300">{f.destination || ''}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[f.status] || 'bg-neutral-800 text-neutral-300'}`}>
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
          { to: '/flights',       label: 'Flights' },
          { to: '/gates',         label: 'Gates' },
          { to: '/baggage',       label: 'Baggage' },
          { to: '/maintenance',   label: 'Maintenance' },
          { to: '/staff',         label: 'Staff' },
          { to: '/notifications', label: 'Notifications' },
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