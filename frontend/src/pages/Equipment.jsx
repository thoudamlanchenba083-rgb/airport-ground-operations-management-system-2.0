import EquipmentTab from '../components/equipment/EquipmentTab'
import usePageMeta from '../hooks/usePageMeta'

export default function Equipment() {
  usePageMeta('Equipment', 'Track ground equipment status and predict failure risk.')
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-white mb-4">Ground Equipment</h2>
      <EquipmentTab />
    </div>
  )
}
