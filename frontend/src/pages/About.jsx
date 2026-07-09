import { useNavigate } from 'react-router-dom'
import {
  Radar, BrainCircuit, ShieldCheck, Gauge, ScrollText, Users2,
} from 'lucide-react'
import PublicNavbar from '../components/PublicNavbar'
import usePageMeta from '../hooks/usePageMeta'

const pillars = [
  { icon: Radar, title: 'Real-Time', desc: 'Live data across flights, gates, baggage, and staff — updated continuously, not on a refresh cycle.' },
  { icon: BrainCircuit, title: 'AI-Powered', desc: 'Machine learning models forecast delays, recommend gates, and flag maintenance issues before they escalate.' },
  { icon: ShieldCheck, title: 'Secure', desc: 'Role-based access control with JWT authentication and rate-limited login across every endpoint.' },
  { icon: Gauge, title: 'Scalable', desc: 'Built on Django REST Framework to hold up under high-throughput, terminal-wide operations.' },
  { icon: ScrollText, title: 'Fully Audited', desc: 'Every create, update, and delete is written to an audit log — a record of who did what, and when.' },
  { icon: Users2, title: 'One Platform', desc: 'Twenty modules, one console — no more switching between disconnected tools to run a terminal.' },
]

const stack = [
  'Django 5', 'Django REST Framework', 'React 19', 'Vite', 'Tailwind CSS 4',
  'PostgreSQL', 'scikit-learn', 'SimpleJWT', 'Swagger / ReDoc', 'GitHub Actions',
]

export default function About() {
  usePageMeta('About', 'What AeroGround is, how it is built, and why it exists.')
  const navigate = useNavigate()

  return (
    <div style={{ backgroundColor: '#171717', minHeight: '100vh', color: '#f0ede8' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=IM+Fell+English:ital@0;1&family=Rajdhani:wght@500;600;700&display=swap');

        .ab-page{position:relative;overflow:hidden;}
        .ab-aurora{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;}
        .ab-blob{position:absolute;border-radius:50%;filter:blur(150px);opacity:.05;}
        .ab-b1{width:640px;height:640px;background:#d4c9a8;top:-180px;left:-140px;}
        .ab-b2{width:520px;height:520px;background:#4a4a48;bottom:-160px;right:-100px;}

        .ab-hero{position:relative;z-index:1;text-align:center;padding:112px 2rem 8px;}
        .ab-eyebrow{display:inline-flex;align-items:center;gap:10px;padding:6px 18px;border-radius:50px;font-family:'Rajdhani',sans-serif;font-size:.7rem;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#d4c9a8;border:1px solid rgba(212,201,168,0.2);background:rgba(212,201,168,0.06);backdrop-filter:blur(10px);margin-bottom:22px;}
        .ab-eyebrow .dot{width:6px;height:6px;border-radius:50%;background:#3dd68c;box-shadow:0 0 7px #3dd68c;}
        .ab-title{font-family:'Cinzel',serif;font-size:clamp(2.2rem,5vw,3.6rem);font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#f0ede8;line-height:1.05;margin-bottom:14px;}
        .ab-title .it{font-family:'IM Fell English',serif;font-style:italic;font-weight:400;text-transform:none;color:#d4c9a8;}
        .ab-sub{font-family:'IM Fell English',serif;font-style:italic;font-size:1rem;color:#8a8578;max-width:600px;margin:0 auto;line-height:1.8;}

        .ab-mission{position:relative;z-index:1;max-width:820px;margin:56px auto 0;padding:0 2rem;}
        .ab-panel{border-radius:22px;padding:38px 40px;background:rgba(12,12,12,0.55);backdrop-filter:blur(22px) saturate(150%);border:1px solid rgba(255,255,255,0.08);}
        .ab-panel p{font-family:'IM Fell English',serif;font-style:italic;font-size:1.02rem;color:#b0aca2;line-height:1.9;}
        .ab-panel p + p{margin-top:18px;}

        .ab-stack{position:relative;z-index:1;max-width:820px;margin:36px auto 0;padding:0 2rem;text-align:center;}
        .ab-stack-label{font-family:'Rajdhani',sans-serif;font-size:.68rem;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#57544c;margin-bottom:16px;}
        .ab-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:9px;}
        .ab-chip{font-family:'Rajdhani',sans-serif;font-size:.76rem;font-weight:600;letter-spacing:.5px;color:#b0aca2;padding:7px 16px;border-radius:50px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);}

        .ab-grid{position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;max-width:1100px;margin:56px auto 0;padding:0 2rem 6rem;}
        .ab-card{--glow:#d4c9a8;position:relative;border-radius:20px;padding:26px 24px;background:rgba(12,12,12,0.55);backdrop-filter:blur(22px) saturate(150%);border:1px solid rgba(255,255,255,0.08);transition:transform .35s cubic-bezier(.4,0,.2,1),border-color .35s,box-shadow .35s;}
        .ab-card:hover{transform:translateY(-6px);border-color:rgba(255,255,255,0.18);box-shadow:0 22px 55px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,0.04),0 0 36px -12px var(--glow);}
        .ab-icon{width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:var(--glow);margin-bottom:18px;}
        .ab-card h3{font-family:'Cinzel',serif;font-size:1rem;font-weight:700;letter-spacing:.5px;color:#f0ede8;margin-bottom:9px;}
        .ab-card p{font-family:'IM Fell English',serif;font-style:italic;font-size:.86rem;color:#8a8578;line-height:1.68;}

        .ab-cta{position:relative;z-index:1;text-align:center;padding-bottom:6rem;}
        .ab-cta-btn{font-family:'Rajdhani',sans-serif;background:#f0ede8;color:#0a0a0a;border:none;padding:14px 38px;border-radius:50px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;font-size:.85rem;cursor:pointer;transition:transform .2s,box-shadow .2s;}
        .ab-cta-btn:hover{transform:translateY(-3px);box-shadow:0 16px 40px rgba(240,237,232,0.18);}

        @media(max-width:640px){.ab-panel{padding:28px 24px;}.ab-grid{grid-template-columns:1fr;}}
      `}</style>

      <div className="ab-page">
        <div className="ab-aurora">
          <div className="ab-blob ab-b1" />
          <div className="ab-blob ab-b2" />
        </div>

        <PublicNavbar active="about" />

        <div className="ab-hero">
          <div className="ab-eyebrow"><span className="dot" />Built for the Ground Floor</div>
          <h1 className="ab-title">What <span className="it">AeroGround</span> Is</h1>
          <p className="ab-sub">A next-generation Airport Ground Operations Management System — built to run a terminal, not just track one.</p>
        </div>

        <div className="ab-mission">
          <div className="ab-panel">
            <p>AeroGround modernizes how airports run day-to-day ground operations — flight tracking, gate allocation, baggage handling, staff scheduling, maintenance, and more, unified into a single platform instead of a dozen disconnected tools.</p>
            <p>It's built on a Django REST Framework backend with a React frontend, and it integrates machine learning to predict flight delays, recommend optimal gate assignments, and flag maintenance issues before they become critical. Every meaningful action is written to an audit log, so there's always a record of who did what, and when.</p>
          </div>
        </div>

        <div className="ab-stack">
          <div className="ab-stack-label">Built With</div>
          <div className="ab-chips">
            {stack.map((s) => <span className="ab-chip" key={s}>{s}</span>)}
          </div>
        </div>

        <div className="ab-grid">
          {pillars.map((p) => {
            const Icon = p.icon
            return (
              <div className="ab-card" key={p.title}>
                <div className="ab-icon"><Icon size={22} strokeWidth={1.8} /></div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </div>
            )
          })}
        </div>

        <div className="ab-cta">
          <button className="ab-cta-btn" onClick={() => navigate('/login')}>Launch Dashboard</button>
        </div>
      </div>
    </div>
  )
}
