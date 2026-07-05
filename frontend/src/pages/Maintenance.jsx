import { Wrench } from 'lucide-react'
import MaintenanceTab from '../components/maintenance/MaintenanceTab'
import PageHeader from '../components/PageHeader'
import usePageMeta from '../hooks/usePageMeta'

export default function Maintenance() {
  usePageMeta('Maintenance', 'Manage aircraft maintenance requests and status tracking.')
  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      <PageHeader icon={Wrench} chip="icon-chip-rose" title="Maintenance" subtitle="Requests and status tracking across the fleet" />
      <MaintenanceTab />
    </div>
  )
}
