import { useState, useEffect } from 'react'
import { Zap, AlertTriangle, ArrowRightLeft, Users, Truck, Loader2 } from 'lucide-react'
import axiosClient from '../../api/axiosClient'

export default function WhatIfSimulator() {
  const [gates, setGates] = useState([])
  const [selectedGate, setSelectedGate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    axiosClient.get('/digital-twin/snapshot/')
      .then((res) => setGates(res.data.gates || []))
      .catch(() => setError('Could not load gate list.'))
  }, [])

  const runSimulation = async () => {
    if (!selectedGate) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await axiosClient.get(`/digital-twin/what-if/gate-closure/${selectedGate}/`)
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Simulation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={18} className="text-amber-500" />
          <h3 className="font-semibold text-neutral-900 dark:text-white">What-If Simulation</h3>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
          Ask "what if this gate closes?" and instantly see the predicted impact.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedGate}
            onChange={(e) => setSelectedGate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white"
          >
            <option value="">Select a gate…</option>
            {gates.map((g) => (
              <option key={g.gate_number} value={g.gate_number}>
                Gate {g.gate_number} ({g.terminal})
              </option>
            ))}
          </select>
          <button
            onClick={runSimulation}
            disabled={!selectedGate || loading}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {loading ? 'Simulating…' : `What if Gate ${selectedGate || '?'} closes?`}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel icon={AlertTriangle} color="text-red-500" title={`Delayed Flights (${result.delayed_flights.length})`}>
            {result.delayed_flights.length === 0 && <Empty text="No active flights at this gate." />}
            {result.delayed_flights.map((f) => (
              <div key={f.flight_number} className="text-sm py-1.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                <span className="font-medium text-neutral-900 dark:text-white">{f.flight_number}</span>
                <span className="text-neutral-500 dark:text-neutral-400"> — {f.airline}</span>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {f.new_departure
                    ? `${f.original_departure} → ${f.new_departure} (+${f.delay_minutes} min)`
                    : f.reason}
                </div>
              </div>
            ))}
          </Panel>

          <Panel icon={ArrowRightLeft} color="text-blue-500" title={`New Gate Assignments (${result.new_gate_assignments.length})`}>
            {result.new_gate_assignments.length === 0 && <Empty text="No reassignments needed." />}
            {result.new_gate_assignments.map((g) => (
              <div key={g.flight_number} className="text-sm py-1.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                <span className="font-medium text-neutral-900 dark:text-white">{g.flight_number}</span>
                <span className="text-neutral-500 dark:text-neutral-400"> — Gate {g.old_gate} → Gate {g.new_gate}</span>
              </div>
            ))}
          </Panel>

          <Panel icon={Users} color="text-purple-500" title={`Staff Changes (${result.staff_changes.length})`}>
            {result.staff_changes.length === 0 && <Empty text="No staff reassignments needed." />}
            {result.staff_changes.map((s, i) => (
              <div key={i} className="text-sm py-1.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                <span className="font-medium text-neutral-900 dark:text-white">{s.staff_name}</span>
                <span className="text-neutral-500 dark:text-neutral-400"> — {s.task} on {s.flight_number}</span>
              </div>
            ))}
          </Panel>

          <Panel icon={Truck} color="text-emerald-500" title={`Equipment Movement (${result.equipment_movement.length})`}>
            {result.equipment_movement.length === 0 && <Empty text="No equipment needs to move." />}
            {result.equipment_movement.map((e, i) => (
              <div key={i} className="text-sm py-1.5 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                <span className="font-medium text-neutral-900 dark:text-white">{e.equipment_id}</span>
                <span className="text-neutral-500 dark:text-neutral-400"> ({e.equipment_type}) — {e.flight_number}</span>
              </div>
            ))}
          </Panel>
        </div>
      )}
    </div>
  )
}

function Panel({ icon: Icon, color, title, children }) {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className={color} />
        <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</h4>
      </div>
      <div>{children}</div>
    </div>
  )
}

function Empty({ text }) {
  return <p className="text-xs text-neutral-400 dark:text-neutral-500">{text}</p>
}