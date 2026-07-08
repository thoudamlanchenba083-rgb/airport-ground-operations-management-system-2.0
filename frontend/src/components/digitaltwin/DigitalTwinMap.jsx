import { useEffect, useState, useMemo } from 'react'
import { RefreshCw, DoorOpen, Wrench, PlaneTakeoff } from 'lucide-react'
import axiosClient from '../../api/axiosClient'

const GATE_COLORS = {
  maintenance: { fill: '#f59e0b', label: '#78350f' }, // amber
  occupied:    { fill: '#3b82f6', label: '#ffffff' },  // blue
  available:   { fill: '#10b981', label: '#064e3b' },  // emerald
}

const EQUIPMENT_COLORS = {
  available: '#10b981',
  in_use: '#3b82f6',
  maintenance: '#f59e0b',
  damaged: '#f43f5e',
}

function gateVisualState(gate) {
  if (gate.is_under_maintenance) return 'maintenance'
  if (gate.flight) return 'occupied'
  return 'available'
}

export default function DigitalTwinMap() {
  const [snapshot, setSnapshot] = useState(null)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchSnapshot = async () => {
    try {
      const res = await axiosClient.get('/digital-twin/snapshot/')
      setSnapshot(res.data)
      setLastUpdated(new Date())
      setError(null)
    } catch {
      setError('Could not load live airport data.')
    }
  }

  useEffect(() => {
    fetchSnapshot()
    const interval = setInterval(fetchSnapshot, 5000) // live refresh every 5s
    return () => clearInterval(interval)
  }, [])

  const gates = snapshot?.gates || []
  const equipment = snapshot?.equipment || []

  // Lay gates out left-to-right; equipment grouped under the gate it's
  // currently working, unassigned equipment grouped in a "yard" on the right.
  const gateWidth = 140
  const gateGap = 30
  const gateY = 80

  const gateX = useMemo(() => {
    const map = {}
    gates.forEach((g, i) => {
      map[g.gate_number] = 40 + i * (gateWidth + gateGap)
    })
    return map
  }, [gates])

  const yardX = 40 + gates.length * (gateWidth + gateGap) + 20

  const equipmentByGate = useMemo(() => {
    const grouped = {}
    const yard = []
    equipment.forEach((e) => {
      if (e.assigned_gate && gateX[e.assigned_gate] !== undefined) {
        grouped[e.assigned_gate] = grouped[e.assigned_gate] || []
        grouped[e.assigned_gate].push(e)
      } else {
        yard.push(e)
      }
    })
    return { grouped, yard }
  }, [equipment, gateX])

  const svgWidth = Math.max(900, yardX + 220)
  const svgHeight = 420

  return (
    <div className="space-y-4">
      {error && (
        <div className="glass rounded-2xl p-4 text-sm text-rose-500 border border-rose-500/20">
          {error}
        </div>
      )}
      <div className="glass rounded-[28px] p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-2 px-2">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {lastUpdated ? `Live · updated ${lastUpdated.toLocaleTimeString()}` : 'Loading live data…'}
          </p>
          <button
            onClick={fetchSnapshot}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
        <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
          {/* Gates */}
          {gates.map((gate) => {
            const x = gateX[gate.gate_number]
            const state = gateVisualState(gate)
            const colors = GATE_COLORS[state]
            const gateEquipment = equipmentByGate.grouped[gate.gate_number] || []
            return (
              <g key={gate.gate_number}>
                <title>
                  {gate.gate_number} · {gate.terminal} · {state}
                  {gate.flight ? ` · ${gate.flight.flight_number} (${gate.flight.status})` : ''}
                </title>
                {/* Terminal building block */}
                <rect x={x} y={gateY} width={gateWidth} height={70} rx={12}
                      fill={colors.fill} opacity={0.9} />
                <text x={x + gateWidth / 2} y={gateY + 26} textAnchor="middle"
                      fontSize="15" fontWeight="700" fill={colors.label}>
                  {gate.gate_number}
                </text>
                <text x={x + gateWidth / 2} y={gateY + 44} textAnchor="middle"
                      fontSize="10" fill={colors.label} opacity={0.85}>
                  {gate.terminal} · {gate.gate_type}
                </text>
                {gate.flight ? (
                  <text x={x + gateWidth / 2} y={gateY + 60} textAnchor="middle"
                        fontSize="11" fontWeight="600" fill={colors.label}>
                    ✈ {gate.flight.flight_number}
                  </text>
                ) : (
                  <text x={x + gateWidth / 2} y={gateY + 60} textAnchor="middle"
                        fontSize="10" fill={colors.label} opacity={0.8}>
                    {state === 'maintenance' ? 'Under maintenance' : 'Empty'}
                  </text>
                )}

                {/* Apron strip in front of the gate */}
                <rect x={x} y={gateY + 80} width={gateWidth} height={10} rx={4}
                      fill="currentColor" className="text-neutral-300 dark:text-neutral-700" />

                {/* Equipment currently working this gate */}
                {gateEquipment.map((eq, i) => (
                  <g key={eq.equipment_id} transform={`translate(${x + 14 + i * 26}, ${gateY + 110})`}>
                    <title>{eq.type_display} {eq.equipment_id} · {eq.status}</title>
                    <circle r="9" fill={EQUIPMENT_COLORS[eq.status] || '#94a3b8'} />
                    <text y="4" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">
                      {eq.type_display?.[0] || '?'}
                    </text>
                  </g>
                ))}
              </g>
            )
          })}

          {/* Unassigned equipment yard */}
          <text x={yardX} y={gateY - 10} fontSize="11" fontWeight="600"
                className="fill-neutral-500 dark:fill-neutral-400">
            Equipment Yard
          </text>
          <rect x={yardX} y={gateY} width={180} height={280} rx={12}
                fill="currentColor" className="text-neutral-200/60 dark:text-neutral-800/60" />
          {equipmentByGate.yard.map((eq, i) => (
            <g key={eq.equipment_id}
               transform={`translate(${yardX + 25 + (i % 5) * 30}, ${gateY + 30 + Math.floor(i / 5) * 30})`}>
              <title>{eq.type_display} {eq.equipment_id} · {eq.status}</title>
              <circle r="10" fill={EQUIPMENT_COLORS[eq.status] || '#94a3b8'} />
              <text y="4" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">
                {eq.type_display?.[0] || '?'}
              </text>
            </g>
          ))}
        </svg>
        <div className="flex flex-wrap items-center gap-4 mt-3 px-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: GATE_COLORS.available.fill }} /> Gate available</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: GATE_COLORS.occupied.fill }} /> Gate occupied</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: GATE_COLORS.maintenance.fill }} /> Under maintenance</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: EQUIPMENT_COLORS.in_use }} /> Equipment in use</span>
        </div>
      </div>

      {snapshot?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5"><DoorOpen size={13} /> Total Gates</p>
            <p className="text-2xl font-bold mt-1">{snapshot.summary.total_gates}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5"><PlaneTakeoff size={13} /> Occupied</p>
            <p className="text-2xl font-bold mt-1">{snapshot.summary.occupied_gates}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5"><Wrench size={13} /> Equipment</p>
            <p className="text-2xl font-bold mt-1">{snapshot.summary.total_equipment}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">In Use</p>
            <p className="text-2xl font-bold mt-1">{snapshot.summary.equipment_in_use}</p>
          </div>
        </div>
      )}
    </div>
  )
}