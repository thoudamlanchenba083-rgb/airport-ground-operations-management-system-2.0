import { useState } from 'react'
import { Users, CalendarClock, Wallet } from 'lucide-react'
import StaffTab from '../components/staff/StaffTab'
import ShiftsTab from '../components/staff/ShiftsTab'
import PayrollTab from '../components/staff/PayrollTab'
import PageHeader from '../components/PageHeader'
import PillTabs from '../components/PillTabs'
import usePageMeta from '../hooks/usePageMeta'

const tabs = [
  { key: 'staff', label: 'Staff', icon: Users },
  { key: 'shifts', label: 'Shifts', icon: CalendarClock },
  { key: 'payroll', label: 'Payroll', icon: Wallet },
]

export default function Staff() {
  usePageMeta('Staff', 'Manage ground staff records, roles, shifts and payroll.')
  const [activeTab, setActiveTab] = useState('staff')

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      <PageHeader icon={Users} chip="icon-chip-emerald" title="Staff Management" subtitle="Records, roles, shifts and payroll" />
      <PillTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      <div>
        {activeTab === 'staff'   && <StaffTab />}
        {activeTab === 'shifts'  && <ShiftsTab />}
        {activeTab === 'payroll' && <PayrollTab />}
      </div>
    </div>
  )
}
