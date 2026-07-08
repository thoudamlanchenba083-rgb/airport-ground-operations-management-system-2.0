import { Link } from 'react-router-dom'
import {
  Sparkles, TrendingUp, Cloud, Wrench, Users, User, DoorOpen, Gauge,
  ArrowRight, Database, ShieldCheck, Timer, MessageSquare, Boxes,
} from 'lucide-react'
import usePageMeta from '../hooks/usePageMeta'

const CAPABILITIES = [
  {
    icon: TrendingUp,
    chip: 'icon-chip-blue',
    title: 'Delay Forecast',
    model: 'RandomForestRegressor + Classifier',
    summary: 'Estimates how many minutes a flight is likely to run late and whether it crosses into high-risk territory.',
    signals: ['Departure hour & day of week', 'Gate congestion at that hour', 'Aircraft age', 'Crew-readiness %', 'Prior flight delay carried over'],
  },
  {
    icon: Cloud,
    chip: 'icon-chip-sky',
    title: 'Weather Alerts',
    model: 'RandomForestRegressor + Classifier',
    summary: 'Scores weather-driven delay risk per flight, pulling live conditions where available.',
    signals: ['Live OpenWeatherMap feed at origin (5s timeout)', 'Visibility, wind speed, precipitation', 'Temperature & humidity', 'Falls back to a simulated estimate if the live call fails or times out'],
  },
  {
    icon: Wrench,
    chip: 'icon-chip-rose',
    title: 'Maintenance Alerts',
    model: 'RandomForestRegressor + Classifier',
    summary: 'Flags aircraft likely to need attention soon, ranked by urgency.',
    signals: ['Flight hours & cycles since last service', 'Aircraft age', 'Faults reported in the last 30 days', 'Component wear index'],
  },
  {
    icon: Users,
    chip: 'icon-chip-violet',
    title: 'Passenger Rush Prediction',
    model: 'RandomForestRegressor',
    summary: 'Predicts expected passenger volume and recommends how many check-in counters to open.',
    signals: ['Departure hour & day of week', 'Aircraft capacity', 'Domestic vs. international (from the flight record)', 'Holiday season'],
  },
  {
    icon: User,
    chip: 'icon-chip-blue',
    title: 'Staff Shortage Forecast',
    model: '3× RandomForestRegressor (ground / security / baggage)',
    summary: 'Forecasts ground crew, security, and baggage-handling demand across upcoming flights and compares it against real staff counts and current assignments.',
    signals: ['Aircraft capacity', 'Domestic vs. international', 'Rush factor', 'Baggage volume (kg)'],
  },
  {
    icon: Gauge,
    chip: 'icon-chip-emerald',
    title: 'Resource Forecast',
    model: 'Real-time DB supply + equipment-failure model',
    summary: 'Tracks gate utilization against peak-hour demand, and flags ground equipment predicted to need maintenance soon so it isn\u2019t counted as available.',
    signals: ['Peak concurrent gate demand by hour', 'Equipment days since last service', 'Usage count over the last 30 days', 'Prior damage flag'],
  },
  {
    icon: DoorOpen,
    chip: 'icon-chip-indigo',
    title: 'Gate Recommendation',
    model: 'RandomForestRegressor',
    summary: 'Ranks available gates for a flight and suggests the best fit plus two alternatives.',
    signals: ['Recent gate utilization (real, from assignment history)', 'Terminal match', 'Domestic vs. international', 'Aircraft size fit'],
  },
  {
    icon: MessageSquare,
    chip: 'icon-chip-amber',
    title: 'AeroGround AI Assistant',
    model: 'Rule-based + flight-schedule lookup',
    summary: 'Answers questions against an uploaded flight-schedule spreadsheet, cached until the file changes.',
    signals: ['Uploaded Excel/CSV schedule (admin only)', 'Modified-time based cache refresh'],
  },
]

const PRINCIPLES = [
  {
    icon: Database,
    title: 'Real data first',
    body: 'Every model reaches for real database fields before anything else \u2014 aircraft capacity, flight type, gate assignment history, equipment maintenance logs. Where telemetry genuinely doesn\u2019t exist yet (like live cabin sensors), a deterministic per-flight placeholder stands in \u2014 the same flight always produces the same placeholder value, so results stay consistent between refreshes.',
  },
  {
    icon: Timer,
    title: 'Built for a live dashboard',
    body: 'Forecasts are capped to a rolling sample of upcoming flights and cached briefly, so the dashboard stays fast even as prediction volume grows.',
  },
  {
    icon: ShieldCheck,
    title: 'Confidence, not certainty',
    body: 'Every prediction carries a confidence score from the model itself. Treat the numbers as a ranked signal for where to look first, not a guarantee.',
  },
  {
    icon: Boxes,
    title: 'One shared flight window',
    body: 'Delay, Weather, Passenger Rush, Staff Shortage, and Resource Forecast all reason over the same upcoming-flight sample, so the panels never disagree about which flights they\u2019re describing.',
  },
]

function Pill({ children }) {
  return (
    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/5 text-neutral-600 dark:text-neutral-300 border border-black/5 dark:border-white/10">
      {children}
    </span>
  )
}

export default function AeroGroundAIIntro() {
  usePageMeta('Introduction to AeroGround AI', 'What each AeroGround AI forecast does, and the real data behind it.')

  return (
    <div className="p-6 space-y-8 max-w-[1200px] mx-auto">
      {/* Hero */}
      <div className="glass-hero rounded-3xl p-8 sm:p-10">
        <div className="relative flex items-start gap-4">
          <div className="icon-chip icon-chip-blue w-14! h-14! rounded-2xl! shrink-0">
            <Sparkles size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase text-blue-600 dark:text-blue-400 mb-1">AeroGround AI</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white leading-tight">
              Eight forecasts, one shared picture of the next few hours of ground ops.
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-3 max-w-2xl">
              AeroGround AI is a set of trained RandomForest models sitting on top of your real flight, gate, staff,
              and equipment data. Instead of just showing what's happening right now, it forecasts demand a few
              hours ahead, then compares that forecast to what's actually available \u2014 so a shortage shows up
              before it happens, not after.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Pill>8 forecasts</Pill>
              <Pill>Trained RandomForest models</Pill>
              <Pill>Live weather integration</Pill>
              <Pill>Shared 6h flight window</Pill>
            </div>
          </div>
        </div>
      </div>

      {/* Capabilities grid */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">What each panel is doing</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
          The exact same forecasts that power the AI Intelligence section on your{' '}
          <Link to="/dashboard" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">Dashboard</Link>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CAPABILITIES.map((c) => {
            const Icon = c.icon
            return (
              <div key={c.title} className="glass rounded-[26px] p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className={`icon-chip ${c.chip} w-10! h-10! rounded-xl!`}>
                    <Icon size={18} strokeWidth={2.1} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-neutral-900 dark:text-white text-sm truncate">{c.title}</h3>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">{c.model}</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">{c.summary}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {c.signals.map((s) => (
                    <span key={s} className="text-[10.5px] px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-neutral-500 dark:text-neutral-400 border border-black/5 dark:border-white/5">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Principles */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">How it's designed to behave</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PRINCIPLES.map((p) => {
            const Icon = p.icon
            return (
              <div key={p.title} className="glass rounded-[26px] p-5 flex gap-3">
                <div className="icon-chip icon-chip-indigo w-10! h-10! rounded-xl! shrink-0">
                  <Icon size={17} />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white text-sm mb-1">{p.title}</h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">{p.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* CTA back to dashboard / chatbot */}
      <div className="glass rounded-[26px] p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-neutral-900 dark:text-white text-sm">See it live</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Head back to the dashboard, or ask the assistant a question directly.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/chatbot"
            className="glass glass-interactive flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 px-4 py-2.5 rounded-xl"
          >
            <MessageSquare size={16} /> Ask the assistant
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all"
          >
            Back to Dashboard <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  )
}
