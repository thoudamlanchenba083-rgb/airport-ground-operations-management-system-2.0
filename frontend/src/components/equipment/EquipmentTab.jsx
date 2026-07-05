import { useEffect, useMemo, useState } from 'react'
import {
  Search, Fuel, Truck, Zap, Package, Snowflake, UtensilsCrossed, Repeat,
  Wrench, CheckCircle2, AlertTriangle, XCircle, Gauge, RefreshCw,
} from 'lucide-react'
import axiosClient from '../../api/axiosClient'

// Icon + accent per equipment type, matched by the human-readable display
// name the backend already sends us (equipment_type_display).
const TYPE_META = {
  'Fuel Truck':               { icon: Fuel,            chip: 'icon-chip-amber'   },
  'Pushback Tractor':         { icon: Truck,            chip: 'icon-chip-blue'    },
  'GPU (Ground Power Unit)':  { icon: Zap,              chip: 'icon-chip-violet'  },
  'Baggage Trolley':          { icon: Package,          chip: 'icon-chip-sky'     },
  'Tow Vehicle':              { icon: Truck,            chip: 'icon-chip-indigo'  },
  'Conveyor Belt':            { icon: Repeat,           chip: 'icon-chip-emerald' },
  'Catering Truck':           { icon: UtensilsCrossed,  chip: 'icon-chip-rose'    },
  'De-icing Truck':           { icon: Snowflake,        chip: 'icon-chip-sky'     },
}
const DEFAULT_TYPE_META = { icon: Wrench, chip: 'icon-chip-indigo' }

const STATUS_META = {
  available:   { label: 'Available',  badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20', dot: 'bg-emerald-500' },
  in_use:      { label: 'In Use',     badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/20',             dot: 'bg-blue-500' },
  maintenance: { label: 'Maintenance',badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20',         dot: 'bg-amber-500' },
  damaged:     { label: 'Damaged',    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20',             dot: 'bg-rose-500' },
}

const URGENCY_COLORS = {
  IMMEDIATE: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20',
  SOON:      'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20',
  ROUTINE:   'bg-neutral-500/10 text-neutral-600 dark:text-neutral-300 border-neutral-500/20',
}

const STATUS_TABS = [
  { key: '',            label: 'All' },
  { key: 'available',   label: 'Available' },
  { key: 'in_use',      label: 'In Use' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'damaged',     label: 'Damaged' },
]

function SummaryCard({ icon: Icon, chip, label, value }) {
  return (
    <div className="glass glass-interactive rounded-2xl p-4 flex items-center gap-3">
      <div className={`icon-chip ${chip} !w-11 !h-11 !rounded-xl`}>
        <Icon size={18} strokeWidth={2.1} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 truncate">{label}</p>
        <p className="text-xl font-bold text-neutral-900 dark:text-white mt-0.5">{value}</p>
      </div>
    </div>
  )
}

function RowSkeleton() {
  return (
    <tr className="border-b border-black/5 dark:border-white/5">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-3.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] animate-pulse" style={{ width: `${50 + (i * 7) % 40}%` }} />
        </td>
      ))}
    </tr>
  )
}

export default function EquipmentTab() {
  const [equipment, setEquipment] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [search,    setSearch]    = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [predictions, setPredictions] = useState({})
  const [predicting,  setPredicting]  = useState(null)

  const load = () => {
    setLoading(true)
    axiosClient.get('/ground-equipment/equipment/')
      .then(r => setEquipment(r.data.results ?? r.data))
      .catch(() => setError('Failed to load equipment.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = equipment.filter(e => {
    const matchSearch = e.equipment_id.toLowerCase().includes(search.toLowerCase())
      || (e.equipment_type_display || '').toLowerCase().includes(search.toLowerCase())
      || (e.location || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus ? e.status === filterStatus : true
    return matchSearch && matchStatus
  })

  const counts = useMemo(() => ({
    total: equipment.length,
    available: equipment.filter(e => e.status === 'available').length,
    in_use: equipment.filter(e => e.status === 'in_use').length,
    maintenance: equipment.filter(e => e.status === 'maintenance').length,
    damaged: equipment.filter(e => e.status === 'damaged').length,
  }), [equipment])

  const predictFailure = (item) => {
    setPredicting(item.id)
    axiosClient.get(`/ground-equipment/equipment/${item.id}/predict_failure/`)
      .then(r => setPredictions(prev => ({ ...prev, [item.id]: r.data })))
      .catch(() => setError('Prediction failed for ' + item.equipment_id + '.'))
      .finally(() => setPredicting(null))
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="glass rounded-xl px-4 py-3 text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard icon={Gauge}         chip="icon-chip-indigo"  label="Total Fleet"  value={loading ? '—' : counts.total} />
        <SummaryCard icon={CheckCircle2}  chip="icon-chip-emerald" label="Available"    value={loading ? '—' : counts.available} />
        <SummaryCard icon={Truck}         chip="icon-chip-blue"    label="In Use"       value={loading ? '—' : counts.in_use} />
        <SummaryCard icon={Wrench}        chip="icon-chip-amber"   label="Maintenance"  value={loading ? '—' : counts.maintenance} />
        <SummaryCard icon={XCircle}       chip="icon-chip-rose"    label="Damaged"      value={loading ? '—' : counts.damaged} />
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-3 flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 min-w-45">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
          <input
            className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-shadow"
            placeholder="Search by ID, type, or location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 rounded-xl p-1 bg-black/5 dark:bg-white/5 flex-wrap">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                filterStatus === tab.key
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="glass-interactive flex items-center justify-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-black/[0.03] dark:bg-white/[0.04] text-neutral-500 dark:text-neutral-400 uppercase text-xs tracking-wide">
                <th className="px-4 py-3 font-medium">Equipment</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Failure Risk</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {loading && Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-neutral-400 dark:text-neutral-500 text-sm">
                    No equipment matches your filters.
                  </td>
                </tr>
              )}

              {!loading && filtered.map(item => {
                const pred = predictions[item.id]
                const meta = TYPE_META[item.equipment_type_display] || DEFAULT_TYPE_META
                const Icon = meta.icon
                const status = STATUS_META[item.status] || STATUS_META.available
                return (
                  <tr key={item.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`icon-chip ${meta.chip} !w-9 !h-9 !rounded-lg shrink-0`}>
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-neutral-900 dark:text-white truncate">{item.equipment_id}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{item.equipment_type_display}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {item.status_display || status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{item.location || '—'}</td>
                    <td className="px-4 py-3">
                      {pred ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${URGENCY_COLORS[pred.prediction.urgency]}`}>
                          {pred.prediction.urgency} · {pred.prediction.failure_risk_score}%
                        </span>
                      ) : (
                        <span className="text-neutral-400 dark:text-neutral-500 text-xs">Not checked</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="text-xs font-medium bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-neutral-800 dark:text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        disabled={predicting === item.id}
                        onClick={() => predictFailure(item)}
                      >
                        {predicting === item.id ? 'Checking…' : 'Predict Failure'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-black/5 dark:border-white/5">
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              Showing {filtered.length} of {equipment.length} item{equipment.length === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
