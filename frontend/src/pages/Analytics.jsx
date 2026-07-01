import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import axiosClient from '../api/axiosClient'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const Card = ({ title, children }) => (
  <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 24 }}>
    <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 20, letterSpacing: 1 }}>
      {title}
    </h3>
    {children}
  </div>
)

export default function Analytics() {
  const [flights, setFlights]       = useState([])
  const [gates, setGates]           = useState([])
  const [staff, setStaff]           = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
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
  }, [])

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

  const tooltipStyle = { backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#fff', borderRadius: 8 }

  if (loading) return (
    <div style={{ padding: 40, color: '#888' }}>Loading analytics...</div>
  )

  return (
    <div style={{ padding: 32, backgroundColor: '#171717', minHeight: '100vh' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>Analytics</h1>
        <p style={{ color: '#888', fontSize: 14, marginTop: 4 }}>Live operational insights across all modules</p>
      </div>

      {/* Stat Pills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Flights',      value: flights.length,     color: '#3b82f6' },
          { label: 'Total Gates',        value: gates.length,       color: '#10b981' },
          { label: 'Staff Members',      value: staff.length,       color: '#f59e0b' },
          { label: 'Maintenance Jobs',   value: maintenance.length, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ color: s.color, fontSize: 28, fontWeight: 800 }}>{s.value}</div>
            <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="FLIGHT STATUS BREAKDOWN">
          {flightStatusData.length === 0
            ? <p style={{ color: '#555', fontSize: 13 }}>No flight data yet.</p>
            : <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={flightStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {flightStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
          }
        </Card>

        <Card title="GATE UTILIZATION">
          {gateData.length === 0
            ? <p style={{ color: '#555', fontSize: 13 }}>No gate data yet.</p>
            : <ResponsiveContainer width="100%" height={250}>
                <BarChart data={gateData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#888', fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {gateData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          }
        </Card>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card title="MAINTENANCE BY PRIORITY">
          {maintPriorityData.length === 0
            ? <p style={{ color: '#555', fontSize: 13 }}>No maintenance data yet.</p>
            : <ResponsiveContainer width="100%" height={250}>
                <BarChart data={maintPriorityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#888', fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </Card>

        <Card title="STAFF BY ROLE">
          {staffRoleData.length === 0
            ? <p style={{ color: '#555', fontSize: 13 }}>No staff data yet.</p>
            : <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={staffRoleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {staffRoleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
          }
        </Card>
      </div>

      {/* Row 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <Card title="FLIGHTS OVER TIME">
          {flightsByDate.length === 0
            ? <p style={{ color: '#555', fontSize: 13 }}>No timeline data yet.</p>
            : <ResponsiveContainer width="100%" height={250}>
                <LineChart data={flightsByDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#888', fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                </LineChart>
              </ResponsiveContainer>
          }
        </Card>

        <Card title="MAINTENANCE STATUS">
          {maintStatusData.length === 0
            ? <p style={{ color: '#555', fontSize: 13 }}>No data yet.</p>
            : <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={maintStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${value}`}>
                    {maintStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ color: '#888', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
          }
        </Card>
      </div>
    </div>
  )
}