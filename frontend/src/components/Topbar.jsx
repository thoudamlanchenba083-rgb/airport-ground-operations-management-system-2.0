import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Sparkles, Sun, Moon, ChevronRight } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

// Human-readable titles for the breadcrumb, keyed by the first path segment.
const PAGE_TITLES = {
  dashboard: 'Dashboard',
  flights: 'Flights',
  gates: 'Gates',
  baggage: 'Baggage',
  maintenance: 'Maintenance',
  equipment: 'Equipment',
  staff: 'Staff',
  notifications: 'Notifications',
  reports: 'Reports',
  chatbot: 'AeroGround AI Assistant',
  analytics: 'Analytics',
  'ai-intro': 'Introduction to AeroGround AI',
}

export default function Topbar() {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000 * 30)
    return () => clearInterval(tick)
  }, [])

  const segment = location.pathname.replace(/^\//, '').split('/')[0]
  const title = PAGE_TITLES[segment] || 'Overview'

  return (
    <div className="sticky top-0 z-30 glass-topbar px-6 py-3.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 min-w-0 text-sm">
        <span className="text-neutral-400 dark:text-neutral-500 font-medium">AeroGround</span>
        <ChevronRight size={14} className="text-neutral-300 dark:text-neutral-600 shrink-0" />
        <span className="font-semibold text-neutral-900 dark:text-white truncate">{title}</span>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <span className="hidden md:inline text-xs font-medium text-neutral-500 dark:text-neutral-400 tabular-nums">
          {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          {'  ·  '}
          {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>

        <Link
          to="/ai-intro"
          className="glass glass-interactive flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl text-blue-700 dark:text-blue-300 border-blue-500/25"
        >
          <Sparkles size={14} className="text-blue-500" />
          Introduction to AeroGround AI
        </Link>

        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="glass glass-interactive flex items-center justify-center w-9 h-9 rounded-xl text-neutral-600 dark:text-neutral-300"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </div>
  )
}
