import { useState } from 'react'
import { Plane, Building2, Cog } from 'lucide-react'
import AirlinesTab  from '../components/flights/AirlinesTab'
import AircraftTab  from '../components/flights/AircraftTab'
import FlightsTab   from '../components/flights/FlightsTab'
import PageHeader   from '../components/PageHeader'
import PillTabs     from '../components/PillTabs'
import usePageMeta  from '../hooks/usePageMeta'

const tabs = [
  { key: 'flights',  label: 'Flights',  icon: Plane },
  { key: 'airlines', label: 'Airlines', icon: Building2 },
  { key: 'aircraft', label: 'Aircraft', icon: Cog },
]

export default function Flights() {
  usePageMeta('Flights', 'Manage flights, airlines and aircraft for airport ground operations.')
  const [activeTab, setActiveTab] = useState('flights')

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      <PageHeader icon={Plane} title="Flights Management" subtitle="Flights, airlines and aircraft in one place" />
      <PillTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      <div>
        {activeTab === 'flights'  && <FlightsTab />}
        {activeTab === 'airlines' && <AirlinesTab />}
        {activeTab === 'aircraft' && <AircraftTab />}
      </div>
    </div>
  )
}
