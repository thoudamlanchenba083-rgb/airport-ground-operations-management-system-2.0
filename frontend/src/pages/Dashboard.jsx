import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Plane, Activity, Clock, XCircle, Target, TrendingUp, Cloud, Wrench,
  Users, User, RefreshCw, ArrowRight, Sparkles, SlidersHorizontal,
  MoreVertical, DoorOpen, Package, Bell, ChevronRight, Gauge, BarChart3,
  ShieldCheck,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import axiosClient from '../api/axiosClient'
import DelayCausesCard from '../components/DelayCausesCard'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import usePageMeta from '../hooks/usePageMeta'
import { DJANGO_ADMIN_URL } from '../api/config'

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

// See FlightsTab.jsx for the full explanation: status only ever changes via
// the "Advance" button, so a flight can sit on a stale badge indefinitely
// after its scheduled arrival passes. Flag it here too for consistency.
const TERMINAL_STATUSES = ['ARRIVED', 'CANCELLED', 'EMERGENCY']
function isOverdue(flight, now) {
  if (TERMINAL_STATUSES.includes(flight.status)) return false
  if (!flight.arrival_time) return false
  return new Date(flight.arrival_time) < now
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
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="w-full h-6 sparkline-fade">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

function StatCard({ icon: Icon, chip, label, value, accent, seed }) {
  return (
    <div className="glass glass-interactive rounded-2xl p-3.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className={`icon-chip ${chip} w-8! h-8! rounded-xl!`}>
          <Icon size={16} strokeWidth={2.1} />
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</p>
        <p className="text-xl font-bold text-neutral-900 dark:text-white mt-0.5">{value ?? '—'}</p>
      </div>
      <div className={accent}>
        <Sparkline seed={seed} />
      </div>
    </div>
  )
}

function IntelPanel({ icon: Icon, chip, title, badge, badgeTone, decoration, children }) {
  return (
    <div className={`glass rounded-[26px] p-5 flex flex-col gap-3 ${decoration ? 'relative overflow-hidden' : ''}`}>
      {decoration}
      <div className={`flex items-center justify-between gap-2 ${decoration ? 'relative z-10' : ''}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`icon-chip ${chip} w-10! h-10! rounded-xl!`}>
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
      {decoration ? <div className="relative z-10 flex flex-col gap-3">{children}</div> : children}
    </div>
  )
}

// Decorative sky + drifting clouds behind the Weather Alerts panel.
function WeatherDecoration() {
  return (
    <div className="weather-sky">
      <span className="weather-cloud weather-cloud--a" />
      <span className="weather-cloud weather-cloud--b" />
    </div>
  )
}

// Small inline meter used to compare "available vs needed" at a glance
// (staff shortage breakdown) or "ready vs total" (resource forecast).
const CHART_COLORS = ['#3b82f6', '#a855f7', '#f59e0b', '#f43f5e', '#10b981', '#38bdf8', '#818cf8']

function MiniChartCard({ title, children }) {
  return (
    <div className="glass rounded-[26px] p-5 flex flex-col gap-3">
      <h3 className="text-xs font-semibold tracking-wide text-neutral-500 dark:text-neutral-400 uppercase">{title}</h3>
      {children}
    </div>
  )
}

function MiniBar({ value, max, tone = 'bg-blue-500' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="w-full h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
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
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  // Matches backend IsAuthenticatedReadOnly: only ADMIN and GROUND_STAFF can write to flights.
  const canWrite = user?.role === 'ADMIN' || user?.role === 'GROUND_STAFF'
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(new Date())

  // Secondary datasets purely for the Analytics Overview section below -
  // kept separate from `loading`/`error` (which gate the main flights table)
  // so a slow gates/staff/maintenance fetch never blocks the rest of the page.
  const [gates, setGates] = useState([])
  const [staffList, setStaffList] = useState([])
  const [maintenanceList, setMaintenanceList] = useState([])
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

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

  useEffect(() => {
    setAnalyticsLoading(true)
    Promise.all([
      axiosClient.get('/gates/gates/'),
      axiosClient.get('/staff/staff/'),
      axiosClient.get('/maintenance/maintenance/'),
    ])
      .then(([g, s, m]) => {
        setGates(Array.isArray(g.data) ? g.data : g.data.results ?? [])
        setStaffList(Array.isArray(s.data) ? s.data : s.data.results ?? [])
        setMaintenanceList(Array.isArray(m.data) ? m.data : m.data.results ?? [])
      })
      .catch(() => {}) // non-critical for the rest of the dashboard - charts just show empty state
      .finally(() => setAnalyticsLoading(false))
  }, [])

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
    // Guard against overlapping calls: React 18 StrictMode double-invokes
    // effects in dev (mount -> unmount -> remount), and the 2-minute
    // auto-poll below can also land right on top of a manual "Refresh"
    // click. Two concurrent requests don't just waste a round-trip - they
    // double the ML/DB work happening on the backend at once, which is
    // what pushed calls past the frontend's 20s timeout. Skip firing a
    // second request while one is still in flight.
    if (loadIntel._inFlight) return
    loadIntel._inFlight = true

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
      .finally(() => {
        setIntelLoading(false)
        loadIntel._inFlight = false
      })
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
  const ops = intel?.ops_snapshot
  const staff = intel?.staff_shortage
  const resources = intel?.resource_forecast

  // Lightweight analytics reusing the flights we already have in memory -
  // no extra network calls needed just to preview trends on the dashboard.
  const flightStatusData = Object.entries(
    flights.reduce((acc, f) => {
      const s = f.status || 'Unknown'
      acc[s] = (acc[s] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  const flightsByDate = Object.entries(
    flights.reduce((acc, f) => {
      const date = f.departure_time
        ? new Date(f.departure_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
        : 'Unknown'
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})
  ).slice(-7).map(([date, count]) => ({ date, count }))

  // Gate model only has is_available (boolean), no status field.
  const gateData = [
    { name: 'Available', value: gates.filter(g => g.is_available === true).length },
    { name: 'Occupied',  value: gates.filter(g => g.is_available === false).length },
  ].filter(d => d.value > 0)

  const staffRoleData = Object.entries(
    staffList.reduce((acc, s) => {
      const r = s.staff_type || 'Unknown'
      acc[r] = (acc[r] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  const maintStatusData = Object.entries(
    maintenanceList.reduce((acc, m) => {
      const s = m.status || 'Unknown'
      acc[s] = (acc[s] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  const chartGridStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'
  const chartTickColor  = isDark ? '#9ca3af' : '#6b7280'
  const chartEmptyColor = isDark ? '#6b7280' : '#9ca3af'
  const chartTooltip = {
    backgroundColor: isDark ? 'rgba(18,18,18,0.9)' : 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(12px)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)'}`,
    color: isDark ? '#fff' : '#111827',
    borderRadius: 12,
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
  }

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
          {user?.is_staff && (
            <a
              href={DJANGO_ADMIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-pill glass-interactive flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 px-4 py-2.5"
            >
              <ShieldCheck size={16} />
              Django Admin
            </a>
          )}
          <button
            onClick={loadIntel}
            disabled={intelLoading}
            className="glass-pill glass-interactive flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 px-4 py-2.5 disabled:opacity-50"
          >
            <RefreshCw size={16} className={intelLoading ? 'animate-spin' : ''} />
            {intelLoading ? 'Refreshing…' : 'Refresh AI Insights'}
          </button>
          <Link
            to="/flights"
            className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-full bg-linear-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all"
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

      {/* Live OCC-style operational counters - Phase 1 #4 Live Airport Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Wrench} chip="icon-chip-indigo" label="Equipment Active" accent="text-indigo-500" seed={5}
          value={ops ? `${ops.equipment_active}/${ops.equipment_total}` : undefined}
        />
        <StatCard
          icon={Users} chip="icon-chip-sky" label="Ground Staff" accent="text-sky-500" seed={6}
          value={ops?.staff_active}
        />
        <StatCard
          icon={Gauge} chip="icon-chip-violet" label="Avg Turnaround" accent="text-violet-500" seed={7}
          value={ops?.avg_turnaround_min != null ? `${ops.avg_turnaround_min} min` : 'N/A'}
        />
        <StatCard
          icon={DoorOpen} chip="icon-chip-amber" label="Gate Occupancy" accent="text-amber-500" seed={8}
          value={ops?.gate_occupancy_pct != null ? `${ops.gate_occupancy_pct}%` : 'N/A'}
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
        <p className="text-xs text-neutral-500 dark:text-neutral-400 -mt-2 mb-3">
          Forecasts below reason over the same upcoming flight window - see{' '}
          <Link to="/ai-intro" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
            how each model works
          </Link>.
        </p>

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
                {delay.flights_analyzed > 0 && (
                  <MiniBar value={delay.high_risk_count} max={delay.flights_analyzed} tone="bg-blue-500" />
                )}
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
            decoration={<WeatherDecoration />}
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
                {weather.flights_analyzed > 0 && (
                  <MiniBar value={weather.high_risk_count} max={weather.flights_analyzed} tone="bg-sky-500" />
                )}
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
                <div className="flex items-center justify-between">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{maintenance.total_open_requests} open request(s) total</p>
                  {maintenance.total_open_requests > 0 && (
                    <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">
                      {maintenance.high_priority_count} urgent
                    </span>
                  )}
                </div>
                {maintenance.total_open_requests > 0 && (
                  <MiniBar value={maintenance.high_priority_count} max={maintenance.total_open_requests} tone="bg-rose-500" />
                )}
                {maintenance.flagged_requests.length === 0 && <EmptyState text="No urgent maintenance requests" />}
                <ul className="space-y-1.5">
                  {maintenance.flagged_requests.map((r, idx) => (
                    <li key={idx} className="text-xs text-neutral-700 dark:text-neutral-200 flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1 shrink-0" />
                      <span><span className="font-mono text-neutral-500 dark:text-neutral-400">{r.aircraft}</span> - {r.issue}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </IntelPanel>

          <IntelPanel icon={Users} chip="icon-chip-violet" title="Passenger Rush Prediction">
            {passengers && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">{passengers.total_expected_passengers}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      expected passengers across {passengers.flights_analyzed} flight(s) today
                    </p>
                  </div>
                  <div className="flex -space-x-2 shrink-0">
                    {['icon-chip-violet', 'icon-chip-blue', 'icon-chip-sky', 'icon-chip-indigo'].map((c, i) => (
                      <div key={i} className={`icon-chip ${c} w-9! h-9! rounded-full! border-2 border-white/40 dark:border-black/30`}>
                        <User size={15} />
                      </div>
                    ))}
                  </div>
                </div>
                {passengers.flights_analyzed > 0 && (
                  <div className="pt-1 border-t border-black/5 dark:border-white/5">
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400 mb-1">
                      <span>High-rush flights</span>
                      <span className={passengers.high_rush_count > 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                        {passengers.high_rush_count}/{passengers.flights_analyzed}
                      </span>
                    </div>
                    <MiniBar value={passengers.high_rush_count} max={passengers.flights_analyzed} tone="bg-amber-500" />
                  </div>
                )}
              </>
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
                {staff.recommendations.length === 0 && <EmptyState text="All resources within forecast-safe range" />}
                <ul className="space-y-1">
                  {staff.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-xs text-amber-600 dark:text-amber-300">{rec}</li>
                  ))}
                </ul>
                {staff.breakdown && Object.keys(staff.breakdown).length > 0 && (
                  <div className="grid grid-cols-2 gap-3 mt-1 pt-2 border-t border-black/5 dark:border-white/5">
                    {Object.entries(staff.breakdown)
                      .filter(([, d]) => d.total > 0)
                      .map(([label, d]) => {
                        const demandKey = Object.keys(d).find((k) => k.startsWith('forecast_demand_next_'))
                        const demand = demandKey ? d[demandKey] : 0
                        const short = demand > d.available
                        return (
                          <div key={label} className="text-xs">
                            <div className="flex items-center justify-between">
                              <p className="text-neutral-500 dark:text-neutral-400">{label}</p>
                            </div>
                            <p className={`font-semibold ${short ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-800 dark:text-neutral-100'}`}>
                              {d.available} avail / {demand} needed
                            </p>
                            <div className="mt-1">
                              <MiniBar value={d.available} max={Math.max(demand, d.available, 1)} tone={short ? 'bg-amber-500' : 'bg-emerald-500'} />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </>
            )}
          </IntelPanel>

          <IntelPanel
            icon={Gauge} chip="icon-chip-emerald"
            title="Resource Forecast"
            badge={resources ? `next ${resources.window_hours}h` : undefined}
            badgeTone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20"
          >
            {resources && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <DoorOpen size={14} className="text-neutral-400" />
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      Gates: {resources.gates.available}/{resources.gates.total} free
                      {resources.gates.peak_forecast_demand > resources.gates.available && (
                        <span className="text-amber-600 dark:text-amber-400"> · peak demand {resources.gates.peak_forecast_demand}</span>
                      )}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{resources.gates.utilization_pct}%</span>
                </div>
                {Object.keys(resources.equipment).length > 0 ? (
                  <ul className="space-y-2 pt-1">
                    {Object.entries(resources.equipment).map(([name, d]) => (
                      <li key={name} className="text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5 min-w-0 truncate">
                            <Wrench size={12} className="text-neutral-400 shrink-0" /> {name}
                          </span>
                          <span className={d.effective_available === 0 ? 'text-rose-600 dark:text-rose-400 font-medium shrink-0' : 'text-neutral-500 dark:text-neutral-400 shrink-0'}>
                            {d.effective_available}/{d.total} ready
                          </span>
                        </div>
                        <div className="mt-1">
                          <MiniBar value={d.effective_available} max={Math.max(d.total, 1)} tone={d.effective_available === 0 ? 'bg-rose-500' : 'bg-emerald-500'} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState text="No ground equipment records yet" />
                )}
              </>
            )}
          </IntelPanel>
        </div>
      </div>

      {/* Recent flights */}
      <div className="glass rounded-[26px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="icon-chip icon-chip-blue w-9! h-9! rounded-lg!">
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
                  {canWrite && <th className="px-5 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {recent.length === 0 && (
                  <tr><td colSpan={canWrite ? 7 : 6} className="px-5 py-6 text-center text-neutral-400 dark:text-neutral-500">No flights available</td></tr>
                )}
                {recent.map((f) => (
                  <tr key={f.id} className="hover:bg-black/2 dark:hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3 font-mono font-semibold text-blue-600 dark:text-blue-400">{f.flight_number}</td>
                    <td className="px-5 py-3 text-neutral-900 dark:text-neutral-100">{f.airline_name || f.airline}</td>
                    <td className="px-5 py-3 text-neutral-600 dark:text-neutral-300">{f.origin || ''}</td>
                    <td className="px-5 py-3 text-neutral-600 dark:text-neutral-300">{f.destination || ''}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[f.status] || 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300 border-neutral-500/20'}`}>
                          {f.status}
                        </span>
                        {isOverdue(f, now) && (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            title="Scheduled arrival has already passed, but this flight was never advanced or cancelled"
                          >
                            Overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                      {f.scheduled_departure ? new Date(f.scheduled_departure).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    {canWrite && (
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

      {/* Analytics overview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <BarChart3 size={17} className="text-blue-500" />
            Analytics Overview
          </h3>
          <Link to="/analytics" className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition">
            Full Analytics <ArrowRight size={13} />
          </Link>
        </div>

        {/* Quick counts across every module, at a glance */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="glass glass-interactive rounded-[26px] p-4 flex items-center gap-3">
            <div className="icon-chip icon-chip-blue w-11! h-11! rounded-xl!"><Plane size={18} /></div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Flights</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white mt-0.5">{flights.length}</p>
            </div>
          </div>
          <div className="glass glass-interactive rounded-[26px] p-4 flex items-center gap-3">
            <div className="icon-chip icon-chip-violet w-11! h-11! rounded-xl!"><DoorOpen size={18} /></div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Gates</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white mt-0.5">{analyticsLoading ? '—' : gates.length}</p>
            </div>
          </div>
          <div className="glass glass-interactive rounded-[26px] p-4 flex items-center gap-3">
            <div className="icon-chip icon-chip-amber w-11! h-11! rounded-xl!"><Users size={18} /></div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Staff Members</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white mt-0.5">{analyticsLoading ? '—' : staffList.length}</p>
            </div>
          </div>
          <div className="glass glass-interactive rounded-[26px] p-4 flex items-center gap-3">
            <div className="icon-chip icon-chip-rose w-11! h-11! rounded-xl!"><Wrench size={18} /></div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Maintenance Jobs</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white mt-0.5">{analyticsLoading ? '—' : maintenanceList.length}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MiniChartCard title="Flight Status Breakdown">
            {flightStatusData.length === 0 ? (
              <p style={{ color: chartEmptyColor }} className="text-[13px]">No flight data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={flightStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={2}>
                    {flightStatusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={chartTooltip} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </MiniChartCard>

          <MiniChartCard title="Gate Utilization">
            {gateData.length === 0 ? (
              <p style={{ color: chartEmptyColor }} className="text-[13px]">No gate data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={gateData}>
                  <defs>
                    {CHART_COLORS.map((c, i) => (
                      <linearGradient key={i} id={`dashGateGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c} stopOpacity={0.95} />
                        <stop offset="100%" stopColor={c} stopOpacity={0.55} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: chartTickColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chartTickColor, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={chartTooltip} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)' }} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={64}>
                    {gateData.map((_, i) => <Cell key={i} fill={`url(#dashGateGrad${i})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </MiniChartCard>

          <MiniChartCard title="Staff by Role">
            {staffRoleData.length === 0 ? (
              <p style={{ color: chartEmptyColor }} className="text-[13px]">No staff data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={staffRoleData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={2}>
                    {staffRoleData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={chartTooltip} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </MiniChartCard>

          <MiniChartCard title="Maintenance by Status">
            {maintStatusData.length === 0 ? (
              <p style={{ color: chartEmptyColor }} className="text-[13px]">No maintenance data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={maintStatusData}>
                  <defs>
                    <linearGradient id="dashMaintGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: chartTickColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chartTickColor, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={chartTooltip} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)' }} />
                  <Bar dataKey="value" fill="url(#dashMaintGrad)" radius={[8, 8, 0, 0]} maxBarSize={64} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </MiniChartCard>

          <div className="lg:col-span-2">
            <MiniChartCard title="Flights Over Time (last 7 days)">
              {flightsByDate.length === 0 ? (
                <p style={{ color: chartEmptyColor }} className="text-[13px]">No timeline data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={flightsByDate}>
                    <defs>
                      <linearGradient id="dashFlightsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: chartTickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartTickColor, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltip} />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fill="url(#dashFlightsAreaGrad)" dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </MiniChartCard>
          </div>

          <div className="lg:col-span-2">
            <DelayCausesCard />
          </div>
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
              className="glass glass-interactive flex flex-col items-center justify-center gap-2 rounded-[26px] py-5"
            >
              <div className={`icon-chip ${item.chip} w-10! h-10! rounded-xl!`}>
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
