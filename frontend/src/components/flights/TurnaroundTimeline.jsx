import { useState } from 'react'
import { CheckCircle2, Circle, AlertTriangle, Loader2, MinusCircle, ChevronDown } from 'lucide-react'

const STATUS_ICON = {
  COMPLETED: CheckCircle2,
  IN_PROGRESS: Loader2,
  DELAYED: AlertTriangle,
  SKIPPED: MinusCircle,
  PENDING: Circle,
}

const STATUS_NODE_COLOR = {
  COMPLETED: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
  IN_PROGRESS: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
  DELAYED: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
  SKIPPED: 'text-neutral-400 bg-neutral-500/10 border-neutral-500/20',
  PENDING: 'text-neutral-400 bg-neutral-500/5 border-neutral-500/20',
}

const STATUS_LINE_COLOR = {
  COMPLETED: 'bg-emerald-500',
  IN_PROGRESS: 'bg-blue-500',
  DELAYED: 'bg-rose-500',
  SKIPPED: 'bg-neutral-400',
  PENDING: 'bg-neutral-300 dark:bg-neutral-700',
}

const STATUS_LABEL = {
  COMPLETED: 'Completed',
  IN_PROGRESS: 'Running',
  DELAYED: 'Delayed',
  SKIPPED: 'Skipped',
  PENDING: 'Pending',
}

/**
 * Horizontal step timeline for a flight's turnaround checklist.
 * Each step is clickable - clicking expands the same editing controls
 * that used to live in the table (status, staff, equipment, delay reason),
 * so this replaces the table as the primary view without losing any
 * functionality.
 */
export default function TurnaroundTimeline({
  tasks, taskSequence, canWrite, staffList, equipmentList,
  taskEquipmentMap, taskStaffMap, delayReasons, statusChoices,
  onUpdateTask, onAutoAssignStaff, onAutoAssignEquipment,
  autoAssigningTaskId, autoAssigningStaffTaskId,
}) {
  const [expandedId, setExpandedId] = useState(null)

  const orderedTasks = taskSequence
    .map(([type, label]) => ({ type, label, task: tasks.find((t) => t.task_type === type) }))
    .filter((entry) => entry.task)

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start overflow-x-auto pb-2">
        {orderedTasks.map(({ type, label, task }, idx) => {
          const Icon = STATUS_ICON[task.status] || Circle
          const isExpanded = expandedId === task.id
          const isLast = idx === orderedTasks.length - 1
          return (
            <div key={task.id} className="flex items-start shrink-0">
              <div className="flex flex-col items-center w-24">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : task.id)}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-105 ${STATUS_NODE_COLOR[task.status]}`}
                  title={`${label} — ${STATUS_LABEL[task.status]}`}
                >
                  <Icon size={18} className={task.status === 'IN_PROGRESS' ? 'animate-spin' : ''} />
                </button>
                <p className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 text-center mt-2 leading-tight">{label}</p>
                <p className={`text-[10px] mt-0.5 ${
                  task.status === 'DELAYED' ? 'text-rose-500' :
                  task.status === 'COMPLETED' ? 'text-emerald-500' :
                  task.status === 'IN_PROGRESS' ? 'text-blue-500' : 'text-neutral-400'
                }`}>
                  {STATUS_LABEL[task.status]}
                </p>
              </div>
              {!isLast && (
                <div className={`h-0.5 w-8 mt-5 rounded-full ${STATUS_LINE_COLOR[task.status]}`} />
              )}
            </div>
          )
        })}
      </div>

      {expandedId && (() => {
        const entry = orderedTasks.find((e) => e.task.id === expandedId)
        if (!entry) return null
        const { task, label } = entry
        return (
          <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">{label}</h4>
              <button onClick={() => setExpandedId(null)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                <ChevronDown size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">Status</label>
                <select
                  value={task.status}
                  disabled={!canWrite}
                  onChange={(e) => onUpdateTask(task.id, { status: e.target.value })}
                  style={{ colorScheme: 'dark' }}
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-2.5 py-2 text-xs"
                >
                  {statusChoices.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">Staff</label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={task.assigned_staff || ''}
                    disabled={!canWrite}
                    onChange={(e) => onUpdateTask(task.id, { assigned_staff: e.target.value || null })}
                    style={{ colorScheme: 'dark' }}
                    className="flex-1 min-w-0 bg-neutral-100 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-2.5 py-2 text-xs"
                  >
                    <option value="">Unassigned</option>
                    {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {canWrite && (
                    <button
                      onClick={() => onAutoAssignStaff(task)}
                      disabled={autoAssigningStaffTaskId === task.id}
                      title={`Auto-assign available ${taskStaffMap[task.task_type] || 'GROUND'} staff`}
                      className="text-[10px] font-semibold px-2 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                    >
                      {autoAssigningStaffTaskId === task.id ? '…' : 'Auto'}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">Equipment</label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={task.assigned_equipment || ''}
                    disabled={!canWrite}
                    onChange={(e) => onUpdateTask(task.id, { assigned_equipment: e.target.value || null })}
                    style={{ colorScheme: 'dark' }}
                    className="flex-1 min-w-0 bg-neutral-100 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-2.5 py-2 text-xs"
                  >
                    <option value="">None</option>
                    {equipmentList.map((eq) => <option key={eq.id} value={eq.id}>{eq.equipment_id}</option>)}
                  </select>
                  {canWrite && taskEquipmentMap[task.task_type] && (
                    <button
                      onClick={() => onAutoAssignEquipment(task)}
                      disabled={autoAssigningTaskId === task.id}
                      title="Auto-assign nearest available equipment"
                      className="text-[10px] font-semibold px-2 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                    >
                      {autoAssigningTaskId === task.id ? '…' : 'Auto'}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-neutral-500 dark:text-neutral-400 mb-1">Delay Reason</label>
                <select
                  value={task.delay_reason || 'NONE'}
                  disabled={!canWrite}
                  onChange={(e) => onUpdateTask(task.id, { delay_reason: e.target.value })}
                  style={{ colorScheme: 'dark' }}
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-black/10 dark:border-white/10 text-neutral-900 dark:text-white rounded-lg px-2.5 py-2 text-xs"
                >
                  {delayReasons.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
            </div>
            {task.duration_minutes != null && (
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-3">Duration: {task.duration_minutes} min</p>
            )}
          </div>
        )
      })()}
    </div>
  )
}