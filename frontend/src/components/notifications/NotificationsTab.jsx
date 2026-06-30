import { useState, useEffect } from 'react'
import axiosClient from '../../api/axiosClient'

const TYPE_LABELS = {
  FLIGHT: 'Flight Update',
  MAINTENANCE: 'Maintenance Alert',
  BAGGAGE: 'Baggage Update',
  GENERAL: 'General',
}

const TYPE_COLORS = {
  FLIGHT: 'bg-blue-100 text-blue-700',
  MAINTENANCE: 'bg-yellow-100 text-yellow-700',
  BAGGAGE: 'bg-purple-100 text-purple-700',
  GENERAL: 'bg-gray-100 text-gray-600',
}

export default function NotificationsTab() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => { fetchNotifications() }, [])

  async function fetchNotifications() {
    try {
      setLoading(true)
      const res = await axiosClient.get('/notifications/notifications/')
      setNotifications(res.data.results ?? res.data)
    } catch (e) {
      setError('Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }

  async function markRead(id) {
    try {
      await axiosClient.patch(`/notifications/notifications/${id}/`, { is_read: true })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (e) {
      alert('Failed to mark as read.')
    }
  }

  async function markAllRead() {
    const unread = notifications.filter(n => !n.is_read)
    await Promise.all(unread.map(n => axiosClient.patch(`/notifications/notifications/${n.id}/`, { is_read: true })))
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function handleDelete(id) {
    if (!confirm('Delete this notification?')) return
    await axiosClient.delete(`/notifications/notifications/${id}/`)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const filtered = filter === 'ALL' ? notifications
    : filter === 'UNREAD' ? notifications.filter(n => !n.is_read)
    : notifications.filter(n => n.type === filter)

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) return <p className="text-gray-500 p-4">Loading notifications...</p>
  if (error) return <p className="text-red-500 p-4">{error}</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-700">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount} unread</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-sm text-blue-600 hover:underline">Mark all as read</button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['ALL', 'UNREAD', 'FLIGHT', 'MAINTENANCE', 'BAGGAGE', 'GENERAL'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}
          >
            {f === 'ALL' ? 'All' : f === 'UNREAD' ? 'Unread' : TYPE_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 py-10">No notifications found.</div>
        )}
        {filtered.map(n => (
          <div key={n.id} className={`flex items-start gap-4 p-4 rounded-lg border ${n.is_read ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[n.type] ?? 'bg-gray-100 text-gray-600'}`}>
                  {TYPE_LABELS[n.type] ?? n.type}
                </span>
                {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full inline-block" title="Unread" />}
              </div>
              <p className="text-sm text-gray-800">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
            </div>
            <div className="flex flex-col gap-1 items-end shrink-0">
              {!n.is_read && (
                <button onClick={() => markRead(n.id)} className="text-xs text-blue-600 hover:underline">Mark read</button>
              )}
              <button onClick={() => handleDelete(n.id)} className="text-xs text-red-500 hover:underline">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}