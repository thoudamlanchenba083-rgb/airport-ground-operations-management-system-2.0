import { useState, useMemo } from 'react'
import { Users, CalendarClock, Wallet } from 'lucide-react'
import StaffTab from '../components/staff/StaffTab'
import ShiftsTab from '../components/staff/ShiftsTab'
import PayrollTab from '../components/staff/PayrollTab'
import PageHeader from '../components/PageHeader'
import PillTabs from '../components/PillTabs'
import usePageMeta from '../hooks/usePageMeta'
import { useAuth } from '../context/AuthContext'

const ALL_TABS = [
  { key: 'staff', label: 'Staff', icon: Users },
  { key: 'shifts', label: 'Shifts', icon: CalendarClock },
  { key: 'payroll', label: 'Payroll', icon: Wallet },
]

// Staff/Shifts are backed by IsHR (ADMIN, HR only) on the backend.
// Payroll is backed by IsHRManagement (ADMIN, HR, OPERATIONS_MANAGER, SUPERVISOR).
// OPERATIONS_MANAGER/SUPERVISOR can reach this page (see roleAccess.js) but
// only have backend access to Payroll, so hide the other two tabs for them.
const HR_ONLY_ROLES = ['ADMIN', 'HR']

export default function Staff() {
  usePageMeta('Staff', 'Manage ground staff records, roles, shifts and payroll.')
  const { user } = useAuth()
  const isHR = HR_ONLY_ROLES.includes(user?.role)
  const tabs = useMemo(
    () => (isHR ? ALL_TABS : ALL_TABS.filter((t) => t.key === 'payroll')),
    [isHR]
  )
  const [activeTab, setActiveTab] = useState(isHR ? 'staff' : 'payroll')

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      <PageHeader icon={Users} chip="icon-chip-emerald" title="Staff Management" subtitle="Records, roles, shifts and payroll" />
      <PillTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      <div>
        {activeTab === 'staff'   && isHR && <StaffTab />}
        {activeTab === 'shifts'  && isHR && <ShiftsTab />}
        {activeTab === 'payroll' && <PayrollTab />}
      </div>
    </div>
  )
}