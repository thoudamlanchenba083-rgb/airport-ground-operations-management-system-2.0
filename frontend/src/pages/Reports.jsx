import ReportsTab from '../components/reports/ReportsTab'
import usePageMeta from '../hooks/usePageMeta'

export default function Reports() {
  usePageMeta('Reports', 'View operational reports and analytics for airport ground operations.')
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-white mb-4">Reports</h2>
      <ReportsTab />
    </div>
  )
}
