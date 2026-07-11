// frontend/src/components/digitaltwin/scene/Terminal3DScene.jsx
import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { buildLayout, GATE_PAD_SIZE } from './gateLayout'

const GATE_COLOR = {
  maintenance: '#f59e0b',
  occupied: '#3b82f6',
  available: '#10b981',
}

const EQUIPMENT_COLOR = {
  available: '#10b981',
  in_use: '#3b82f6',
  maintenance: '#f59e0b',
  damaged: '#f43f5e',
}

function gateState(gate) {
  if (gate.is_under_maintenance) return 'maintenance'
  if (gate.flight) return 'occupied'
  return 'available'
}

function TerminalBuilding({ z, width }) {
  return (
    <group position={[0, 0, z - 9]}>
      <mesh position={[0, 3, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 6, 12]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, 3, 6.05]}>
        <boxGeometry args={[width - 2, 5, 0.1]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0ea5e9"
          emissiveIntensity={0.15}
          transparent
          opacity={0.55}
        />
      </mesh>
    </group>
  )
}

function GateStand({ gate, position }) {
  const state = gateState(gate)
  const color = GATE_COLOR[state]

  return (
    <group position={[position.x, 0, position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[GATE_PAD_SIZE, 10]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* jet bridge stub, colored by gate state */}
      <mesh position={[0, 1, -4]} castShadow>
        <boxGeometry args={[2.4, 1.6, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* aircraft silhouette when a flight is at the gate */}
      {gate.flight && (
        <mesh position={[0, 1, 2]} castShadow>
          <capsuleGeometry args={[0.9, 6, 4, 8]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
      )}

      <Html position={[0, 3.2, -4]} center distanceFactor={16} occlude>
        <div
          style={{
            background: 'rgba(15,23,42,0.85)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: 8,
            fontSize: 11,
            whiteSpace: 'nowrap',
            fontFamily: 'system-ui',
            border: `1px solid ${color}`,
          }}
        >
          <strong>{gate.gate_number}</strong>
          {gate.flight ? ` · ${gate.flight.flight_number}` : ''}
        </div>
      </Html>
    </group>
  )
}

function EquipmentUnit({ eq, x, z }) {
  const color = EQUIPMENT_COLOR[eq.status] || '#94a3b8'
  return (
    <mesh position={[x, 0.4, z]} castShadow>
      <capsuleGeometry args={[0.35, 0.6, 4, 8]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

export default function Terminal3DScene({ gates, equipment }) {
  const layout = useMemo(() => buildLayout(gates), [gates])

  const equipmentByGate = useMemo(() => {
    const grouped = {}
    const yard = []
    equipment.forEach((e) => {
      if (e.assigned_gate && layout.gatePositions[e.assigned_gate]) {
        grouped[e.assigned_gate] = grouped[e.assigned_gate] || []
        grouped[e.assigned_gate].push(e)
      } else {
        yard.push(e)
      }
    })
    return { grouped, yard }
  }, [equipment, layout])

  return (
    <div style={{ height: 520, borderRadius: 24, overflow: 'hidden' }}>
      <Canvas shadows camera={{ position: [40, 35, 60], fov: 45 }}>
        <color attach="background" args={['#0b1120']} />
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[30, 40, 20]}
          intensity={1.1}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />

        <Suspense fallback={null}>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            position={[0, -0.01, layout.yard.z / 2]}
          >
            <planeGeometry args={[400, layout.yard.z + 80]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>

          {layout.terminalBlocks.map((t) => (
            <TerminalBuilding key={t.name} z={t.z} width={t.width} />
          ))}

          {gates.map((gate) => {
            const pos = layout.gatePositions[gate.gate_number]
            if (!pos) return null
            return <GateStand key={gate.gate_number} gate={gate} position={pos} />
          })}

          {gates.map((gate) => {
            const pos = layout.gatePositions[gate.gate_number]
            if (!pos) return null
            const eqs = equipmentByGate.grouped[gate.gate_number] || []
            return eqs.map((eq, i) => (
              <EquipmentUnit
                key={eq.equipment_id}
                eq={eq}
                x={pos.x + (i % 4) * 1.6 - 2.4}
                z={pos.z + Math.floor(i / 4) * 1.6}
              />
            ))
          })}

          {/* Equipment yard for unassigned units */}
          <mesh
            position={[layout.yard.x, 0.02, layout.yard.z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[30, 20]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          {equipmentByGate.yard.map((eq, i) => (
            <EquipmentUnit
              key={eq.equipment_id}
              eq={eq}
              x={layout.yard.x - 12 + (i % 6) * 4}
              z={layout.yard.z - 6 + Math.floor(i / 6) * 4}
            />
          ))}
        </Suspense>

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={20}
          maxDistance={160}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>
    </div>
  )
}
