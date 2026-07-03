import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { canAccessPage } from '../utils/roleAccess'
const navItems = [
  { to: '/dashboard',     label: 'Dashboard',    page: 'dashboard' },
  { to: '/flights',       label: 'Flights',      page: 'flights' },
  { to: '/gates',         label: 'Gates',        page: 'gates' },
  { to: '/baggage',       label: 'Baggage',      page: 'baggage' },
  { to: '/maintenance',   label: 'Maintenance',  page: 'maintenance' },
  { to: '/equipment',     label: 'Equipment',    page: 'equipment' },
  { to: '/staff',         label: 'Staff',        page: 'staff' },
  { to: '/notifications', label: 'Notifications',page: 'notifications' },
  { to: '/reports',       label: 'Reports',      page: 'reports' },
  { to: '/chatbot',       label: 'AI Assistant', page: 'chatbot' },
  { to: '/analytics',     label: 'Analytics',    page: 'analytics' },
]
export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const visibleNavItems = navItems.filter((item) => canAccessPage(user, item.page))
  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }
  return (
    <div className="min-h-screen flex bg-white dark:bg-[#171717]">
      <aside className="w-60 h-screen flex flex-col shrink-0 sticky top-0 bg-gray-50 dark:bg-[#0f0f0f] border-r border-black/10 dark:border-white/10">
        <div className="px-5 py-5 border-b border-black/10 dark:border-white/10 flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">&#9992;</div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">AeroGround</h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">Ops Management</p>
          </div>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-0.5">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-black/10 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <p className="text-xs text-gray-700 dark:text-slate-300 truncate">{user?.username || 'User'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-sm bg-red-600/80 hover:bg-red-600 text-white py-1.5 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-white dark:bg-[#171717]">
        {children}
      </main>
    </div>
  )
}
