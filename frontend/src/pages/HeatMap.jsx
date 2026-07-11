import { Flame } from 'lucide-react'
import GateHeatmap from '../components/heatmap/GateHeatmap'
import PageHeader from '../components/PageHeader'
import usePageMeta from '../hooks/usePageMeta'

export default function HeatMap() {
  usePageMeta('Heat Map', 'Gate congestion at a glance.')
  return (
    <div className="p-6 space-y-5 max-w-400 mx-auto">
      <PageHeader icon={Flame} chip="icon-chip-rose" title="Airport Heat Map" subtitle="Live gate congestion scoring" />
      <GateHeatmap />
    </div>
  )
}