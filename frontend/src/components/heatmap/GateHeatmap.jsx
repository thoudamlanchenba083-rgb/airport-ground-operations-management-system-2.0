import { useEffect, useState } from 'react'
import { RefreshCw, Flame, TrendingUp } from 'lucide-react'
import axiosClient from '../../api/axiosClient'

const LEVEL_META = {
  low:    { color: '#10b981', label: 'Low congestion',    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20' },
  medium: { color: '#f59e0b', label: 'Medium congestion', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20' },
  high:   { color: '#f43f5e', label: 'High congestion',   badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20' },
}

export default function GateHeatmap() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchHeatmap = async () => {
    try {
      const res = await axiosClient.get('/digital-twin/heatmap/')
      setData(res.data)
      setLastUpdated(new Date())
      setError(null)
    } catch {
      setError('Could not load heat map data.')
    }
  }

  useEffect(() => {
    fetchHeatmap()
    const interval = setInterval(fetchHeatmap, 8000) // refresh every 8s
    return () => clearInterval(interval)
  }, [])

  const gates = data?.gates || []

  return (
    <div className="space-y-4">
      {error && (
        <div className="glass rounded-2xl p-4 text-sm text-rose-500 border border-rose-500/20">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5"><TrendingUp size={13} /> Average Congestion</p>
          <p className="text-2xl font-bold mt-1">{data ? `${data.average_score}%` : '—'}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5"><Flame size={13} /> Busiest Gate</p>
          <p className="text-2xl font-bold mt-1">{data?.busiest_gate || '—'}</p>
        </div>
      </div>

      <div className="glass rounded-[28px] p-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {lastUpdated ? `Live · updated ${lastUpdated.toLocaleTimeString()}` : 'Loading…'}
          </p>
          <button
            onClick={fetchHeatmap}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {gates.map((gate) => {
            const meta = LEVEL_META[gate.level]
            return (
              <div
                key={gate.gate_number}
                title={`${gate.flights_handled_today} flights today · ${gate.delayed_tasks_today} delayed tasks`}
                className="rounded-2xl p-3 flex flex-col items-center justify-center gap-1 text-center transition-transform hover:scale-[1.03]"
                style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}55` }}
              >
                <span className="w-3 h-3 rounded-full" style={{ background: meta.color }} />
                <p className="font-bold text-sm">{gate.gate_number}</p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{gate.terminal}</p>
                <p className="text-xs font-semibold" style={{ color: meta.color }}>{gate.score}%</p>
              </div>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 px-1 text-xs text-neutral-500 dark:text-neutral-400">
          {Object.entries(LEVEL_META).map(([key, meta]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} /> {meta.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}