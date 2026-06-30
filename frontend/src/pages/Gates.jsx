import GatesTab from '../components/gates/GatesTab'
import usePageMeta from '../hooks/usePageMeta'

export default function Gates() {
  usePageMeta('Gates', 'View and manage airport gate assignments and availability.')
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Gates</h2>
      <GatesTab />
    </div>
  )
}
