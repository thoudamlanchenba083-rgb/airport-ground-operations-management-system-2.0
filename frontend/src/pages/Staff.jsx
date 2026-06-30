import StaffTab from '../components/staff/StaffTab'
import usePageMeta from '../hooks/usePageMeta'

export default function Staff() {
  usePageMeta('Staff', 'Manage ground staff records, roles and assignments.')
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Staff Management</h2>
      <StaffTab />
    </div>
  )
}
