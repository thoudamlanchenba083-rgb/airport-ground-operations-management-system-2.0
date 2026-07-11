import { Settings2 } from 'lucide-react'
import EquipmentTab from '../components/equipment/EquipmentTab'
import PageHeader from '../components/PageHeader'
import usePageMeta from '../hooks/usePageMeta'

export default function Equipment() {
  usePageMeta('Equipment', 'Track ground equipment status and predict failure risk.')
  return (
    <div className="p-6 space-y-5 max-w-400 mx-auto">
      <PageHeader icon={Settings2} chip="icon-chip-indigo" title="Ground Equipment" subtitle="Status tracking and failure-risk prediction" />
      <EquipmentTab />
    </div>
  )
}
