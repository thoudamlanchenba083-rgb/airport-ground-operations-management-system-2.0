import MaintenanceTab from '../components/maintenance/MaintenanceTab'
import usePageMeta from '../hooks/usePageMeta'

export default function Maintenance() {
  usePageMeta('Maintenance', 'Manage aircraft maintenance requests and status tracking.')
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Maintenance</h2>
      <MaintenanceTab />
    </div>
  )
}
