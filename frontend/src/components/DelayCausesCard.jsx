import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from 'recharts'
import axiosClient from '../api/axiosClient'
import { useTheme } from '../context/ThemeContext'

const REASON_COLORS = {
  FUEL: '#f59e0b',
  WEATHER: '#38bdf8',
  CLEANING: '#a855f7',
  CREW: '#f43f5e',
  GATE_UNAVAILABLE: '#818cf8',
  EQUIPMENT_UNAVAILABLE: '#10b981',
  BAGGAGE: '#eab308',
  CATERING: '#fb7185',
  OTHER: '#94a3b8',
}

export default function DelayCausesCard({ days } = {}) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    axiosClient.get('/turnaround/turnaround-tasks/delay-causes/', { params: days ? { days } : {} })
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load delay causes.'))
      .finally(() => setLoading(false))
  }, [days])

  const chartData = (data?.breakdown || []).map((row) => ({
    name: row.reason_display,
    percent: row.percent,
    count: row.count,
    reason: row.reason,
  }))

  const tickColor = isDark ? '#a3a3a3' : '#64748b'
  const gridStroke = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'
  const tooltipStyle = {
    background: isDark ? '#171717' : '#ffffff',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)'}`,
    borderRadius: 10,
    fontSize: 12,
    color: isDark ? '#f5f5f5' : '#0f172a',
  }

  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wide text-neutral-500 dark:text-neutral-400 uppercase flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500" />
          Top Delay Causes
        </h3>
        {data && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20 whitespace-nowrap">
            {data.total_delayed_tasks} delayed task{data.total_delayed_tasks === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {loading && <p className="text-neutral-500 dark:text-neutral-400 text-[13px]">Loading...</p>}
      {error && <p className="text-red-500 text-[13px]">{error}</p>}

      {!loading && !error && chartData.length === 0 && (
        <p className="text-neutral-400 dark:text-neutral-500 text-[13px]">No delayed tasks recorded yet.</p>
      )}

      {!loading && !error && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 42)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
            <YAxis type="category" dataKey="name" tick={{ fill: tickColor, fontSize: 12 }} axisLine={false} tickLine={false} width={140} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, _name, props) => [`${value}% (${props.payload.count})`, 'Share of delays']}
            />
            <Bar dataKey="percent" radius={[0, 8, 8, 0]} maxBarSize={22}>
              {chartData.map((row, i) => (
                <Cell key={i} fill={REASON_COLORS[row.reason] || '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
