import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Plane, Activity, Clock, XCircle, Target, TrendingUp, Cloud, Wrench,
  Users, User, Moon, Sun, RefreshCw, ArrowRight, Sparkles, SlidersHorizontal,
  MoreVertical, DoorOpen, Package, Bell, ChevronRight,
} from 'lucide-react'
import axiosClient from '../api/axiosClient'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import usePageMeta from '../hooks/usePageMeta'

// Keyed on the REAL Flight.STATUS_CHOICES values from the backend
// (flights/models.py) - the old version keyed on display-style strings
// like 'On Time' / 'Landed' that never matched the actual status field,
// so every badge silently fell through to the default gray style.
const STATUS_STYLES = {
  SCHEDULED:          'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300 border-neutral-500/20',
  GATE_ASSIGNED:       'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300 border-neutral-500/20',
  CREW_ASSIGNED:       'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300 border-neutral-500/20',
  FUELING:             'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300 border-neutral-500/20',
  CLEANING:            'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300 border-neutral-500/20',
  BAGGAGE_LOADING:     'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300 border-neutral-500/20',
  MAINTENANCE_CHECK:   'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20',
  BOARDING:            'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20',
  GATE_CLOSED:         'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20',
  PUSHBACK:            'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20',
  TAXIING:             'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20',
  DEPARTED:            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20',
  AIRBORNE:            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20',
  LANDING:             'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20',
  TAXI_TO_GATE:        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20',
  ARRIVED:             'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20',
  DELAYED:             'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20',
  CANCELLED:           'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20',
  EMERGENCY:           'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20',
}

// Mirrors Flight.WORKFLOW_ORDER on the backend (see FlightsTab.jsx for the
// same list) - used to compute the next step for the Advance button here too.
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

// Decorative sparkline - purely visual texture under stat cards, tinted via
// currentColor so it inherits each card's accent color.
function Sparkline({ seed = 0 }) {
  const paths = [
    'M0,28 C10,26 18,14 28,16 C38,18 44,30 54,26 C64,22 70,6 80,10 C90,14 94,24 100,20',
    'M0,20 C8,10 16,26 26,20 C36,14 42,4 52,10 C62,16 68,28 78,22 C88,16 94,8 100,14',
    'M0,24 C10,30 16,10 26,12 C36,14 40,26 50,24 C60,22 66,8 76,12 C86,16 92,26 100,18',
    'M0,16 C10,22 18,6 28,12 C38,18 42,28 52,22 C62,16 70,10 80,18 C90,26 94,14 100,20',
    'M0,22 C8,14 16,28 24,22 C34,14 42,10 52,18 C62,26 70,20 80,12 C90,6 94,18 100,12',
  ]
  const d = paths[seed % paths.length]
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="w-full h-8 sparkline-fade">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

function StatCard({ icon: Icon, chip, label, value, accent, seed }) {
  return (
    <div className="glass glass-interactive rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`icon-chip ${chip}`}>
          <Icon strokeWidth={2.1} />
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
        <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-0.5">{value ?? '—'}</p>
      </div>
      <div className={accent}>
        <Sparkline seed={seed} />
      </div>
    </div>
  )
}

function IntelPanel({ icon: Icon, chip, title, badge, badgeTone, children }) {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`icon-chip ${chip} !w-10 !h-10 !rounded-xl`}>
            <Icon size={18} strokeWidth={2.1} />
          </div>
          <h3 className="font-semibold text-neutral-900 dark:text-white text-sm truncate">{title}</h3>
        </div>
        {badge !== undefined && (
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap ${badgeTone || 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300 border-neutral-500/20'}`}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ text }) {
  return <p className="text-xs text-neutral-400 dark:text-neutral-500">{text}</p>
}

const QUICK_LINKS = [
  { to: '/flights',       label: 'Flights',       icon: Plane,   chip: 'icon-chip-blue' },
  { to: '/gates',         label: 'Gates',         icon: DoorOpen,chip: 'icon-chip-violet' },
  { to: '/baggage',       label: 'Baggage',       icon: Package, chip: 'icon-chip-amber' },
  { to: '/maintenance',   label: 'Maintenance',   icon: Wrench,  chip: 'icon-chip-rose' },
  { to: '/staff',         label: 'Staff',         icon: Users,   chip: 'icon-chip-emerald' },
  { to: '/notifications', label: 'Notifications', icon: Bell,    chip: 'icon-chip-sky' },
]

export default function Dashboard() {
  usePageMeta('Dashboard', 'Airport Ground Operations live dashboard - flights, gates, baggage and staff overview.')
  const { user } = useAuth()
  const isViewer = user?.role === 'VIEWER'
  const { theme, toggleTheme } = useTheme()
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

  const loadFlights = useCallback(() => {
    setLoading(true)
    axiosClient.get('/flights/flights/')
      .then((res) => {
        const data = res.data
        const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
        setFlights(list)
      })
      .catch(() => setError('Failed to load flight data.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadFlights() }, [loadFlights])

  const handleAdvance = async (flight) => {
    const step = nextWorkflowStep(flight.status)
    if (!step) return
    try {
      await axiosClient.post(`/flights/flights/${flight.id}/advance-step/`, { step })
      loadFlights()
    } catch (err) {
      alert(err.response?.data?.error ?? 'Failed to advance flight status.')
    }
  }

  const loadIntel = useCallback(() => {
    setIntelLoading(true)
    axiosClient.get('/ai/predictions/dashboard/')
      .then((res) => {
        setIntel(res.data)
        setIntelError('')
      })
      .catch((err) => {
        let message = 'Failed to load AI dashboard intelligence.'
        if (err.code === 'ECONNABORTED') {
          message = 'AI dashboard intelligence timed out - the backend took too long to respond.'
        } else if (err.response) {
          message = `AI dashboard intelligence failed (server returned ${err.response.status}).`
        } else if (err.request) {
          message = 'AI dashboard intelligence failed - no response from the backend. Is the Django server running?'
        }
        setIntelError(message)
      })
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
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            Welcome back{user?.username ? `, ${user.username}` : ''} <span aria-hidden>👋</span>
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {'  '}
            {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleTheme}
            className="glass glass-interactive flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 px-4 py-2.5 rounded-xl"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={loadIntel}
            disabled={intelLoading}
            className="glass glass-interactive flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 px-4 py-2.5 rounded-xl disabled:opacity-50"
          >
            <RefreshCw size={16} className={intelLoading ? 'animate-spin' : ''} />
            {intelLoading ? 'Refreshing…' : 'Refresh AI Insights'}
          </button>
          <Link
            to="/flights"
            className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all"
          >
            View All Flights <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Live KPIs - from the AI dashboard endpoint's real DB counts */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Plane}    chip="icon-chip-blue"    label="Flights Today" value={kpis?.total_flights_today} accent="text-blue-500"    seed={0} />
        <StatCard icon={Activity} chip="icon-chip-violet"  label="Active"        value={kpis?.active_flights}      accent="text-violet-500"  seed={1} />
        <StatCard icon={Clock}    chip="icon-chip-amber"   label="Delayed"       value={kpis?.delayed_flights}     accent="text-amber-500"   seed={2} />
        <StatCard icon={XCircle}  chip="icon-chip-rose"    label="Cancelled"     value={kpis?.cancelled_flights}   accent="text-rose-500"    seed={3} />
        <StatCard
          icon={Target} chip="icon-chip-emerald" label="On-Time %" accent="text-emerald-500" seed={4}
          value={kpis?.on_time_pct != null ? `${kpis.on_time_pct}%` : 'N/A'}
        />
      </div>

      {/* AI Intelligence panels */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Sparkles size={17} className="text-blue-500" />
            AI Intelligence
          </h3>
          {intel?.generated_at && (
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              Updated {new Date(intel.generated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {intelError && <p className="text-rose-500 dark:text-rose-400 text-sm mb-3">{intelError}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <IntelPanel
            icon={TrendingUp} chip="icon-chip-blue"
            title="Delay Forecast"
            badge={delay ? `${delay.high_risk_count} high risk` : undefined}
            badgeTone={delay?.high_risk_count ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20'}
          >
            {!intel && !intelLoading && <EmptyState text="No data yet" />}
            {delay && (
              <>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Analyzed {delay.flights_analyzed} upcoming flight(s) - avg estimated delay {delay.avg_estimated_delay_min} min
                </p>
                {delay.flagged_flights.length === 0 && <EmptyState text="No high-risk flights right now" />}
                <ul className="space-y-1">
                  {delay.flagged_flights.map((f) => (
                    <li key={f.flight_number} className="text-xs text-neutral-700 dark:text-neutral-200 flex justify-between">
                      <span className="font-mono">{f.flight_number}</span>
                      <span className="text-amber-600 dark:text-amber-400">+{f.estimated_delay_minutes} min</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </IntelPanel>

          <IntelPanel
            icon={Cloud} chip="icon-chip-sky"
            title="Weather Alerts"
            badge={weather ? `${weather.high_risk_count} high risk` : undefined}
            badgeTone={weather?.high_risk_count ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20'}
          >
            {weather && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Analyzed {weather.flights_analyzed} upcoming flight(s)</p>
                  {weather.flights_analyzed > 0 && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${
                      weather.live_data_count === weather.flights_analyzed
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                        : weather.live_data_count > 0
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
                        : 'bg-neutral-500/10 text-neutral-500 dark:text-neutral-400'
                    }`}>
                      {weather.live_data_count === weather.flights_analyzed
                        ? '● Live'
                        : weather.live_data_count > 0
                        ? `● ${weather.live_data_count}/${weather.flights_analyzed} Live`
                        : '○ Simulated'}
                    </span>
                  )}
                </div>
                {weather.flagged_flights.length === 0 && <EmptyState text="No severe weather risk detected" />}
                <ul className="space-y-1">
                  {weather.flagged_flights.map((f) => (
                    <li key={f.flight_number} className="text-xs text-neutral-700 dark:text-neutral-200 flex justify-between">
                      <span className="font-mono">{f.flight_number}</span>
                      <span className="text-rose-600 dark:text-rose-400">
                        {f.conditions}
                        {f.data_source !== 'OpenWeatherMap (live)' && (
                          <span className="text-neutral-400 dark:text-neutral-500 ml-1">(sim)</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </IntelPanel>

          <IntelPanel
            icon={Wrench} chip="icon-chip-rose"
            title="Maintenance Alerts"
            badge={maintenance ? `${maintenance.high_priority_count} urgent` : undefined}
            badgeTone={maintenance?.high_priority_count ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20'}
          >
            {maintenance && (
              <>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{maintenance.total_open_requests} open request(s) total</p>
                {maintenance.flagged_requests.length === 0 && <EmptyState text="No urgent maintenance requests" />}
                <ul className="space-y-1">
                  {maintenance.flagged_requests.map((r, idx) => (
                    <li key={idx} className="text-xs text-neutral-700 dark:text-neutral-200">
                      <span className="font-mono text-neutral-500 dark:text-neutral-400">{r.aircraft}</span> - {r.issue}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </IntelPanel>

          <IntelPanel icon={Users} chip="icon-chip-violet" title="Passenger Rush Prediction">
            {passengers && (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-white">{passengers.total_expected_passengers}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    expected passengers across {passengers.flights_analyzed} flight(s) today
                    {passengers.high_rush_count > 0 && (
                      <span className="text-amber-600 dark:text-amber-400"> - {passengers.high_rush_count} high-rush</span>
                    )}
                  </p>
                </div>
                <div className="flex -space-x-2 shrink-0">
                  {['icon-chip-violet', 'icon-chip-blue', 'icon-chip-sky', 'icon-chip-indigo'].map((c, i) => (
                    <div key={i} className={`icon-chip ${c} !w-9 !h-9 !rounded-full border-2 border-white/40 dark:border-black/30`}>
                      <User size={15} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </IntelPanel>

          <IntelPanel
            icon={User} chip="icon-chip-blue"
            title="Staff Shortage Forecast"
            badge={staff ? `${Math.round((staff.confidence || 0) * 100)}% confidence` : undefined}
            badgeTone="bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20"
          >
            {staff && (
              <>
                {staff.recommendations.length === 0 && <EmptyState text="All resources within forecast-safe range for the next 4h" />}
                <ul className="space-y-1">
                  {staff.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-xs text-amber-600 dark:text-amber-300">{rec}</li>
                  ))}
                </ul>
              </>
            )}
          </IntelPanel>
        </div>
      </div>

      {/* Recent flights */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="icon-chip icon-chip-blue !w-9 !h-9 !rounded-lg">
              <Plane size={16} />
            </div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">Recent Flights</h3>
            {loading && <span className="text-xs text-neutral-400 dark:text-neutral-500 animate-pulse">Loading…</span>}
          </div>
          <div className="flex items-center gap-2">
            <button className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-black/5 dark:border-white/10">
              <SlidersHorizontal size={13} /> All Flights
            </button>
            <button className="p-1.5 rounded-lg text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
        {error && <p className="text-rose-500 text-sm px-5 py-4">{error}</p>}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-neutral-500 dark:text-neutral-400 uppercase text-xs tracking-wide">
                <tr>
                  <th className="px-5 py-3 font-medium">Flight No.</th>
                  <th className="px-5 py-3 font-medium">Airline</th>
                  <th className="px-5 py-3 font-medium">Origin</th>
                  <th className="px-5 py-3 font-medium">Destination</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Departure</th>
                  {!isViewer && <th className="px-5 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {recent.length === 0 && (
                  <tr><td colSpan={isViewer ? 6 : 7} className="px-5 py-6 text-center text-neutral-400 dark:text-neutral-500">No flights available</td></tr>
                )}
                {recent.map((f) => (
                  <tr key={f.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-3 font-mono font-semibold text-blue-600 dark:text-blue-400">{f.flight_number}</td>
                    <td className="px-5 py-3 text-neutral-900 dark:text-neutral-100">{f.airline_name || f.airline}</td>
                    <td className="px-5 py-3 text-neutral-600 dark:text-neutral-300">{f.origin || ''}</td>
                    <td className="px-5 py-3 text-neutral-600 dark:text-neutral-300">{f.destination || ''}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[f.status] || 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300 border-neutral-500/20'}`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                      {f.scheduled_departure ? new Date(f.scheduled_departure).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    {!isViewer && (
                      <td className="px-5 py-3">
                        {nextWorkflowStep(f.status) ? (
                          <button
                            onClick={() => handleAdvance(f)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium transition whitespace-nowrap"
                            title={`Advance to ${STEP_LABELS[nextWorkflowStep(f.status)]}`}
                          >
                            Advance <ChevronRight size={13} /> {STEP_LABELS[nextWorkflowStep(f.status)]}
                          </button>
                        ) : (
                          <span className="text-xs text-neutral-400 dark:text-neutral-600">
                            {f.status === 'ARRIVED' ? 'Completed' : '—'}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between px-5 py-3 border-t border-black/5 dark:border-white/5">
          <span className="text-xs text-neutral-400 dark:text-neutral-500">Showing {recent.length} of {flights.length} flight{flights.length === 1 ? '' : 's'}</span>
          <Link to="/flights" className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition">
            View All Flights <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {QUICK_LINKS.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              className="glass glass-interactive flex flex-col items-center justify-center gap-2 rounded-2xl py-5"
            >
              <div className={`icon-chip ${item.chip} !w-10 !h-10 !rounded-xl`}>
                <Icon size={17} />
              </div>
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
