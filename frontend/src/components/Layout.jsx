import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/flights', label: 'Flights' },
  { to: '/gates', label: 'Gates' },
  { to: '/baggage', label: 'Baggage' },
  { to: '/maintenance', label: 'Maintenance' },
  { to: '/staff', label: 'Staff' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/reports', label: 'Reports' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-60 bg-white border-r flex flex-col">
        <div className="px-5 py-5 border-b">
          <h1 className="text-lg font-bold text-blue-600 leading-tight">Airport Ops</h1>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm font-medium ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t">
          <p className="text-xs text-gray-500 px-3 mb-2">
            {user?.username ? `Logged in as ${user.username}` : ''}
          </p>
          <button
            onClick={handleLogout}
            className="w-full text-sm bg-red-500 text-white py-2 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}