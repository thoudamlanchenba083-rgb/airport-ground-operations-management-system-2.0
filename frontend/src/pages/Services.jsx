import { useNavigate } from "react-router-dom"
import PublicNavbar from "../components/PublicNavbar"

const services = [
  {
    num: "01",
    tag: "Flight Operations",
    title: "Flight Management",
    desc: "Real-time tracking of every arrival and departure across every terminal, with delay forecasting and gate assignment resolved automatically the moment a schedule changes.",
    features: [
      "Live status for every scheduled, boarding, and departed flight",
      "Automatic gate + runway conflict detection",
      "AI delay-risk forecasting per route and time window",
    ],
    stat: { value: "47", label: "flights tracked today" },
  },
  {
    num: "02",
    tag: "Terminal Coordination",
    title: "Gate Operations",
    desc: "Gate allocation that adapts as the day changes shape — assigning, releasing, and re-assigning gates the instant a flight is delayed, diverted, or moved up.",
    features: [
      "Automated allocation with real-time conflict resolution",
      "Live occupancy across every terminal zone",
      "Turnaround-time tracking per gate and aircraft type",
    ],
    stat: { value: "93%", label: "average gate utilization" },
  },
  {
    num: "03",
    tag: "Cargo & Logistics",
    title: "Baggage Handling",
    desc: "Every bag is followed from check-in counter to carousel, across every conveyor system and handoff point, with exceptions flagged before a passenger ever notices.",
    features: [
      "End-to-end tracking from check-in to arrival belt",
      "Live conveyor and sorting system status",
      "Automatic mishandling and delay alerts",
    ],
    stat: { value: "3,247", label: "bags handled daily" },
  },
  {
    num: "04",
    tag: "Asset Reliability",
    title: "Maintenance Control",
    desc: "Scheduled and unscheduled maintenance requests routed by priority, with technicians dispatched and equipment status visible from a single control view.",
    features: [
      "Priority-based request queue with SLA tracking",
      "Scheduled + unscheduled work order management",
      "Equipment health and failure-risk forecasting",
    ],
    stat: { value: "4", label: "open work orders" },
  },
  {
    num: "05",
    tag: "Workforce Planning",
    title: "Staff Management",
    desc: "Shift planning and role assignment across every operational zone — tarmac, gates, baggage, maintenance — with coverage gaps surfaced before a shift starts, not after.",
    features: [
      "Role-based shift planning across 6 operational zones",
      "Live workforce allocation and coverage tracking",
      "Staff shortage forecasting ahead of peak windows",
    ],
    stat: { value: "120", label: "crew on shift" },
  },
  {
    num: "06",
    tag: "Intelligence Layer",
    title: "AeroGround AI",
    desc: "A natural-language assistant trained on your live operational data — ask about a flight, a gate, a delay, or a staffing gap and get an answer sourced straight from the platform.",
    features: [
      "Conversational queries across flights, gates, and staffing",
      "Delay, weather, and passenger-rush forecasting models",
      "Dashboard intelligence refreshed every 30 seconds",
    ],
    stat: { value: "99.98%", label: "system uptime" },
  },
]

const highlights = [
  { value: "6", label: "Operational Domains", sub: "Flights, gates, baggage, maintenance, staff, AI" },
  { value: "24 / 7", label: "Live Coordination", sub: "No gaps between shifts, terminals, or time zones" },
  { value: "30s", label: "Data Refresh Cycle", sub: "Every dashboard stays current, automatically" },
  { value: "1", label: "Unified Interface", sub: "One login, every ground operations domain" },
]

export default function Services() {
  const navigate = useNavigate()
  return (
    <div className="svc-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Cinzel:wght@400;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Rajdhani:wght@500;600;700&display=swap');

        .svc-page{
          --bg:#171717;--carb:#1c1c1c;
          --border:rgba(255,255,255,0.07);--border-hi:rgba(255,255,255,0.15);
          --accent:#d4c9a8;--accent2:#c8b882;
          --text-main:#b0aca2;--muted:#3e3e3a;--subtle:#6a6a62;--white:#f0ede8;
          --px:clamp(22px,5.5vw,96px);
          --font-display:'Cinzel',serif;--font-body:'IM Fell English',serif;
          --font-ui:'Space Grotesk',sans-serif;--font-data:'Rajdhani',sans-serif;
          --r-lg:20px;--r-xl:28px;
          background:var(--bg);color:var(--text-main);min-height:100vh;
          font-family:var(--font-body);line-height:1.7;overflow-x:hidden;
        }
        .svc-page *,.svc-page *::before,.svc-page *::after{box-sizing:border-box;}
        .svc-hero{padding:76px var(--px) 40px;position:relative;}
        .svc-eyebrow{display:inline-flex;align-items:center;gap:10px;font-family:var(--font-data);font-size:.72rem;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--subtle);margin-bottom:20px;}
        .svc-eyebrow::after{content:'';width:34px;height:1px;background:var(--border-hi);}
        .svc-title{font-family:var(--font-display);font-size:clamp(2.4rem,5.5vw,4rem);font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--white);line-height:1.1;max-width:900px;}
        .svc-title .it{display:block;font-family:var(--font-body);font-style:italic;font-weight:400;color:var(--accent);text-transform:none;letter-spacing:0;font-size:.62em;margin-top:6px;}
        .svc-sub{font-family:var(--font-body);font-style:italic;font-size:1.02rem;color:var(--subtle);max-width:560px;margin-top:22px;}

        .svc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;padding:40px var(--px) 20px;}
        .svc-card{padding:32px 28px;border-radius:var(--r-xl);background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.014) 60%);backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);border:1px solid rgba(255,255,255,0.1);border-top-color:rgba(255,255,255,0.22);box-shadow:0 24px 60px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.08);transition:transform .35s ease,box-shadow .35s ease,border-color .35s ease;display:flex;flex-direction:column;}
        .svc-card:hover{transform:translateY(-6px);border-color:rgba(255,255,255,0.2);box-shadow:0 30px 74px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.12);}
        .svc-num{font-family:var(--font-display);font-size:.72rem;font-weight:700;letter-spacing:3px;color:var(--muted);}
        .svc-tag{display:inline-flex;align-self:flex-start;margin-top:12px;margin-bottom:16px;font-family:var(--font-data);font-size:.63rem;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;padding:4px 12px;border-radius:50px;background:rgba(212,201,168,0.07);border:1px solid rgba(212,201,168,0.2);color:var(--accent);}
        .svc-card h3{font-family:var(--font-display);font-size:1.32rem;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--white);margin-bottom:12px;}
        .svc-card p{font-family:var(--font-body);font-style:italic;font-size:.92rem;color:var(--subtle);line-height:1.75;margin-bottom:18px;}
        .svc-features{list-style:none;display:flex;flex-direction:column;gap:9px;margin-bottom:20px;flex:1;}
        .svc-features li{position:relative;padding-left:18px;font-family:var(--font-ui);font-size:.8rem;color:var(--text-main);line-height:1.5;}
        .svc-features li::before{content:'';position:absolute;left:0;top:.5em;width:6px;height:6px;border-radius:50%;background:var(--accent);opacity:.7;}
        .svc-stat{display:flex;align-items:baseline;gap:10px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.08);}
        .svc-stat-val{font-family:var(--font-display);font-size:1.5rem;font-weight:700;color:var(--white);}
        .svc-stat-label{font-family:var(--font-data);font-size:.68rem;letter-spacing:1px;text-transform:uppercase;color:var(--subtle);}

        .svc-highlights{margin:56px var(--px) 20px;padding:44px var(--px2,40px);border-radius:var(--r-xl);background:linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.012) 60%);backdrop-filter:blur(30px) saturate(180%);-webkit-backdrop-filter:blur(30px) saturate(180%);border:1px solid rgba(255,255,255,0.09);border-top-color:rgba(255,255,255,0.2);display:grid;grid-template-columns:repeat(4,1fr);gap:32px;}
        .svc-hl-val{font-family:var(--font-display);font-size:2.2rem;font-weight:700;color:var(--white);margin-bottom:6px;}
        .svc-hl-label{font-family:var(--font-data);font-size:.72rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent);margin-bottom:8px;}
        .svc-hl-sub{font-family:var(--font-body);font-style:italic;font-size:.82rem;color:var(--subtle);line-height:1.5;}

        .svc-cta{margin:64px var(--px) 0;padding:56px var(--px2,48px);border-radius:var(--r-xl);text-align:center;background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015) 60%);backdrop-filter:blur(30px) saturate(180%);-webkit-backdrop-filter:blur(30px) saturate(180%);border:1px solid rgba(255,255,255,0.1);border-top-color:rgba(255,255,255,0.22);}
        .svc-cta h2{font-family:var(--font-display);font-size:clamp(1.6rem,3.2vw,2.3rem);font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--white);margin-bottom:14px;}
        .svc-cta p{font-family:var(--font-body);font-style:italic;color:var(--subtle);max-width:520px;margin:0 auto 28px;}
        .svc-cta button{padding:14px 38px;border-radius:50px;background:var(--white);color:#141414;border:none;font-family:var(--font-data);font-size:.85rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:transform .25s ease,box-shadow .25s ease;}
        .svc-cta button:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(0,0,0,.4);}

        .svc-foot{margin-top:64px;padding:32px var(--px) 40px;border-top:1px solid var(--border);text-align:center;font-family:var(--font-data);font-size:.72rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--subtle);}

        @media(max-width:1099px){.svc-grid{grid-template-columns:repeat(2,1fr);}.svc-highlights{grid-template-columns:repeat(2,1fr);}}
        @media(max-width:699px){.svc-grid{grid-template-columns:1fr;}.svc-highlights{grid-template-columns:1fr;}}
      `}</style>

      <PublicNavbar active="services" />

      {/* HERO */}
      <div className="svc-hero">
        <div className="svc-eyebrow">What We Offer</div>
        <h1 className="svc-title">Every Ground Operation<span className="it">Coordinated From One Place</span></h1>
        <p className="svc-sub">Six operational domains, one platform — built to give every operator total situational awareness, from the tarmac to the terminal to the crew roster.</p>
      </div>

      {/* SERVICES GRID */}
      <div className="svc-grid">
        {services.map((s) => (
          <div className="svc-card" key={s.num}>
            <span className="svc-num">{s.num}</span>
            <div className="svc-tag">{s.tag}</div>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
            <ul className="svc-features">
              {s.features.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            <div className="svc-stat">
              <span className="svc-stat-val">{s.stat.value}</span>
              <span className="svc-stat-label">{s.stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* HIGHLIGHTS */}
      <div className="svc-highlights">
        {highlights.map((h) => (
          <div key={h.label}>
            <div className="svc-hl-val">{h.value}</div>
            <div className="svc-hl-label">{h.label}</div>
            <div className="svc-hl-sub">{h.sub}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="svc-cta">
        <h2>See It Running On Real Data</h2>
        <p>Every module above is live in the dashboard — flights, gates, baggage, maintenance, staff, and AI, all in one login.</p>
        <button onClick={() => navigate("/login")}>Launch Dashboard →</button>
      </div>

      <div className="svc-foot">AeroGround · Ground Operations Platform · Est. 2026</div>
    </div>
  )
}
