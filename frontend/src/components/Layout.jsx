import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, PlaneTakeoff, DoorOpen, Package, Wrench,
  Settings2, Users, Bell, BarChart3, Sparkles, LineChart, LogOut, Radar, Flame, HeartPulse,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { canAccessPage } from '../utils/roleAccess'
import AmbientBackground from './AmbientBackground'
import Topbar from './Topbar'

const navItems = [
  { to: '/dashboard',     label: 'Dashboard',    page: 'dashboard',     icon: LayoutDashboard },
  { to: '/flights',       label: 'Flights',      page: 'flights',       icon: PlaneTakeoff },
  { to: '/gates',         label: 'Gates',        page: 'gates',         icon: DoorOpen },
  { to: '/baggage',       label: 'Baggage',      page: 'baggage',       icon: Package },
  { to: '/maintenance',   label: 'Maintenance',  page: 'maintenance',   icon: Wrench },
  { to: '/equipment',     label: 'Equipment',    page: 'equipment',     icon: Settings2 },
  { to: '/staff',         label: 'Staff',        page: 'staff',         icon: Users },
  { to: '/notifications', label: 'Notifications',page: 'notifications', icon: Bell },
  { to: '/reports',       label: 'Reports',      page: 'reports',       icon: BarChart3 },
  { to: '/chatbot',       label: 'AeroGround AI', page: 'chatbot',      icon: Sparkles },
  { to: '/analytics',     label: 'Analytics',    page: 'analytics',     icon: LineChart },
  { to: '/digital-twin', label: 'Digital Twin', page: 'digital-twin', icon: Radar },
  { to: '/heat-map', label: 'Heat Map', page: 'heat-map', icon: Flame },
  { to: '/equipment-health', label: 'Equipment Health', page: 'equipment-health', icon: HeartPulse },
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
    <div className="min-h-screen relative flex">
      <AmbientBackground />

      <aside className="relative z-10 w-64 h-screen shrink-0 sticky top-0 p-3">
        <div className="glass h-full rounded-[32px] flex flex-col overflow-hidden">
          <div className="px-4 py-5 flex items-center gap-3 shrink-0">
            <div className="w-11! h-11! !rounded-[26px] glass bg-white!/90 dark:bg-white!/95 flex items-center justify-center shrink-0 p-1.5 overflow-hidden">
              <img src="/brand/aeroground-logo.png" alt="AeroGround" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-neutral-900 dark:text-white leading-tight tracking-tight">AeroGround</h1>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Ops Management</p>
            </div>
          </div>

          <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3 py-2.5 rounded-[26px] text-sm font-medium transition-all duration-300 overflow-hidden ${
                      isActive
                        ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-600/30 before:content-[\'\'] before:absolute before:inset-0 before:bg-[radial-gradient(120%_80%_at_20%_-10%,rgba(255,255,255,0.45),transparent_55%)]'
                        : 'text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={17} strokeWidth={2} className={isActive ? 'text-white' : 'text-neutral-400 dark:text-neutral-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors'} />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              )
            })}
          </nav>

          <div className="px-3 pb-3 pt-2 shrink-0">
            <div className="glass rounded-[22px] p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8! h-8! rounded-xl! icon-chip icon-chip-indigo shrink-0">
                  <span className="text-xs font-bold">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">{user?.username || 'User'}</p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-500 truncate">{user?.role || 'Member'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-1.5 text-sm font-medium bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 py-2 rounded-xl transition-colors border border-red-500/20"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="relative z-10 flex-1 overflow-y-auto">
        <Topbar />
        {children}
      </main>
    </div>
  )
}
