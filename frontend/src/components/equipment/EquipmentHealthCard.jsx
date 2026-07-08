import { HeartPulse, Gauge, Clock } from 'lucide-react'

const RISK_META = {
  Low:    { badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20', bar: 'bg-emerald-500' },
  Medium: { badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20',         bar: 'bg-amber-500' },
  High:   { badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20',             bar: 'bg-rose-500' },
}

function MiniBar({ label, value, colorClass }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{value}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-black/6 dark:bg-white/8 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass} transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  )
}

export default function EquipmentHealthCard({ item }) {
  const risk = RISK_META[item.risk] || RISK_META.Medium

  return (
    <div className="glass glass-interactive rounded-[26px] p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-neutral-900 dark:text-white truncate">{item.equipment_id}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{item.equipment_type}</p>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border shrink-0 ${risk.badge}`}>
          <HeartPulse size={12} /> {item.risk}
        </span>
      </div>

      <MiniBar label="Health" value={item.health_score} colorClass={risk.bar} />
      <MiniBar label="Usage" value={item.usage_score} colorClass="bg-blue-500" />

      <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 pt-1">
        <Clock size={12} />
        <span>{item.runtime_hours} hrs runtime</span>
        {item.maintenance_required && (
          <span className="ml-auto flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
            <Gauge size={12} /> {item.urgency}
          </span>
        )}
      </div>
    </div>
  )
}