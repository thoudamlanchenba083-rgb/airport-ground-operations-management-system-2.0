import { useState } from 'react'
import AirlinesTab  from '../components/flights/AirlinesTab'
import AircraftTab  from '../components/flights/AircraftTab'
import FlightsTab   from '../components/flights/FlightsTab'

const tabs = [
  { key: 'flights',  label: 'Flights',  icon: '✈️' },
  { key: 'airlines', label: 'Airlines', icon: '🏢' },
  { key: 'aircraft', label: 'Aircraft', icon: '🛩️' },
]

export default function Flights() {
  const [activeTab, setActiveTab] = useState('flights')

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Flights Management</h2>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'flights'  && <FlightsTab />}
        {activeTab === 'airlines' && <AirlinesTab />}
        {activeTab === 'aircraft' && <AircraftTab />}
      </div>
    </div>
  )
}
