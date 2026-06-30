import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const profiles = [
  { img: '/images/team/backend.jpg', name: 'Thoudam Lanchenba', role: 'Backend Developer', bio: 'Develops the Django backend, creates REST APIs, implements authentication and authorization, configures URL routing.' },
  { img: '/images/team/frontend.jpg', name: 'Lakshya', role: 'Frontend Developer', bio: 'Develops responsive web pages using HTML, CSS, and JavaScript, implements the UI and integrates with backend APIs.' },
  { img: '/images/team/database.jpg', name: 'Kowshika', role: 'Database Developer', bio: 'Designs and manages the database, creates Django models, performs migrations, and maintains table relationships.' },
  { img: '/images/team/uiux.jpg', name: 'Shreepriyan', role: 'UI/UX Designer', bio: 'Designs the user interface, improves experience, creates responsive layouts, and maintains consistent visual design.' },
  { img: '/images/team/qa.jpg', name: 'Naren', role: 'QA Engineer', bio: 'Tests REST APIs using Postman, verifies requests and responses, validates functionality, and reports bugs.' },
]

const slides = [
  { icon: '✈️', title: 'Flight Tracking', desc: 'Live schedules, status updates, and AI-powered delay predictions across every flight in your network.', chip: 'Real-Time' },
  { icon: '🧳', title: 'Baggage Handling', desc: 'End-to-end baggage tracking from check-in to claim, with full status history and exception alerts.', chip: 'Full Lifecycle' },
  { icon: '🚪', title: 'Gate Management', desc: 'Real-time gate availability, dynamic reassignment, and occupancy tracking across every terminal.', chip: 'Live Status' },
  { icon: '👷', title: 'Staff Scheduling', desc: 'Coordinate ground crew, security, and maintenance teams with conflict-free shift management.', chip: 'Role-Based' },
  { icon: '🔧', title: 'Maintenance Logs', desc: 'Track aircraft maintenance requests from report to resolution with full audit trails and DGCA compliance.', chip: 'Audit Ready' },
  { icon: '📋', title: 'Operational Reports', desc: 'Exportable insights across flights, gates, baggage, and staff with custom date range filtering.', chip: 'Exportable' },
]

const capabilities = [
  { num: '01', icon: '📡', title: 'Real-Time Sync', desc: 'Live data from flight APIs, baggage scanners, and gate sensors updates every 30 seconds across all operator dashboards.', tag: '30-sec refresh' },
  { num: '02', icon: '🔐', title: 'Role-Based Access', desc: 'Four distinct access tiers — Admin, Manager, Staff, and Technician — with granular module permissions and audit trails.', tag: '4 Access Tiers' },
  { num: '03', icon: '🤖', title: 'AI Predictions', desc: 'Machine learning models flag delay risks 40 minutes in advance, allowing pre-emptive gate reassignment and passenger rebooking.', tag: 'AI-Powered' },
  { num: '04', icon: '🔔', title: 'Smart Alerts', desc: 'Priority-ranked notifications delivered to the right operator the instant a conflict, delay, or exception is detected.', tag: 'Instant Delivery' },
  { num: '05', icon: '📊', title: 'Exportable Reports', desc: 'Custom date-range reports across all modules — flights, gates, baggage, and staff — in PDF and Excel formats.', tag: 'Multi-Format' },
  { num: '06', icon: '🛡️', title: 'Compliance Ready', desc: 'Full audit trails, DGCA-compliant maintenance records, and ISO 27001 data handling standards built into every module.', tag: 'ISO 27001' },
]

const alerts = [
  { priority: 'med', icon: '⚠️', iconBg: 'rgba(245,166,35,0.1)', type: 'Gate Conflict · Medium Priority', msg: 'Gate B7 reassignment required — aircraft 9W-314 swap with IndiGo 6E-504', time: '2 minutes ago · Assigned to Ops Manager' },
  { priority: 'high', icon: '🔧', iconBg: 'rgba(242,112,112,0.1)', type: 'Maintenance · High Priority', msg: 'VT-ANM brake inspection overdue — aircraft grounded pending clearance from Tech Ops', time: '11 minutes ago · Escalated to Chief Technician' },
  { priority: 'low', icon: '✅', iconBg: 'rgba(61,214,140,0.1)', type: 'Baggage · Resolved', msg: 'Carousel 3 exception cleared — all 14 flagged items reunited with passengers at claim', time: '18 minutes ago · Auto-resolved by system' },
  { priority: 'info', icon: 'ℹ️', iconBg: 'rgba(78,143,204,0.1)', type: 'Staff Ops · Informational', msg: 'Shift handover complete — Zone D crew transferred to Zone A to support boarding surge on SG-109', time: '26 minutes ago · Logged by Duty Manager' },
  { priority: 'med', icon: '🕐', iconBg: 'rgba(245,166,35,0.1)', type: 'Flight Delay · Medium Priority', msg: 'SG-109 MAA→CCU delayed 12 minutes due to late inbound connection from BOM sector', time: '31 minutes ago · Passenger notifications sent' },
  { priority: 'low', icon: '🎯', iconBg: 'rgba(61,214,140,0.1)', type: 'System · Informational', msg: 'Scheduled data sync with AOCC completed — all 47 active flights reconciled successfully', time: '45 minutes ago · Automated system process' },
]

const tlData = [
  { step: 'Step 01', title: 'Login & Role Assignment', desc: 'Staff authenticate and are assigned their operational role — Admin, Manager, Staff, or Technician — with tailored module access and dashboard views configured automatically.' },
  { step: 'Step 02', title: 'Real-Time Data Sync', desc: 'The system pulls live data from flight APIs, baggage scanners, and gate sensors every 30 seconds, surfacing the most current operational picture across all terminals.' },
  { step: 'Step 03', title: 'Assign & Dispatch', desc: 'Duty managers assign gates, schedule staff shifts, and log maintenance requests — all from a single consolidated operational view without switching between systems.' },
  { step: 'Step 04', title: 'Monitor & Alert', desc: 'The built-in notification engine alerts the right operator the instant a delay, gate conflict, baggage exception, or maintenance flag is raised anywhere in the system.' },
  { step: 'Step 05', title: 'Report & Optimise', desc: 'After each operational cycle, exportable reports surface performance patterns, recurring bottlenecks, and efficiency metrics to drive continuous improvement.' },
]

const tickerData = [
  { label: 'AI-202 DEL→BOM', color: '#4e8fcc', val: 'Boarding · B4' },
  { label: '6E-411 BLR→HYD', color: '#3dd68c', val: 'On Time · A12' },
  { label: 'SG-109 MAA→CCU', color: '#f5a623', val: 'Delayed +12m · C7' },
  { label: 'UK-803 BOM→GOI', color: '#9d78f0', val: 'Departed · D2' },
  { label: '9W-314 DEL→MAA', color: '#3dd68c', val: 'On Time · E6' },
  { label: 'System Uptime', color: '#3dd68c', val: '99.98%' },
  { label: 'Gates Active', color: '#4e8fcc', val: '42 / 45' },
  { label: 'Baggage Tracked', color: '#d4c9a8', val: '3,247 pcs' },
  { label: 'Staff On Shift', color: '#d4c9a8', val: '120 crew' },
  { label: 'Incidents 24h', color: '#3dd68c', val: '0 critical' },
]

function Counter({ target, suffix = '' }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        let v = 0
        const step = target / 60
        const id = setInterval(() => {
          v = Math.min(v + step, target)
          setVal(Number.isInteger(target) ? Math.floor(v) : v.toFixed(1))
          if (v >= target) clearInterval(id)
        }, 18)
      }
    }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target])
  return <span ref={ref}>{val}{suffix}</span>
}

function Reveal({ children, style, className = '' }) {
  const ref = useRef(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true) }, { threshold: 0.1 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className={className} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(32px)',
      transition: 'opacity .75s cubic-bezier(.4,0,.2,1), transform .75s cubic-bezier(.4,0,.2,1)',
      ...style,
    }}>
      {children}
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobOpen, setMobOpen] = useState(false)
  const [curSlide, setCurSlide] = useState(0)
  const [activePopup, setActivePopup] = useState(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 55)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setCurSlide(c => (c + 1) % slides.length), 5000)
    return () => clearInterval(id)
  }, [])

  const goSlide = (n) => setCurSlide(((n % slides.length) + slides.length) % slides.length)

  const priorityBorder = { high: '#f27070', med: '#f5a623', low: '#3dd68c', info: '#4e8fcc' }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Cinzel:wght@400;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Rajdhani:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap');
        :root {
          --bg:#040404;--carb:#0e0e0e;--surf:rgba(255,255,255,0.03);
          --glass:rgba(6,6,6,0.78);--border:rgba(255,255,255,0.07);--border-hi:rgba(255,255,255,0.15);
          --accent:#d4c9a8;--accent2:#c8b882;--blue:#4e8fcc;--teal:#3bbfb5;
          --green:#3dd68c;--amber:#f5a623;--red:#f27070;--violet:#9d78f0;
          --text-main:#b0aca2;--muted:#3e3e3a;--subtle:#6a6a62;--white:#f0ede8;
          --px:clamp(22px,5.5vw,96px);
          --font-display:'Cinzel',serif;--font-body:'IM Fell English',serif;
          --font-ui:'Space Grotesk',sans-serif;--font-data:'Rajdhani',sans-serif;
          --r:10px;--r-lg:20px;--r-xl:28px;
        }
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        html{scroll-behavior:smooth;}
        body{font-family:var(--font-body);background:var(--bg);color:var(--text-main);overflow-x:hidden;line-height:1.7;-webkit-font-smoothing:antialiased;}
        a{text-decoration:none;color:inherit;}
        body::before{content:'';position:fixed;inset:0;background-image:radial-gradient(rgba(255,255,255,0.018) 1px,transparent 1px);background-size:30px 30px;z-index:0;pointer-events:none;}
        @keyframes abF{0%,100%{transform:translate(0,0) scale(1);}33%{transform:translate(40px,-30px) scale(1.07);}66%{transform:translate(-25px,22px) scale(.93);}}
        @keyframes planeBob{0%,100%{transform:rotate(0deg) translateY(0);}50%{transform:rotate(6deg) translateY(-4px);}}
        @keyframes blink{0%,100%{opacity:1;}50%{opacity:.15;}}
        @keyframes panelDrift{0%,100%{transform:scale(1.05) translateY(0);}50%{transform:scale(1.08) translateY(-18px);}}
        @keyframes scanDown{0%{top:-2px;opacity:0;}5%{opacity:1;}95%{opacity:.6;}100%{top:100%;opacity:0;}}
        @keyframes fbF{0%,100%{transform:translateY(0);}50%{transform:translateY(-10px);}}
        @keyframes rowIn{from{opacity:0;transform:translateX(12px);}to{opacity:1;transform:none;}}
        @keyframes tickerScroll{0%{transform:translateX(0);}100%{transform:translateX(-50%);}}
        @keyframes fillGrow{from{width:0;}to{width:var(--pct,75%);}}
        @keyframes hubP{0%,100%{box-shadow:0 0 30px rgba(255,255,255,0.05);}50%{box-shadow:0 0 70px rgba(255,255,255,0.10);}}
        @keyframes sP{0%{box-shadow:0 0 0 0 rgba(61,214,140,0.5);}70%{box-shadow:0 0 0 8px rgba(61,214,140,0);}100%{box-shadow:0 0 0 0 rgba(61,214,140,0);}}
        .land-page{position:relative;min-height:100vh;}
        .aurora{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;}
        .ab{position:absolute;border-radius:50%;filter:blur(160px);opacity:.038;animation:abF 24s ease-in-out infinite;}
        .ab1{width:800px;height:800px;background:#d4c9a8;top:-220px;left:-180px;}
        .ab2{width:560px;height:560px;background:#4e8fcc;top:35%;right:-150px;animation-delay:-9s;}
        .ab3{width:460px;height:460px;background:#3bbfb5;bottom:-80px;left:40%;animation-delay:-18s;}
        .ab4{width:320px;height:320px;background:#9d78f0;bottom:30%;left:20%;animation-delay:-6s;}
        .nav-wrap{position:fixed;top:0;left:0;right:0;z-index:1000;height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 var(--px);background:rgba(4,4,4,0.45);backdrop-filter:blur(32px) saturate(160%);border-bottom:1px solid rgba(255,255,255,0.04);transition:all .35s;}
        .nav-wrap.scrolled{background:rgba(4,4,4,0.97);border-color:rgba(255,255,255,0.09);box-shadow:0 2px 60px rgba(0,0,0,.95);}
        .nav-brand{display:flex;align-items:center;gap:12px;font-family:var(--font-display);font-size:.85rem;font-weight:700;letter-spacing:2px;color:var(--white);text-transform:uppercase;}
        .nav-icon{width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05));border:1px solid rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:1.1rem;animation:planeBob 3.5s ease-in-out infinite;}
        .nav-links{display:flex;align-items:center;gap:32px;}
        .nav-links a{font-family:var(--font-data);font-size:.82rem;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--subtle);transition:color .2s;position:relative;}
        .nav-links a::after{content:'';position:absolute;bottom:-4px;left:0;right:0;height:1px;background:var(--accent);border-radius:2px;transform:scaleX(0);transition:transform .25s;}
        .nav-links a:hover,.nav-links a.active{color:var(--white);}
        .nav-links a:hover::after,.nav-links a.active::after{transform:scaleX(1);}
        .btn-nav{padding:9px 24px;border-radius:50px;background:rgba(255,255,255,0.09);border:1px solid rgba(255,255,255,0.18);color:var(--white);font-family:var(--font-data);font-size:.78rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;transition:all .2s;cursor:pointer;}
        .btn-nav:hover{background:rgba(255,255,255,0.16);transform:translateY(-2px);}
        .hamburger{display:none;background:none;border:1px solid var(--border);color:var(--text-main);padding:8px 11px;border-radius:9px;font-size:1.1rem;cursor:pointer;}
        .mob-nav{display:none;position:fixed;top:78px;left:12px;right:12px;z-index:999;flex-direction:column;gap:4px;padding:14px;background:rgba(10,10,10,.98);backdrop-filter:blur(28px);border:1px solid var(--border);border-radius:var(--r-lg);}
        .mob-nav.open{display:flex;}
        .mob-nav a,.mob-nav button{padding:12px 15px;border-radius:var(--r);font-family:var(--font-data);font-size:.82rem;letter-spacing:1.2px;text-transform:uppercase;color:var(--subtle);transition:all .2s;background:none;border:none;cursor:pointer;text-align:left;}
        .mob-nav a:hover,.mob-nav button:hover{background:var(--surf);color:var(--white);}
        .hero-banner{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;overflow:hidden;}
        .banner-img-strip{position:absolute;inset:0;z-index:0;display:grid;grid-template-columns:1fr 1fr 1fr;}
        .banner-panel{position:relative;overflow:hidden;}
        .banner-panel img{width:100%;height:100%;object-fit:cover;filter:grayscale(.15) contrast(1.1) brightness(.5) saturate(.8);transform:scale(1.05);animation:panelDrift 18s ease-in-out infinite;display:block;}
        .banner-panel:nth-child(2) img{animation-delay:-6s;animation-direction:reverse;}
        .banner-panel:nth-child(3) img{animation-delay:-12s;}
        .banner-overlay{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(4,4,4,0.55) 0%,rgba(4,4,4,0.2) 28%,rgba(4,4,4,0.5) 65%,rgba(4,4,4,0.98) 100%),linear-gradient(90deg,rgba(4,4,4,0.82) 0%,rgba(4,4,4,0.2) 55%,rgba(4,4,4,0.45) 100%);}
        .scan-line{position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(212,201,168,0.18),transparent);z-index:2;animation:scanDown 14s linear infinite;}
        .hero-content{position:relative;z-index:3;flex:1;display:flex;align-items:center;padding:130px var(--px) 80px;}
        .hero-left{max-width:680px;}
        .hero-eyebrow{display:inline-flex;align-items:center;gap:10px;padding:6px 18px;border-radius:50px;font-family:var(--font-data);font-size:.68rem;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:var(--accent);border:1px solid rgba(212,201,168,0.2);background:rgba(212,201,168,0.06);backdrop-filter:blur(10px);margin-bottom:28px;}
        .live-dot{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 7px var(--green);animation:blink 1.8s ease-in-out infinite;flex-shrink:0;}
        .hero-title{font-family:var(--font-display);font-size:clamp(2.4rem,7vw,6.8rem);font-weight:700;line-height:.9;color:var(--white);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;}
        .line-sub{display:block;font-family:'IM Fell English',serif;font-style:italic;font-size:clamp(1rem,2.4vw,2.1rem);font-weight:400;letter-spacing:4px;text-transform:none;color:var(--accent);margin-top:6px;}
        .outline-word{-webkit-text-stroke:1px rgba(255,255,255,0.22);color:transparent;}
        .hero-rule{width:80px;height:1px;background:linear-gradient(90deg,var(--accent),transparent);margin:22px 0;}
        .hero-desc{font-family:var(--font-body);font-size:1rem;color:var(--subtle);line-height:1.85;max-width:500px;margin-bottom:36px;font-style:italic;}
        .hero-desc strong{color:var(--accent);font-style:normal;}
        .hero-actions{display:flex;gap:14px;flex-wrap:wrap;}
        .btn-primary{display:inline-flex;align-items:center;gap:9px;padding:14px 32px;border-radius:50px;background:var(--white);color:#0a0a0a;font-family:var(--font-data);font-size:.82rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;transition:transform .2s,box-shadow .2s;border:none;cursor:pointer;}
        .btn-primary:hover{transform:translateY(-3px);box-shadow:0 16px 40px rgba(240,237,232,0.22);}
        .btn-outline{display:inline-flex;align-items:center;gap:9px;padding:13px 32px;border-radius:50px;background:transparent;border:1px solid rgba(255,255,255,0.16);color:var(--text-main);font-family:var(--font-data);font-size:.82rem;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;transition:all .2s;cursor:pointer;}
        .btn-outline:hover{border-color:rgba(255,255,255,0.32);background:rgba(255,255,255,0.05);transform:translateY(-3px);}
        .hero-board{position:absolute;right:var(--px);top:50%;transform:translateY(-50%);z-index:4;width:300px;}
        .glass-card{background:rgba(6,6,6,0.82);backdrop-filter:blur(42px) saturate(165%);border:1px solid var(--border);border-top:1px solid var(--border-hi);border-radius:var(--r-xl);position:relative;overflow:hidden;box-shadow:0 36px 90px rgba(0,0,0,0.6);}
        .board-inner{padding:22px;}
        .board-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
        .board-title{font-family:var(--font-display);font-size:.78rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--white);}
        .live-badge{display:flex;align-items:center;gap:5px;font-family:var(--font-data);font-size:.65rem;font-weight:700;letter-spacing:1px;color:var(--green);}
        .live-badge span{width:5px;height:5px;border-radius:50%;background:var(--green);animation:blink 2s ease-in-out infinite;}
        .flight-list{display:flex;flex-direction:column;gap:6px;}
        .f-row{display:grid;grid-template-columns:52px 1fr auto auto;gap:8px;align-items:center;padding:8px 11px;border-radius:9px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);}
        .f-code{font-family:var(--font-display);font-size:.72rem;font-weight:700;color:var(--accent2);}
        .f-route{font-family:var(--font-data);font-size:.7rem;color:var(--muted);}
        .f-gate{font-family:var(--font-data);font-size:.66rem;color:var(--text-main);background:rgba(255,255,255,0.07);padding:2px 7px;border-radius:4px;}
        .status{font-family:var(--font-data);font-size:.63rem;font-weight:700;letter-spacing:.4px;padding:2px 8px;border-radius:50px;}
        .s-b{background:rgba(78,143,204,.15);color:#7eb8e8;}
        .s-o{background:rgba(61,214,140,.14);color:var(--green);}
        .s-d{background:rgba(245,166,35,.13);color:var(--amber);}
        .s-x{background:rgba(157,120,240,.13);color:var(--violet);}
        .mini-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:12px;}
        .mk{padding:10px 8px;border-radius:9px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);text-align:center;}
        .mk-v{font-family:var(--font-display);font-size:1.15rem;font-weight:700;color:var(--accent);display:block;}
        .mk-l{font-family:var(--font-data);font-size:.58rem;letter-spacing:.5px;color:var(--muted);margin-top:2px;text-transform:uppercase;}
        .ticker{position:relative;z-index:2;background:rgba(10,10,10,0.92);border-top:1px solid rgba(255,255,255,0.06);border-bottom:1px solid rgba(255,255,255,0.06);padding:10px 0;overflow:hidden;}
        .ticker-inner{display:flex;gap:0;animation:tickerScroll 40s linear infinite;width:max-content;}
        .ticker-item{display:flex;align-items:center;gap:8px;padding:0 28px;white-space:nowrap;font-family:var(--font-data);font-size:.72rem;font-weight:600;letter-spacing:1.2px;color:var(--subtle);text-transform:uppercase;border-right:1px solid rgba(255,255,255,0.05);}
        .ticker-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
        .ticker-val{color:var(--accent);}
        .ticker::before,.ticker::after{content:'';position:absolute;top:0;bottom:0;z-index:2;width:80px;pointer-events:none;}
        .ticker::before{left:0;background:linear-gradient(90deg,rgba(10,10,10,0.92),transparent);}
        .ticker::after{right:0;background:linear-gradient(-90deg,rgba(10,10,10,0.92),transparent);}
        .stats-bar{position:relative;z-index:1;padding:52px var(--px);background:rgba(8,8,8,0.5);border-bottom:1px solid var(--border);}
        .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;}
        .stat-card{padding:28px 22px;border-radius:var(--r-lg);background:rgba(255,255,255,0.022);border:1px solid var(--border);text-align:center;cursor:default;transition:all .35s;position:relative;overflow:hidden;}
        .stat-card:hover{border-color:rgba(255,255,255,0.14);background:rgba(255,255,255,0.04);transform:translateY(-5px);}
        .stat-num{font-family:var(--font-display);font-size:2.8rem;font-weight:700;display:block;background:linear-gradient(135deg,var(--white),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px;letter-spacing:1px;}
        .stat-lbl{font-family:var(--font-data);color:var(--muted);font-size:.75rem;letter-spacing:1.5px;text-transform:uppercase;}
        .stat-icon{font-size:1.4rem;margin-bottom:10px;display:block;}
        .section{position:relative;z-index:1;padding:96px var(--px);}
        .sec-label{font-family:var(--font-data);font-size:.68rem;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--subtle);margin-bottom:14px;display:flex;align-items:center;gap:12px;}
        .sec-label::after{content:'';width:32px;height:1px;background:rgba(255,255,255,0.18);}
        .sec-title{font-family:var(--font-display);font-size:clamp(1.8rem,3.5vw,3rem);font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--white);line-height:1.1;margin-bottom:12px;}
        .sec-title .italic{font-family:'IM Fell English',serif;font-style:italic;font-weight:400;text-transform:none;letter-spacing:1px;color:var(--accent);}
        .sec-sub{font-family:var(--font-body);font-size:.95rem;color:var(--subtle);line-height:1.8;max-width:520px;font-style:italic;}
        .slider-wrap{position:relative;height:380px;perspective:1200px;margin-top:52px;}
        .slide-card{position:absolute;width:300px;height:330px;left:50%;top:50%;transform:translateX(-50%) translateY(-50%);padding:32px 26px;border-radius:var(--r-xl);background:rgba(14,14,14,0.8);border:1px solid var(--border);backdrop-filter:blur(30px);cursor:pointer;transition:all .55s cubic-bezier(.4,0,.2,1);}
        .slide-card.active{background:rgba(28,28,28,0.9);border-color:rgba(255,255,255,0.18);box-shadow:0 28px 72px rgba(0,0,0,.75);}
        .slide-icon{width:52px;height:52px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:20px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);}
        .slide-card h3{font-family:var(--font-display);font-size:.95rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--white);margin-bottom:10px;}
        .slide-card p{font-family:var(--font-body);font-size:.85rem;color:var(--subtle);line-height:1.7;font-style:italic;}
        .slide-chip{display:inline-block;margin-top:16px;font-family:var(--font-data);font-size:.63rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:4px 11px;border-radius:50px;background:rgba(255,255,255,0.05);color:var(--accent);border:1px solid rgba(255,255,255,0.10);}
        .slider-controls{display:flex;justify-content:center;align-items:center;gap:18px;margin-top:28px;}
        .slider-btn{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.05);border:1px solid var(--border);color:var(--text-main);font-size:.9rem;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;}
        .slider-btn:hover{background:rgba(255,255,255,0.10);border-color:rgba(255,255,255,0.24);color:var(--white);}
        .dots{display:flex;gap:8px;}
        .dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.14);cursor:pointer;transition:all .3s;border:none;}
        .dot.active{background:var(--accent);box-shadow:0 0 8px rgba(212,201,168,0.4);width:22px;border-radius:4px;}
        .metrics-section{position:relative;z-index:1;padding:96px var(--px);background:rgba(4,4,4,0.7);border-top:1px solid var(--border);}
        .metrics-grid{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:20px;margin-top:52px;}
        .metric-big{grid-row:span 2;padding:32px;border-radius:var(--r-xl);background:rgba(14,14,14,0.75);border:1px solid var(--border);position:relative;overflow:hidden;}
        .metric-sm{padding:26px 24px;border-radius:var(--r-lg);background:rgba(14,14,14,0.75);border:1px solid var(--border);transition:all .3s;}
        .metric-sm:hover{border-color:rgba(255,255,255,0.14);transform:translateY(-4px);}
        .metric-label{font-family:var(--font-data);font-size:.68rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;}
        .metric-value{font-family:var(--font-display);font-size:2.6rem;font-weight:700;color:var(--white);letter-spacing:1px;line-height:1;}
        .metric-value span{font-family:var(--font-body);font-size:1rem;color:var(--accent);font-style:italic;}
        .metric-desc{font-family:var(--font-body);font-size:.8rem;color:var(--muted);line-height:1.7;margin-top:14px;font-style:italic;}
        .metric-bar{height:3px;border-radius:2px;background:rgba(255,255,255,0.06);margin-top:14px;overflow:hidden;}
        .metric-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--accent),var(--accent2));animation:fillGrow 2s ease 0.5s both;}
        .flight-bars{display:flex;flex-direction:column;gap:11px;margin-top:20px;}
        .fbar{display:flex;align-items:center;gap:12px;}
        .fbar-label{font-family:var(--font-data);font-size:.68rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--subtle);width:70px;flex-shrink:0;}
        .fbar-track{flex:1;height:5px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;}
        .fbar-fill{height:100%;border-radius:3px;animation:fillGrow 1.8s ease .6s both;}
        .fbar-val{font-family:var(--font-display);font-size:.82rem;color:var(--accent);width:32px;text-align:right;flex-shrink:0;}
        .capability-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:52px;}
        .cap-card{padding:28px 26px;border-radius:var(--r-lg);background:rgba(14,14,14,0.72);border:1px solid var(--border);position:relative;overflow:hidden;transition:all .35s;cursor:default;}
        .cap-card:hover{border-color:rgba(255,255,255,0.16);transform:translateY(-5px);box-shadow:0 18px 48px rgba(0,0,0,.55);}
        .cap-num{font-family:var(--font-display);font-size:3.5rem;font-weight:700;color:rgba(255,255,255,0.04);position:absolute;top:14px;right:18px;letter-spacing:2px;line-height:1;}
        .cap-icon{font-size:1.6rem;margin-bottom:18px;}
        .cap-title{font-family:var(--font-display);font-size:.85rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--white);margin-bottom:10px;}
        .cap-desc{font-family:var(--font-body);font-size:.83rem;color:var(--muted);line-height:1.72;font-style:italic;}
        .cap-tag{display:inline-flex;align-items:center;gap:5px;margin-top:14px;font-family:var(--font-data);font-size:.62rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:3px 10px;border-radius:50px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:var(--accent);}
        .alerts-section{position:relative;z-index:1;padding:96px var(--px);}
        .alerts-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:52px;}
        .alert-card{padding:22px 24px;border-radius:var(--r-lg);background:rgba(14,14,14,0.7);border:1px solid var(--border);display:flex;gap:15px;align-items:flex-start;transition:all .3s;cursor:default;}
        .alert-card:hover{border-color:rgba(255,255,255,0.15);transform:translateX(4px);}
        .alert-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.15rem;flex-shrink:0;border:1px solid rgba(255,255,255,0.08);}
        .alert-type{font-family:var(--font-data);font-size:.64rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:4px;}
        .alert-msg{font-family:var(--font-body);font-size:.87rem;color:var(--white);margin-bottom:4px;font-style:italic;}
        .alert-time{font-family:var(--font-data);font-size:.64rem;color:var(--muted);letter-spacing:.5px;}
        .profile-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-top:52px;}
        .profile-card{border-radius:var(--r-lg);overflow:hidden;cursor:pointer;background:rgba(14,14,14,0.72);border:1px solid var(--border);backdrop-filter:blur(24px);transition:all .35s;}
        .profile-card:hover{transform:translateY(-8px);border-color:rgba(255,255,255,0.18);box-shadow:0 24px 60px rgba(0,0,0,.75);}
        .profile-avatar{height:165px;overflow:hidden;border-bottom:1px solid var(--border);position:relative;}
        .profile-avatar img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block;transition:transform .5s;}
        .profile-card:hover .profile-avatar img{transform:scale(1.06);}
        .profile-body{padding:18px 18px 22px;}
        .profile-name{font-family:var(--font-display);font-size:.85rem;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--white);margin-bottom:4px;}
        .profile-role{font-family:var(--font-data);font-size:.7rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent);margin-bottom:10px;}
        .profile-bio{font-family:var(--font-body);font-size:.75rem;color:var(--muted);line-height:1.6;font-style:italic;}
        .timeline{position:relative;max-width:840px;margin:56px auto 0;}
        .timeline::before{content:'';position:absolute;left:50%;top:0;bottom:0;width:1px;background:linear-gradient(to bottom,transparent,rgba(255,255,255,0.12) 8%,rgba(255,255,255,0.12) 92%,transparent);transform:translateX(-50%);}
        .tl-item{display:flex;gap:36px;margin-bottom:52px;align-items:flex-start;}
        .tl-item:nth-child(even){flex-direction:row-reverse;}
        .tl-content{flex:1;padding:22px 24px;border-radius:var(--r-lg);background:rgba(14,14,14,0.7);border:1px solid var(--border);backdrop-filter:blur(22px);transition:border-color .3s;}
        .tl-content:hover{border-color:rgba(255,255,255,0.18);}
        .tl-dot{flex-shrink:0;width:14px;height:14px;border-radius:50%;background:var(--white);box-shadow:0 0 0 5px rgba(255,255,255,0.1);margin-top:24px;position:relative;z-index:2;}
        .tl-step{font-family:var(--font-data);font-size:.65rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--accent);margin-bottom:7px;}
        .tl-content h3{font-family:var(--font-display);font-size:.92rem;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--white);margin-bottom:8px;}
        .tl-content p{font-family:var(--font-body);font-size:.82rem;color:var(--muted);line-height:1.72;font-style:italic;}
        .cta-section{position:relative;z-index:1;padding:100px var(--px);text-align:center;background:var(--carb);overflow:hidden;}
        .cta-eyebrow{font-family:var(--font-data);font-size:.68rem;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--subtle);margin-bottom:20px;}
        .cta-title{font-family:var(--font-display);font-size:clamp(2rem,5vw,4rem);font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--white);line-height:1;margin-bottom:10px;}
        .cta-title .it{font-family:'IM Fell English',serif;font-style:italic;font-weight:400;text-transform:none;color:var(--accent);letter-spacing:1px;}
        .cta-sub{font-family:var(--font-body);font-size:.95rem;color:var(--subtle);margin-bottom:38px;font-style:italic;max-width:480px;margin-left:auto;margin-right:auto;line-height:1.8;}
        .cta-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;}
        footer{position:relative;z-index:1;background:var(--bg);border-top:1px solid var(--border);padding:0 var(--px);}
        .footer-status{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;padding:18px 0;border-bottom:1px solid var(--border);}
        .status-left{display:flex;align-items:center;gap:20px;flex-wrap:wrap;}
        .status-ind{display:flex;align-items:center;gap:7px;font-family:var(--font-data);font-size:.7rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--green);}
        .status-ind .pulse{width:6px;height:6px;border-radius:50%;background:var(--green);animation:sP 2.2s infinite;}
        .sdiv{width:1px;height:14px;background:var(--border);}
        .stxt{font-family:var(--font-data);font-size:.68rem;color:var(--muted);letter-spacing:.5px;}
        .footer-grid{display:grid;grid-template-columns:2.2fr 1fr 1fr 1.5fr;gap:46px;padding:50px 0 44px;border-bottom:1px solid var(--border);}
        .foot-brand-name{font-family:var(--font-display);font-size:.9rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--white);display:flex;align-items:center;gap:10px;margin-bottom:14px;}
        .foot-brand>p{font-family:var(--font-body);font-size:.82rem;color:var(--muted);line-height:1.8;max-width:290px;margin-bottom:22px;font-style:italic;}
        .foot-socials{display:flex;gap:8px;margin-bottom:18px;}
        .social-btn{width:33px;height:33px;border-radius:9px;background:rgba(255,255,255,0.04);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:.8rem;color:var(--muted);cursor:pointer;transition:all .2s;}
        .social-btn:hover{background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.2);color:var(--white);transform:translateY(-3px);}
        .foot-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:50px;font-family:var(--font-data);font-size:.62rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:rgba(61,214,140,0.06);border:1px solid rgba(61,214,140,0.18);color:var(--green);}
        .foot-col h4{font-family:var(--font-display);color:var(--white);font-size:.68rem;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:18px;padding-bottom:10px;border-bottom:1px solid var(--border);}
        .foot-col a{display:flex;align-items:center;gap:6px;color:var(--muted);font-family:var(--font-data);font-size:.78rem;letter-spacing:.5px;padding:5px 0;transition:all .2s;}
        .foot-col a:hover{color:var(--white);}
        .foot-contact h4{font-family:var(--font-display);color:var(--white);font-size:.68rem;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:18px;padding-bottom:10px;border-bottom:1px solid var(--border);}
        .contact-list{display:flex;flex-direction:column;gap:9px;}
        .contact-item{display:flex;align-items:flex-start;gap:11px;padding:11px 13px;border-radius:var(--r);background:rgba(255,255,255,0.022);border:1px solid var(--border);cursor:default;}
        .ci-icon{width:29px;height:29px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.82rem;flex-shrink:0;background:rgba(255,255,255,0.04);border:1px solid var(--border);}
        .ci-label{font-family:var(--font-data);font-size:.58rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);}
        .ci-value{font-family:var(--font-data);font-size:.78rem;color:var(--text-main);font-weight:600;}
        .footer-bottom{display:flex;justify-content:space-between;align-items:center;padding:18px 0;font-family:var(--font-data);font-size:.68rem;letter-spacing:.5px;color:var(--muted);flex-wrap:wrap;gap:12px;}
        .footer-bottom-links{display:flex;gap:20px;}
        .footer-bottom-links a{color:var(--muted);transition:color .2s;}
        .footer-bottom-links a:hover{color:var(--white);}
        .deco-rule{display:flex;align-items:center;gap:14px;margin:0 auto 52px;max-width:200px;}
        .deco-rule::before,.deco-rule::after{content:'';flex:1;height:1px;background:rgba(255,255,255,0.08);}
        .deco-rule span{font-size:.8rem;color:var(--muted);}
        @media(max-width:1199px){.profile-grid{grid-template-columns:repeat(3,1fr);}.footer-grid{grid-template-columns:1.5fr 1fr 1fr;gap:28px;}.foot-contact{grid-column:1/-1;}.hero-board{display:none;}.metrics-grid{grid-template-columns:1fr 1fr;}.metric-big{grid-row:span 1;}}
        @media(max-width:959px){.stats-grid{grid-template-columns:repeat(2,1fr);}.profile-grid{grid-template-columns:repeat(2,1fr);}.footer-grid{grid-template-columns:1fr 1fr;}.capability-grid{grid-template-columns:repeat(2,1fr);}.alerts-grid{grid-template-columns:1fr;}.banner-img-strip{grid-template-columns:1fr;}}
        @media(max-width:767px){.nav-links{display:none;}.hamburger{display:flex;align-items:center;justify-content:center;}.section,.cta-section,.metrics-section,.alerts-section{padding:68px var(--px);}.stats-bar{padding:38px var(--px);}.footer-grid{grid-template-columns:1fr 1fr;}.profile-grid{grid-template-columns:repeat(2,1fr);}.capability-grid{grid-template-columns:1fr;}}
        @media(max-width:599px){.hero-content{padding-top:108px;padding-bottom:64px;}.hero-actions{flex-direction:column;}.stats-grid{grid-template-columns:1fr 1fr;}.profile-grid{grid-template-columns:1fr;}.cta-btns{flex-direction:column;align-items:center;}.footer-grid{grid-template-columns:1fr;}.tl-item,.tl-item:nth-child(even){flex-direction:column;padding-left:38px;position:relative;}.tl-dot{position:absolute;left:8px;}}
      `}</style>

      <div className="land-page">
        {/* Aurora */}
        <div className="aurora">
          <div className="ab ab1" /><div className="ab ab2" />
          <div className="ab ab3" /><div className="ab ab4" />
        </div>

        {/* NAV */}
        <nav className={`nav-wrap${scrolled ? ' scrolled' : ''}`}>
          <div className="nav-brand">
            <div className="nav-icon">✈</div>Airport Ops
          </div>
          <div className="nav-links">
            <a href="#" className="active">Home</a>
            <a href="#services">Services</a>
            <a href="#about">About</a>
            <a href="#team">Team</a>
            <button className="btn-nav" onClick={() => navigate('/login')}>Launch →</button>
          </div>
          <button className="hamburger" onClick={() => setMobOpen(o => !o)}>☰</button>
        </nav>
        <div className={`mob-nav${mobOpen ? ' open' : ''}`}>
          <a href="#">Home</a>
          <a href="#services">Services</a>
          <a href="#about">About</a>
          <a href="#team">Team</a>
          <button onClick={() => navigate('/login')}>Launch Dashboard →</button>
        </div>

        {/* HERO */}
        <section className="hero-banner">
          <div className="banner-img-strip" aria-hidden="true">
            <div className="banner-panel"><img src="/images/landing/cards/card-runway-fog.jpg" alt="" /></div>
            <div className="banner-panel"><img src="/images/landing/cards/card-jet-contrail.jpg" alt="" /></div>
            <div className="banner-panel"><img src="/images/landing/cards/card-bw-reflection.jpg" alt="" /></div>
          </div>
          <div className="banner-overlay" />
          <div className="scan-line" />

          {/* Live board */}
          <div className="hero-board">
            <div className="glass-card board-inner">
              <div className="board-hdr">
                <span className="board-title">Live Flight Board</span>
                <span className="live-badge"><span />Live</span>
              </div>
              <div className="flight-list">
                <div className="f-row"><span className="f-code">AI-202</span><span className="f-route">DEL → BOM</span><span className="f-gate">B4</span><span className="status s-b">Boarding</span></div>
                <div className="f-row"><span className="f-code">6E-411</span><span className="f-route">BLR → HYD</span><span className="f-gate">A12</span><span className="status s-o">On Time</span></div>
                <div className="f-row"><span className="f-code">SG-109</span><span className="f-route">MAA → CCU</span><span className="f-gate">C7</span><span className="status s-d">Delayed 12m</span></div>
                <div className="f-row"><span className="f-code">UK-803</span><span className="f-route">BOM → GOI</span><span className="f-gate">D2</span><span className="status s-x">Departed</span></div>
                <div className="f-row"><span className="f-code">9W-314</span><span className="f-route">DEL → MAA</span><span className="f-gate">E6</span><span className="status s-o">On Time</span></div>
              </div>
              <div className="mini-kpis">
                <div className="mk"><span className="mk-v">47</span><div className="mk-l">Flights</div></div>
                <div className="mk"><span className="mk-v">3</span><div className="mk-l">Delayed</div></div>
                <div className="mk"><span className="mk-v">12</span><div className="mk-l">Boarding</div></div>
              </div>
            </div>
          </div>

          <div className="hero-content">
            <div className="hero-left">
              <Reveal><div className="hero-eyebrow"><span className="live-dot" />Ground Operations Platform · Est. 2026</div></Reveal>
              <Reveal style={{ transitionDelay: '.1s' }}>
                <h1 className="hero-title">
                  Airport<br /><span className="outline-word">Ground</span><br />Operations
                  <span className="line-sub">& Management System</span>
                </h1>
              </Reveal>
              <Reveal style={{ transitionDelay: '.2s' }}><div className="hero-rule" /></Reveal>
              <Reveal style={{ transitionDelay: '.25s' }}>
                <p className="hero-desc">A unified command platform giving every operator <strong>total situational awareness</strong> — flights, baggage, gates, staff, and maintenance coordinated from a single interface, in real time.</p>
              </Reveal>
              <Reveal style={{ transitionDelay: '.35s' }}>
                <div className="hero-actions">
                  <button className="btn-primary" onClick={() => navigate('/login')}>→ Launch Dashboard</button>
                  <a href="#services" className="btn-outline">⚡ Explore Features</a>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* TICKER */}
        <div className="ticker" aria-hidden="true">
          <div className="ticker-inner">
            {[...tickerData, ...tickerData].map((d, i) => (
              <div key={i} className="ticker-item">
                <span className="ticker-dot" style={{ background: d.color, boxShadow: `0 0 5px ${d.color}` }} />
                {d.label} <span className="ticker-val">{d.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* STATS */}
        <div className="stats-bar">
          <div className="stats-grid">
            {[
              { icon: '✈', target: 500, suffix: '+', lbl: 'Flights Managed Daily' },
              { icon: '👷', target: 120, suffix: '+', lbl: 'Ground Staff Coordinated' },
              { icon: '🚪', target: 45, suffix: '', lbl: 'Live Gates Tracked' },
              { icon: '⚡', target: 99.9, suffix: '%', lbl: 'System Uptime' },
            ].map((s, i) => (
              <Reveal key={i} style={{ transitionDelay: `${i * .1}s` }}>
                <div className="stat-card">
                  <span className="stat-icon">{s.icon}</span>
                  <span className="stat-num"><Counter target={s.target} suffix={s.suffix} /></span>
                  <div className="stat-lbl">{s.lbl}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* PLATFORM MODULES / SLIDER */}
        <section className="section" id="services">
          <div style={{ maxWidth: 640 }}>
            <Reveal><div className="sec-label">Platform Modules</div></Reveal>
            <Reveal><h2 className="sec-title">Every Tool Ground<br /><span className="italic">Operations Demands</span></h2></Reveal>
            <Reveal><p className="sec-sub">Tap arrows to explore each operational module powering your airport's command centre.</p></Reveal>
          </div>
          <div className="slider-wrap">
            {slides.map((s, i) => {
              const total = slides.length
              const offset = ((i - curSlide + total) % total)
              const rel = offset <= total / 2 ? offset : offset - total
              const abs = Math.abs(rel)
              return (
                <div key={i} className={`slide-card${i === curSlide ? ' active' : ''}`}
                  style={{ transform: `translateX(calc(-50% + ${rel * 54}%)) translateY(-50%) scale(${1 - abs * .13}) rotateY(${rel * -8}deg)`, zIndex: 10 - abs, opacity: abs > 2 ? 0 : 1 - abs * .28 }}
                  onClick={() => goSlide(i)}>
                  <div className="slide-icon">{s.icon}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                  <span className="slide-chip">{s.chip}</span>
                </div>
              )
            })}
          </div>
          <div className="slider-controls">
            <button className="slider-btn" onClick={() => goSlide(curSlide - 1)}>←</button>
            <div className="dots">{slides.map((_, i) => <button key={i} className={`dot${i === curSlide ? ' active' : ''}`} onClick={() => goSlide(i)} />)}</div>
            <button className="slider-btn" onClick={() => goSlide(curSlide + 1)}>→</button>
          </div>
        </section>

        {/* METRICS */}
        <section className="metrics-section">
          <div style={{ maxWidth: 640 }}>
            <Reveal><div className="sec-label">Live Metrics</div></Reveal>
            <Reveal><h2 className="sec-title">Operational <span className="italic">Intelligence</span><br />At a Glance</h2></Reveal>
            <Reveal><p className="sec-sub">Real-time data streams update every 30 seconds across all monitored systems and zones.</p></Reveal>
          </div>
          <Reveal style={{ transitionDelay: '.2s' }}>
            <div className="metrics-grid">
              <div className="metric-big">
                <div className="metric-label">Today's Flight Status</div>
                <div className="metric-value">47 <span>active</span></div>
                <p className="metric-desc">Covering all domestic and international departures and arrivals routed through our terminal control system.</p>
                <div className="flight-bars">
                  {[
                    { label: 'On Time', pct: '83%', bg: 'linear-gradient(90deg,#3dd68c,#3bbfb5)', val: '83%' },
                    { label: 'Boarding', pct: '26%', bg: 'linear-gradient(90deg,#4e8fcc,#4ecdc4)', val: '26%' },
                    { label: 'Delayed', pct: '6%', bg: 'linear-gradient(90deg,#f5a623,#f27070)', val: '6%' },
                    { label: 'Departed', pct: '38%', bg: 'linear-gradient(90deg,#9d78f0,#4e8fcc)', val: '38%' },
                  ].map((b, i) => (
                    <div key={i} className="fbar">
                      <span className="fbar-label">{b.label}</span>
                      <div className="fbar-track"><div className="fbar-fill" style={{ '--pct': b.pct, background: b.bg }} /></div>
                      <span className="fbar-val">{b.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              {[
                { label: 'Baggage Handled', val: '3,247', pct: '94%', desc: 'Items tracked across 8 active conveyor systems. Zero reported losses today.' },
                { label: 'Staff On Shift', val: '120', pct: '80%', desc: 'Distributed across 6 operational zones including tarmac, gates, and terminal.' },
                { label: 'Maintenance Orders', val: '4 open', pct: '25%', desc: '1 critical, 3 routine. 14 cleared since yesterday\'s morning shift handover.' },
                { label: 'Gate Utilization', val: '93%', pct: '93%', desc: '42 of 45 gates currently allocated. 12 active boarding, 6 on standby.' },
              ].map((m, i) => (
                <div key={i} className="metric-sm">
                  <div className="metric-label">{m.label}</div>
                  <div className="metric-value">{m.val}</div>
                  <div className="metric-bar"><div className="metric-fill" style={{ '--pct': m.pct }} /></div>
                  <p className="metric-desc" style={{ marginTop: 10 }}>{m.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* CAPABILITIES */}
        <section className="section" id="about">
          <div style={{ maxWidth: 640 }}>
            <Reveal><div className="sec-label">Core Capabilities</div></Reveal>
            <Reveal><h2 className="sec-title">Built for the <span className="italic">Demands</span><br />of Modern Aviation</h2></Reveal>
            <Reveal><p className="sec-sub">Six foundational pillars underpinning every operational decision your airport makes each day.</p></Reveal>
          </div>
          <div className="capability-grid">
            {capabilities.map((c, i) => (
              <Reveal key={i} style={{ transitionDelay: `${i * .05}s` }}>
                <div className="cap-card">
                  <span className="cap-num">{c.num}</span>
                  <div className="cap-icon">{c.icon}</div>
                  <div className="cap-title">{c.title}</div>
                  <p className="cap-desc">{c.desc}</p>
                  <span className="cap-tag">{c.tag}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ALERTS */}
        <section className="alerts-section">
          <div style={{ maxWidth: 640, marginBottom: 0 }}>
            <Reveal><div className="sec-label">System Alerts</div></Reveal>
            <Reveal><h2 className="sec-title">Live <span className="italic">Incident</span> Feed</h2></Reveal>
            <Reveal><p className="sec-sub">Prioritised alerts from across all operational domains. All times in IST.</p></Reveal>
          </div>
          <div className="alerts-grid">
            {alerts.map((a, i) => (
              <Reveal key={i} style={{ transitionDelay: `${i * .05}s` }}>
                <div className="alert-card" style={{ borderLeft: `2px solid ${priorityBorder[a.priority]}` }}>
                  <div className="alert-icon" style={{ background: a.iconBg }}>{a.icon}</div>
                  <div>
                    <div className="alert-type">{a.type}</div>
                    <div className="alert-msg">{a.msg}</div>
                    <div className="alert-time">{a.time}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* TEAM */}
        <section className="section" id="team" style={{ paddingTop: 0 }}>
          <div style={{ maxWidth: 640 }}>
            <Reveal><div className="sec-label">Development Team</div></Reveal>
            <Reveal><h2 className="sec-title">The Minds Behind<br /><span className="italic">This System</span></h2></Reveal>
            <Reveal><p className="sec-sub">Meet the engineers, designers, and testers who built Airport Ops from the ground up.</p></Reveal>
          </div>
          <div className="profile-grid">
            {profiles.map((p, i) => (
              <Reveal key={i} style={{ transitionDelay: `${i * .08}s` }}>
                <div className="profile-card">
                  <div className="profile-avatar"><img src={p.img} alt={p.name} loading="lazy" /></div>
                  <div className="profile-body">
                    <div className="profile-name">{p.name}</div>
                    <div className="profile-role">{p.role}</div>
                    <div className="profile-bio">{p.bio}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* TIMELINE */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div className="deco-rule"><span>✦</span></div>
            <Reveal><div className="sec-label" style={{ justifyContent: 'center' }}>Workflow</div></Reveal>
            <Reveal><h2 className="sec-title">From Login<br /><span className="italic">to Lift-off</span></h2></Reveal>
            <Reveal><p className="sec-sub" style={{ margin: '0 auto' }}>How Airport Ops turns raw operational data into coordinated, decisive ground action.</p></Reveal>
          </div>
          <div className="timeline">
            {tlData.map((t, i) => (
              <Reveal key={i}>
                <div className={`tl-item`}>
                  <div className="tl-content"><div className="tl-step">{t.step}</div><h3>{t.title}</h3><p>{t.desc}</p></div>
                  <div className="tl-dot" />
                  <div style={{ flex: 1 }} />
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section">
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Reveal><div className="cta-eyebrow">Command Your Airport</div></Reveal>
            <Reveal><h2 className="cta-title">Take Control of<br /><span className="it">Every Operation.</span></h2></Reveal>
            <Reveal><p className="cta-sub">Log in to your Airport Ops dashboard and orchestrate every moving part of your ground operations — in real time, from one unified command centre.</p></Reveal>
            <Reveal>
              <div className="cta-btns">
                <button className="btn-primary" onClick={() => navigate('/login')}>→ Launch Dashboard</button>
                <button className="btn-outline" onClick={() => navigate('/login')}>Create Account</button>
              </div>
            </Reveal>
          </div>
        </section>

        {/* FOOTER */}
        <footer>
          <div className="footer-status">
            <div className="status-left">
              <div className="status-ind"><span className="pulse" />All Systems Operational</div>
              <span className="sdiv" /><span className="stxt">Last checked: just now · Uptime 99.98%</span>
              <span className="sdiv" /><span className="stxt">47 flights active · 3 delayed · 12 boarding</span>
            </div>
            <span className="stxt">Version 2.0 · Live</span>
          </div>
          <div className="footer-grid">
            <div className="foot-brand">
              <div className="foot-brand-name"><span>✈</span>Airport Ops</div>
              <p>A complete ground operations management platform for modern airports — built for reliability, real-time visibility, and total operational control.</p>
              <div className="foot-socials">
                <span className="social-btn">⌥</span><span className="social-btn">in</span>
                <span className="social-btn">𝕏</span><span className="social-btn">▶</span>
              </div>
              <div className="foot-badge"><span>●</span>ISO 27001 Certified · DGCA Compliant</div>
            </div>
            <div className="foot-col">
              <h4>Company</h4>
              <a href="#about">About Us</a><a href="#services">Services</a><a href="#team">Team</a>
            </div>
            <div className="foot-col">
              <h4>Platform</h4>
              <a href="#" onClick={e => { e.preventDefault(); navigate('/login') }}>Login</a>
              <a href="#services">Features</a>
            </div>
            <div className="foot-contact">
              <h4>Contact Us</h4>
              <div className="contact-list">
                <div className="contact-item"><div className="ci-icon">📧</div><div><div className="ci-label">Email</div><div className="ci-value">ops@airportops.in</div></div></div>
                <div className="contact-item"><div className="ci-icon">📞</div><div><div className="ci-label">Phone</div><div className="ci-value">+91 44 2233 4455</div></div></div>
                <div className="contact-item"><div className="ci-icon">📍</div><div><div className="ci-label">Address</div><div className="ci-value">Chennai International Airport, TN – 600027</div></div></div>
                <div className="contact-item"><div className="ci-icon">🕐</div><div><div className="ci-label">Operations</div><div className="ci-value">24 / 7 / 365</div></div></div>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Airport Ground Operations Management System. All rights reserved.</span>
            <div className="footer-bottom-links"><a href="#">Privacy Policy</a><a href="#">Terms of Use</a></div>
          </div>
        </footer>
      </div>
    </>
  )
}