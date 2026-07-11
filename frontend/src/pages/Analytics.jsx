import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, AreaChart, Area,
} from 'recharts'
import { Plane, DoorOpen, Users, Wrench, LineChart as LineChartIcon, RefreshCw } from 'lucide-react'
import axiosClient from '../api/axiosClient'
import { useTheme } from '../context/ThemeContext'
import PageHeader from '../components/PageHeader'
import usePageMeta from '../hooks/usePageMeta'

const COLORS = ['#3b82f6', '#a855f7', '#f59e0b', '#f43f5e', '#10b981', '#38bdf8', '#818cf8']

function ChartCard({ title, badge, children }) {
  return (
    <div className="glass rounded-[26px] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-neutral-900 dark:text-white text-sm font-semibold tracking-wide">{title}</h3>
        {badge && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function StatPill({ icon: Icon, chip, label, value }) {
  return (
    <div className="glass glass-interactive rounded-[26px] px-5 py-5 flex items-center gap-4">
      <div className={`icon-chip ${chip}`}>
        <Icon size={20} strokeWidth={2.1} />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-neutral-900 dark:text-white leading-tight">{value}</div>
        <div className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">{label}</div>
      </div>
    </div>
  )
}

export default function Analytics() {
  usePageMeta('Analytics', 'Live operational analytics across flights, gates, staff and maintenance.')
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [flights, setFlights]       = useState([])
  const [gates, setGates]           = useState([])
  const [staff, setStaff]           = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [loading, setLoading]       = useState(true)

  const loadAll = () => {
    setLoading(true)
    Promise.all([
      axiosClient.get('/flights/flights/'),
      axiosClient.get('/gates/gates/'),
      axiosClient.get('/staff/staff/'),
      axiosClient.get('/maintenance/maintenance/'),
    ]).then(([f, g, s, m]) => {
      setFlights(Array.isArray(f.data) ? f.data : f.data.results ?? [])
      setGates(Array.isArray(g.data) ? g.data : g.data.results ?? [])
      setStaff(Array.isArray(s.data) ? s.data : s.data.results ?? [])
      setMaintenance(Array.isArray(m.data) ? m.data : m.data.results ?? [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadAll() }, [])

  // Flight status breakdown
  const flightStatusData = Object.entries(
    flights.reduce((acc, f) => {
      const s = f.status || 'Unknown'
      acc[s] = (acc[s] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  // Gate utilization - Gate model only has is_available (boolean), no status field
  const gateData = [
    { name: 'Available', value: gates.filter(g => g.is_available === true).length },
    { name: 'Occupied',  value: gates.filter(g => g.is_available === false).length },
  ].filter(d => d.value > 0)

  // Staff by role - field is staff_type, not role
  const staffRoleData = Object.entries(
    staff.reduce((acc, s) => {
      const r = s.staff_type || 'Unknown'
      acc[r] = (acc[r] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  // Maintenance by priority
  const maintPriorityData = Object.entries(
    maintenance.reduce((acc, m) => {
      const p = m.priority || 'Unknown'
      acc[p] = (acc[p] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  // Maintenance by status
  const maintStatusData = Object.entries(
    maintenance.reduce((acc, m) => {
      const s = m.status || 'Unknown'
      acc[s] = (acc[s] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  // Flights over time - field is departure_time, not scheduled_departure
  const flightsByDate = Object.entries(
    flights.reduce((acc, f) => {
      const date = f.departure_time
        ? new Date(f.departure_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
        : 'Unknown'
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})
  ).slice(-10).map(([date, count]) => ({ date, count }))

  // Theme-aware colors for Recharts (SVG props can't read Tailwind/CSS vars, so
  // they're driven from the theme context directly).
  const gridStroke   = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'
  const tickColor    = isDark ? '#9ca3af' : '#6b7280'
  const mutedText    = isDark ? '#9ca3af' : '#6b7280'
  const emptyText    = isDark ? '#6b7280' : '#9ca3af'
  const tooltipStyle = {
    backgroundColor: isDark ? 'rgba(18,18,18,0.9)' : 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(12px)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)'}`,
    color: isDark ? '#fff' : '#111827',
    borderRadius: 12,
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
  }

  return (
    <div className="p-6 space-y-6 max-w-400 mx-auto">
      <PageHeader
        icon={LineChartIcon}
        chip="icon-chip-indigo"
        title="Analytics"
        subtitle="Live operational insights across all modules"
        actions={
          <button
            onClick={loadAll}
            disabled={loading}
            className="glass glass-interactive flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 px-4 py-2.5 rounded-xl disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {/* Stat Pills */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatPill icon={Plane}   chip="icon-chip-blue"    label="Total Flights"    value={flights.length} />
        <StatPill icon={DoorOpen} chip="icon-chip-violet" label="Total Gates"      value={gates.length} />
        <StatPill icon={Users}   chip="icon-chip-amber"   label="Staff Members"    value={staff.length} />
        <StatPill icon={Wrench}  chip="icon-chip-rose"    label="Maintenance Jobs" value={maintenance.length} />
      </div>

      {loading ? (
        <div className="glass rounded-[26px] p-10 text-center text-neutral-500 dark:text-neutral-400 text-sm animate-pulse">
          Loading analytics…
        </div>
      ) : (
        <>
          {/* Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="FLIGHT STATUS BREAKDOWN">
              {flightStatusData.length === 0
                ? <p style={{ color: emptyText }} className="text-[13px]">No flight data yet.</p>
                : <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={flightStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} label={({ name, value }) => `${name}: ${value}`}>
                        {flightStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
              }
            </ChartCard>

            <ChartCard title="GATE UTILIZATION">
              {gateData.length === 0
                ? <p style={{ color: emptyText }} className="text-[13px]">No gate data yet.</p>
                : <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={gateData}>
                      <defs>
                        {COLORS.map((c, i) => (
                          <linearGradient key={i} id={`gateGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={c} stopOpacity={0.95} />
                            <stop offset="100%" stopColor={c} stopOpacity={0.55} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: tickColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)' }} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={64}>
                        {gateData.map((_, i) => <Cell key={i} fill={`url(#gateGrad${i})`} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
              }
            </ChartCard>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="MAINTENANCE BY PRIORITY">
              {maintPriorityData.length === 0
                ? <p style={{ color: emptyText }} className="text-[13px]">No maintenance data yet.</p>
                : <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={maintPriorityData}>
                      <defs>
                        <linearGradient id="priorityGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: tickColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)' }} />
                      <Bar dataKey="value" fill="url(#priorityGrad)" radius={[8, 8, 0, 0]} maxBarSize={64} />
                    </BarChart>
                  </ResponsiveContainer>
              }
            </ChartCard>

            <ChartCard title="STAFF BY ROLE">
              {staffRoleData.length === 0
                ? <p style={{ color: emptyText }} className="text-[13px]">No staff data yet.</p>
                : <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={staffRoleData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} label={({ name, value }) => `${name}: ${value}`}>
                        {staffRoleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
              }
            </ChartCard>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
            <ChartCard title="FLIGHTS OVER TIME" badge={flightsByDate.length > 0 ? `${flightsByDate.length} days` : undefined}>
              {flightsByDate.length === 0
                ? <p style={{ color: emptyText }} className="text-[13px]">No timeline data yet.</p>
                : <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={flightsByDate}>
                      <defs>
                        <linearGradient id="flightsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: tickColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fill="url(#flightsAreaGrad)" dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} />
                    </AreaChart>
                  </ResponsiveContainer>
              }
            </ChartCard>

            <ChartCard title="MAINTENANCE STATUS">
              {maintStatusData.length === 0
                ? <p style={{ color: emptyText }} className="text-[13px]">No data yet.</p>
                : <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={maintStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2} label={({ value }) => `${value}`}>
                        {maintStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ color: mutedText, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
              }
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}
