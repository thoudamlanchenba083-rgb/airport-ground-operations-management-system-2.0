import { BarChart3 } from 'lucide-react'
import ReportsTab from '../components/reports/ReportsTab'
import PageHeader from '../components/PageHeader'
import usePageMeta from '../hooks/usePageMeta'

export default function Reports() {
  usePageMeta('Reports', 'View operational reports and analytics for airport ground operations.')
  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      <PageHeader icon={BarChart3} chip="icon-chip-emerald" title="Reports" subtitle="Operational reports and performance analytics" />
      <ReportsTab />
    </div>
  )
}
