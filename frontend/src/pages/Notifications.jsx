import NotificationsTab from '../components/notifications/NotificationsTab'
import usePageMeta from '../hooks/usePageMeta'

export default function Notifications() {
  usePageMeta('Notifications', 'View system alerts and notifications for airport ground operations.')
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-white mb-4">Notifications</h2>
      <NotificationsTab />
    </div>
  )
}
