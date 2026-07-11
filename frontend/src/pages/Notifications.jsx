import { Bell } from 'lucide-react'
import NotificationsTab from '../components/notifications/NotificationsTab'
import PageHeader from '../components/PageHeader'
import usePageMeta from '../hooks/usePageMeta'

export default function Notifications() {
  usePageMeta('Notifications', 'View system alerts and notifications for airport ground operations.')
  return (
    <div className="p-6 space-y-5 max-w-400 mx-auto">
      <PageHeader icon={Bell} chip="icon-chip-sky" title="Notifications" subtitle="System alerts across every operation" />
      <NotificationsTab />
    </div>
  )
}
