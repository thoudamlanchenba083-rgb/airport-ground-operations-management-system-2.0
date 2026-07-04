import { useState } from 'react'
import StaffTab from '../components/staff/StaffTab'
import ShiftsTab from '../components/staff/ShiftsTab'
import PayrollTab from '../components/staff/PayrollTab'
import usePageMeta from '../hooks/usePageMeta'

const tabs = [
  { key: 'staff', label: 'Staff' },
  { key: 'shifts', label: 'Shifts' },
  { key: 'payroll', label: 'Payroll' },
]

export default function Staff() {
  usePageMeta('Staff', 'Manage ground staff records, roles, shifts and payroll.')
  const [activeTab, setActiveTab] = useState('staff')

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Management</h2>
      <div className="flex gap-1 border-b border-gray-200 dark:border-neutral-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-100 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>
        {activeTab === 'staff'   && <StaffTab />}
        {activeTab === 'shifts'  && <ShiftsTab />}
        {activeTab === 'payroll' && <PayrollTab />}
      </div>
    </div>
  )
}
