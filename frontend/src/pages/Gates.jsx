import { DoorOpen } from 'lucide-react'
import GatesTab from '../components/gates/GatesTab'
import PageHeader from '../components/PageHeader'
import usePageMeta from '../hooks/usePageMeta'

export default function Gates() {
  usePageMeta('Gates', 'View and manage airport gate assignments and availability.')
  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      <PageHeader icon={DoorOpen} chip="icon-chip-violet" title="Gates" subtitle="Assignments and availability across all terminals" />
      <GatesTab />
    </div>
  )
}
