// frontend/src/components/digitaltwin/scene/gateLayout.js
//
// Static layout describing where each terminal & gate sits in 3D space.
// Units are meters. X = east/west, Z = north/south, Y = up.
//
// Gates auto-arrange along a pier, grouped by their `terminal` field
// (in the order the API returns them). To match your REAL airport map,
// add explicit entries to GATE_POSITION_OVERRIDES — anything not listed
// there still auto-places, so new gates never break the scene.

const GATE_SPACING = 14   // distance between adjacent gate centers along a pier
const TERMINAL_GAP = 60   // distance between separate terminal buildings (Z axis)

// Example overrides — uncomment / edit to pin exact real-world positions:
// export const GATE_POSITION_OVERRIDES = {
//   'A1': { x: -20, z: 0 },
//   'A2': { x: -6,  z: 0 },
// }
export const GATE_POSITION_OVERRIDES = {}

export function buildLayout(gates) {
  const terminals = []
  const terminalIndex = {}

  gates.forEach((g) => {
    const key = g.terminal || 'Unassigned'
    if (!(key in terminalIndex)) {
      terminalIndex[key] = terminals.length
      terminals.push({ name: key, gates: [] })
    }
    terminals[terminalIndex[key]].gates.push(g)
  })

  const gatePositions = {}
  const terminalBlocks = terminals.map((t, ti) => {
    const z = ti * TERMINAL_GAP
    t.gates.forEach((g, gi) => {
      const override = GATE_POSITION_OVERRIDES[g.gate_number]
      const x = override ? override.x : (gi - (t.gates.length - 1) / 2) * GATE_SPACING
      const gz = override ? override.z : z
      gatePositions[g.gate_number] = { x, z: gz }
    })
    const width = Math.max(t.gates.length * GATE_SPACING, GATE_SPACING) + GATE_SPACING
    return { name: t.name, z, width }
  })

  const yard = {
    x: 0,
    z: terminals.length * TERMINAL_GAP + TERMINAL_GAP / 2,
  }

  return { terminalBlocks, gatePositions, yard }
}

export const GATE_PAD_SIZE = 12
