import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PlaneTakeoff, DoorOpen, Users, Briefcase, Wrench, AlertTriangle,
  Truck, Package, Timer, Fuel, UtensilsCrossed, Sparkles, Droplets,
  ArrowRightLeft, Boxes, Bell, FileBarChart, Box, BotMessageSquare,
} from 'lucide-react'
import PublicNavbar from '../components/PublicNavbar'
import usePageMeta from '../hooks/usePageMeta'

// Every module actually running in the backend (see backend/settings.py
// INSTALLED_APPS), grouped into categories a visitor can actually scan.
const CATEGORIES = [
  { key: 'all', label: 'All Services' },
  { key: 'flight', label: 'Flight & Gate Ops', color: '#4e8fcc' },
  { key: 'servicing', label: 'Aircraft Servicing', color: '#3bbfb5' },
  { key: 'ground', label: 'Ground & Ramp', color: '#f5a623' },
  { key: 'workforce', label: 'Workforce', color: '#9d78f0' },
  { key: 'intelligence', label: 'Safety & Intelligence', color: '#3dd68c' },
]

const services = [
  { icon: PlaneTakeoff, title: 'Flight Management', cat: 'flight', desc: 'Real-time tracking of every arrival, departure, and gate assignment across all terminals.' },
  { icon: DoorOpen, title: 'Gate Operations', cat: 'flight', desc: 'Automated gate allocation, conflict detection, and live availability monitoring.' },

  { icon: Fuel, title: 'Fuel Management', cat: 'servicing', desc: 'Fuel request, delivery scheduling, and consumption tracking for every aircraft.' },
  { icon: UtensilsCrossed, title: 'Catering Services', cat: 'servicing', desc: 'Meal and onboard supply loading coordinated to each turnaround window.' },
  { icon: Sparkles, title: 'Aircraft Cleaning', cat: 'servicing', desc: 'Cabin cleaning scheduling and completion status for fast, reliable turnarounds.' },
  { icon: Droplets, title: 'Water & Lavatory Service', cat: 'servicing', desc: 'Potable water top-ups and lavatory servicing logged per aircraft, per turn.' },
  { icon: ArrowRightLeft, title: 'Turnaround Coordination', cat: 'servicing', desc: 'Every ground service synced to one shared turnaround clock, gate to gate.' },

  { icon: Truck, title: 'Ground Equipment', cat: 'ground', desc: 'Live fleet tracking for tugs, loaders, and GPU units across the apron.' },
  { icon: Package, title: 'Baggage Handling', cat: 'ground', desc: 'End-to-end baggage tracking from check-in to carousel with live status updates.' },
  { icon: Boxes, title: 'Cargo Management', cat: 'ground', desc: 'Cargo manifest, weight distribution, and loading progress tracking.' },
  { icon: Users, title: 'Passenger Boarding', cat: 'ground', desc: 'Boarding gate flow and live passenger count tracking, zone by zone.' },
  { icon: Timer, title: 'Ramp Operations', cat: 'ground', desc: 'Ramp safety zones and ground vehicle coordination around active aircraft.' },

  { icon: Briefcase, title: 'Staff Management', cat: 'workforce', desc: 'Shift planning, role assignment, and workforce allocation across ground zones.' },
  { icon: Users, title: 'HR Management', cat: 'workforce', desc: 'Personnel records, onboarding, and administration for ground operations staff.' },

  { icon: Wrench, title: 'Maintenance Control', cat: 'intelligence', desc: 'Scheduled and unscheduled maintenance requests managed with priority queues.' },
  { icon: AlertTriangle, title: 'Incident Management', cat: 'intelligence', desc: 'Logging, tracking, and resolution workflow for operational incidents.' },
  { icon: Bell, title: 'Notifications', cat: 'intelligence', desc: 'Real-time alerts pushed across every subsystem the moment something changes.' },
  { icon: FileBarChart, title: 'Reports & Analytics', cat: 'intelligence', desc: 'Operational reporting with exportable summaries across every module.' },
  { icon: Box, title: 'Digital Twin', cat: 'intelligence', desc: 'A live 3D simulation of the airport floor, mirroring operations in real time.' },
  { icon: BotMessageSquare, title: 'AeroGround AI', cat: 'intelligence', desc: 'Predictive chatbot for instant answers on delays, gates, and staffing.' },
]

export default function Services() {
  usePageMeta('Services', 'Every module powering AeroGround, from flight tracking to AI-driven forecasting.')
  const navigate = useNavigate()
  const [active, setActive] = useState('all')

  const filtered = useMemo(
    () => (active === 'all' ? services : services.filter((s) => s.cat === active)),
    [active]
  )

  const colorOf = (cat) => CATEGORIES.find((c) => c.key === cat)?.color || '#d4c9a8'

  return (
    <div style={{ backgroundColor: '#171717', minHeight: '100vh', color: '#f0ede8' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=IM+Fell+English:ital@1&family=Rajdhani:wght@500;600;700&display=swap');

        .svc-page{position:relative;overflow:hidden;}
        .svc-aurora{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;}
        .svc-ab{position:absolute;border-radius:50%;filter:blur(150px);opacity:.05;}
        .svc-ab1{width:600px;height:600px;background:#4a4a48;top:-160px;right:-100px;}
        .svc-ab2{width:520px;height:520px;background:#3dd68c;bottom:-160px;left:-100px;}

        .svc-hero{position:relative;z-index:1;text-align:center;padding:108px 2rem 8px;}
        .svc-eyebrow{display:inline-flex;align-items:center;gap:10px;padding:6px 18px;border-radius:50px;font-family:'Rajdhani',sans-serif;font-size:.7rem;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#d4c9a8;border:1px solid rgba(212,201,168,0.2);background:rgba(212,201,168,0.06);backdrop-filter:blur(10px);margin-bottom:22px;}
        .svc-eyebrow .dot{width:6px;height:6px;border-radius:50%;background:#3dd68c;box-shadow:0 0 7px #3dd68c;}
        .svc-title{font-family:'Cinzel',serif;font-size:clamp(2.2rem,5vw,3.6rem);font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#f0ede8;line-height:1.05;margin-bottom:14px;}
        .svc-title .it{font-family:'IM Fell English',serif;font-style:italic;font-weight:400;text-transform:none;color:#d4c9a8;}
        .svc-sub{font-family:'IM Fell English',serif;font-style:italic;font-size:1rem;color:#8a8578;max-width:560px;margin:0 auto;line-height:1.8;}

        .svc-tabs{position:relative;z-index:1;display:flex;flex-wrap:wrap;justify-content:center;gap:10px;max-width:900px;margin:40px auto 0;padding:0 2rem;}
        .svc-tab{font-family:'Rajdhani',sans-serif;font-size:.76rem;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;padding:9px 18px;border-radius:50px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.03);color:#8a8578;cursor:pointer;transition:all .25s;display:inline-flex;align-items:center;gap:8px;}
        .svc-tab .swatch{width:7px;height:7px;border-radius:50%;}
        .svc-tab:hover{color:#f0ede8;border-color:rgba(255,255,255,0.22);}
        .svc-tab.on{background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.28);color:#f0ede8;}

        .svc-count{position:relative;z-index:1;text-align:center;font-family:'Rajdhani',sans-serif;font-size:.72rem;letter-spacing:1.5px;text-transform:uppercase;color:#57544c;margin-top:20px;}

        .svc-grid{position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:20px;max-width:1180px;margin:24px auto 0;padding:0 2rem 6rem;}

        .svc-card{--glow:#d4c9a8;position:relative;border-radius:20px;padding:26px 24px;background:rgba(12,12,12,0.55);backdrop-filter:blur(22px) saturate(150%);border:1px solid rgba(255,255,255,0.08);transition:transform .35s cubic-bezier(.4,0,.2,1),border-color .35s,box-shadow .35s;}
        .svc-card:hover{transform:translateY(-6px);border-color:rgba(255,255,255,0.18);box-shadow:0 22px 55px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,0.04),0 0 36px -12px var(--glow);}
        .svc-icon{width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:var(--glow);margin-bottom:18px;}
        .svc-card h3{font-family:'Cinzel',serif;font-size:1rem;font-weight:700;letter-spacing:.5px;color:#f0ede8;margin-bottom:9px;}
        .svc-card p{font-family:'IM Fell English',serif;font-style:italic;font-size:.86rem;color:#8a8578;line-height:1.68;}
        .svc-tag{display:inline-block;margin-top:14px;font-family:'Rajdhani',sans-serif;font-size:.62rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--glow);}

        .svc-cta{position:relative;z-index:1;text-align:center;padding-bottom:6rem;}
        .svc-cta-btn{font-family:'Rajdhani',sans-serif;background:#f0ede8;color:#0a0a0a;border:none;padding:14px 38px;border-radius:50px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;font-size:.85rem;cursor:pointer;transition:transform .2s,box-shadow .2s;}
        .svc-cta-btn:hover{transform:translateY(-3px);box-shadow:0 16px 40px rgba(240,237,232,0.18);}

        @media(max-width:640px){.svc-grid{grid-template-columns:1fr;}}
      `}</style>

      <div className="svc-page">
        <div className="svc-aurora">
          <div className="svc-ab svc-ab1" />
          <div className="svc-ab svc-ab2" />
        </div>

        <PublicNavbar active="services" />

        <div className="svc-hero">
          <div className="svc-eyebrow"><span className="dot" />20 Modules · One Console</div>
          <h1 className="svc-title">Every System <span className="it">Running</span> the Floor</h1>
          <p className="svc-sub">From the first gate assignment to the last bag on the carousel — every service AeroGround coordinates, in one place.</p>
        </div>

        <div className="svc-tabs">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={`svc-tab${active === c.key ? ' on' : ''}`}
              onClick={() => setActive(c.key)}
            >
              {c.color && <span className="swatch" style={{ background: c.color }} />}
              {c.label}
            </button>
          ))}
        </div>

        <div className="svc-count">{filtered.length} service{filtered.length !== 1 ? 's' : ''}</div>

        <div className="svc-grid">
          {filtered.map((s) => {
            const Icon = s.icon
            const glow = colorOf(s.cat)
            return (
              <div className="svc-card" key={s.title} style={{ '--glow': glow }}>
                <div className="svc-icon"><Icon size={22} strokeWidth={1.8} /></div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <span className="svc-tag">{CATEGORIES.find((c) => c.key === s.cat)?.label}</span>
              </div>
            )
          })}
        </div>

        <div className="svc-cta">
          <button className="svc-cta-btn" onClick={() => navigate('/login')}>Launch Dashboard</button>
        </div>
      </div>
    </div>
  )
}
