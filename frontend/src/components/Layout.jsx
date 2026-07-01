import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/dashboard',     label: 'Dashboard' },
  { to: '/flights',       label: 'Flights' },
  { to: '/gates',         label: 'Gates' },
  { to: '/baggage',       label: 'Baggage'},
  { to: '/maintenance',   label: 'Maintenance'},
  { to: '/equipment',     label: 'Equipment'},
  { to: '/staff',         label: 'Staff' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/reports',       label: 'Reports',},
  { to: '/chatbot',       label: 'AI Assistant', },
  { to: '/analytics',     label: 'Analytics',},
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#171717' }}>
      <aside className="w-60 flex flex-col shrink-0" style={{ backgroundColor: '#0f0f0f' }}>
        <div className="px-5 py-5 border-b border-white/10 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">✈</div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">AeroGround</h1>
            <p className="text-xs text-slate-400">Ops Management</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <p className="text-xs text-slate-300 truncate">{user?.username || 'User'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-sm bg-red-600/80 hover:bg-red-600 text-white py-1.5 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#171717' }}>
        {children}
      </main>
    </div>
  )
}