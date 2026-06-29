import { useState } from 'react'
import AirlinesTab from '../components/flights/AirlinesTab'
import AircraftTab from '../components/flights/AircraftTab'
import FlightsTab from '../components/flights/FlightsTab'

const tabs = [
  { key: 'flights', label: 'Flights' },
  { key: 'airlines', label: 'Airlines' },
  { key: 'aircraft', label: 'Aircraft' },
]

export default function Flights() {
  const [activeTab, setActiveTab] = useState('flights')

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Flights</h2>

      <div className="flex gap-2 mb-4 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'flights' && <FlightsTab />}
      {activeTab === 'airlines' && <AirlinesTab />}
      {activeTab === 'aircraft' && <AircraftTab />}
    </div>
  )
}