import BaggageTab from '../components/baggage/BaggageTab'
import usePageMeta from '../hooks/usePageMeta'

export default function Baggage() {
  usePageMeta('Baggage', 'Track and manage baggage handling for airport ground operations.')
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Baggage</h2>
      <BaggageTab />
    </div>
  )
}
