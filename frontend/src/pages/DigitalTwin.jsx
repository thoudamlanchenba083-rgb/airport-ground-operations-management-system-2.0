import { Radar } from 'lucide-react'
import DigitalTwinMap from '../components/digitaltwin/DigitalTwinMap'
import WhatIfSimulator from '../components/digitaltwin/WhatIfSimulator'
import PageHeader from '../components/PageHeader'
import usePageMeta from '../hooks/usePageMeta'

export default function DigitalTwin() {
  usePageMeta('Digital Twin', 'Live 2D view of gates, flights, and ground equipment.')
  return (
    <div className="p-6 space-y-5 max-w-400 mx-auto">
      <PageHeader icon={Radar} chip="icon-chip-blue" title="Airport Digital Twin" subtitle="Live gate occupancy and equipment positions" />
      <DigitalTwinMap />
      <WhatIfSimulator />
    </div>
  )
}