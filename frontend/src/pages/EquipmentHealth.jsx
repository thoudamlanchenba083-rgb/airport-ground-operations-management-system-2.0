import { useEffect, useState } from 'react'
import { HeartPulse, RefreshCw } from 'lucide-react'
import axiosClient from '../api/axiosClient'
import PageHeader from '../components/PageHeader'
import usePageMeta from '../hooks/usePageMeta'
import EquipmentHealthCard from '../components/equipment/EquipmentHealthCard'

export default function EquipmentHealth() {
  usePageMeta('Equipment Health', 'Predictive health and usage scores for the whole fleet.')
  const [items, setItems] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchHealth = async () => {
    try {
      const res = await axiosClient.get('/ground-equipment/equipment/health-scores/')
      setItems(res.data)
      setLastUpdated(new Date())
      setError(null)
    } catch {
      setError('Could not load equipment health scores.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 15000) // refresh every 15s
    return () => clearInterval(interval)
  }, [])

  const highRiskCount = items.filter((i) => i.risk === 'High').length

  return (
    <div className="p-6 space-y-5 max-w-400 mx-auto">
      <PageHeader icon={HeartPulse} chip="icon-chip-rose" title="Equipment Health Score" subtitle="Predictive maintenance across the fleet" />

      {error && (
        <div className="glass rounded-2xl p-4 text-sm text-rose-500 border border-rose-500/20">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Fleet Size</p>
          <p className="text-2xl font-bold mt-1">{items.length}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">High Risk</p>
          <p className="text-2xl font-bold mt-1 text-rose-500">{highRiskCount}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Avg Health</p>
          <p className="text-2xl font-bold mt-1">
            {items.length ? Math.round(items.reduce((s, i) => s + i.health_score, 0) / items.length) : 0}%
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Maintenance Needed</p>
          <p className="text-2xl font-bold mt-1">{items.filter((i) => i.maintenance_required).length}</p>
        </div>
      </div>

      <div className="glass rounded-[28px] p-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading…'}
          </p>
          <button onClick={fetchHealth} className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 px-1">Loading fleet health…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 px-1">No equipment found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <EquipmentHealthCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}