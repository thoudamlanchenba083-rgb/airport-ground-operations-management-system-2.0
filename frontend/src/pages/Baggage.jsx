import { Package } from 'lucide-react'
import BaggageTab from '../components/baggage/BaggageTab'
import PageHeader from '../components/PageHeader'
import usePageMeta from '../hooks/usePageMeta'

export default function Baggage() {
  usePageMeta('Baggage', 'Track and manage baggage handling for airport ground operations.')
  return (
    <div className="p-6 space-y-5 max-w-400 mx-auto">
      <PageHeader icon={Package} chip="icon-chip-amber" title="Baggage" subtitle="Track handling status across every flight" />
      <BaggageTab />
    </div>
  )
}
