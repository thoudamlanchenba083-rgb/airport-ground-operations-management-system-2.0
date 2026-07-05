import { useNavigate } from "react-router-dom"
import PublicNavbar from "../components/PublicNavbar"

const pillars = [
  {
    num: "01",
    tag: "Live Data",
    title: "Real-Time",
    desc: "Every screen — dashboard, gate board, staff roster — pulls from the same live data stream, refreshed continuously so no two teams are ever looking at different numbers.",
    stat: { value: "30s", label: "refresh cycle" },
  },
  {
    num: "02",
    tag: "Machine Learning",
    title: "AI-Powered",
    desc: "RandomForest models trained on historical operations forecast delays, recommend gate assignments, and flag equipment before it fails — not after.",
    stat: { value: "6", label: "prediction models" },
  },
  {
    num: "03",
    tag: "Access Control",
    title: "Secure",
    desc: "Role-based permissions enforced on every request, from Admin down to read-only Viewer, backed by JWT authentication across the entire API surface.",
    stat: { value: "4", label: "operator roles" },
  },
  {
    num: "04",
    tag: "Built to Grow",
    title: "Scalable",
    desc: "A Django REST backend and React frontend built to handle high-throughput airport environments — from a single terminal to a full multi-airport rollout.",
    stat: { value: "99.98%", label: "system uptime" },
  },
]

const stack = [
  "Django REST Framework", "React + Vite", "PostgreSQL", "JWT Auth",
  "scikit-learn", "Tailwind CSS", "Role-Based Access Control", "Real-Time Dashboards",
]

export default function About() {
  const navigate = useNavigate()
  return (
    <div className="abt-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Cinzel:wght@400;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Rajdhani:wght@500;600;700&display=swap');

        .abt-page{
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
        .abt-page *,.abt-page *::before,.abt-page *::after{box-sizing:border-box;}

        .abt-hero{padding:76px var(--px) 10px;}
        .abt-eyebrow{display:inline-flex;align-items:center;gap:10px;font-family:var(--font-data);font-size:.72rem;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:var(--subtle);margin-bottom:20px;}
        .abt-eyebrow::after{content:'';width:34px;height:1px;background:var(--border-hi);}
        .abt-title{font-family:var(--font-display);font-size:clamp(2.4rem,5.5vw,4rem);font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--white);line-height:1.1;max-width:820px;}
        .abt-title .it{display:block;font-family:var(--font-body);font-style:italic;font-weight:400;color:var(--accent);text-transform:none;letter-spacing:0;font-size:.62em;margin-top:6px;}

        .abt-story{display:grid;grid-template-columns:1.1fr .9fr;gap:56px;padding:36px var(--px) 10px;align-items:start;}
        .abt-story p{font-family:var(--font-body);font-style:italic;font-size:1rem;color:var(--subtle);line-height:1.9;margin-bottom:20px;}
        .abt-story p b{color:var(--white);font-weight:700;font-style:normal;}
        .abt-stack-card{padding:30px 28px;border-radius:var(--r-xl);background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.014) 60%);backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);border:1px solid rgba(255,255,255,0.1);border-top-color:rgba(255,255,255,0.22);box-shadow:0 24px 60px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.08);}
        .abt-stack-card h4{font-family:var(--font-data);font-size:.7rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--accent);margin-bottom:18px;}
        .abt-stack-list{display:flex;flex-wrap:wrap;gap:10px;}
        .abt-stack-chip{font-family:var(--font-data);font-size:.72rem;font-weight:600;letter-spacing:.5px;padding:7px 14px;border-radius:50px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:var(--text-main);}

        .abt-pillars-head{padding:56px var(--px) 8px;}
        .abt-pillars-head .abt-eyebrow{margin-bottom:14px;}
        .abt-pillars-head h2{font-family:var(--font-display);font-size:clamp(1.6rem,3.2vw,2.3rem);font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--white);}
        .abt-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;padding:24px var(--px) 20px;}
        .abt-card{padding:30px 26px;border-radius:var(--r-xl);background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.014) 60%);backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);border:1px solid rgba(255,255,255,0.1);border-top-color:rgba(255,255,255,0.22);box-shadow:0 24px 60px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.08);transition:transform .35s ease,box-shadow .35s ease,border-color .35s ease;display:flex;flex-direction:column;}
        .abt-card:hover{transform:translateY(-6px);border-color:rgba(255,255,255,0.2);box-shadow:0 30px 74px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.12);}
        .abt-num{font-family:var(--font-display);font-size:.7rem;font-weight:700;letter-spacing:3px;color:var(--muted);}
        .abt-tag{display:inline-flex;align-self:flex-start;margin-top:12px;margin-bottom:14px;font-family:var(--font-data);font-size:.62rem;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;padding:4px 11px;border-radius:50px;background:rgba(212,201,168,0.07);border:1px solid rgba(212,201,168,0.2);color:var(--accent);}
        .abt-card h3{font-family:var(--font-display);font-size:1.18rem;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--white);margin-bottom:12px;}
        .abt-card p{font-family:var(--font-body);font-style:italic;font-size:.86rem;color:var(--subtle);line-height:1.7;margin-bottom:18px;flex:1;}
        .abt-stat{display:flex;align-items:baseline;gap:9px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.08);}
        .abt-stat-val{font-family:var(--font-display);font-size:1.3rem;font-weight:700;color:var(--white);}
        .abt-stat-label{font-family:var(--font-data);font-size:.65rem;letter-spacing:1px;text-transform:uppercase;color:var(--subtle);}

        .abt-cta{margin:64px var(--px) 0;padding:56px var(--px2,48px);border-radius:var(--r-xl);text-align:center;background:linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015) 60%);backdrop-filter:blur(30px) saturate(180%);-webkit-backdrop-filter:blur(30px) saturate(180%);border:1px solid rgba(255,255,255,0.1);border-top-color:rgba(255,255,255,0.22);}
        .abt-cta h2{font-family:var(--font-display);font-size:clamp(1.6rem,3.2vw,2.3rem);font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--white);margin-bottom:14px;}
        .abt-cta p{font-family:var(--font-body);font-style:italic;color:var(--subtle);max-width:520px;margin:0 auto 28px;}
        .abt-cta button{padding:14px 38px;border-radius:50px;background:var(--white);color:#141414;border:none;font-family:var(--font-data);font-size:.85rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:transform .25s ease,box-shadow .25s ease;}
        .abt-cta button:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(0,0,0,.4);}

        .abt-foot{margin-top:64px;padding:32px var(--px) 40px;border-top:1px solid var(--border);text-align:center;font-family:var(--font-data);font-size:.72rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--subtle);}

        @media(max-width:1099px){.abt-grid{grid-template-columns:repeat(2,1fr);}.abt-story{grid-template-columns:1fr;}}
        @media(max-width:699px){.abt-grid{grid-template-columns:1fr;}}
      `}</style>

      <PublicNavbar active="about" />

      {/* HERO */}
      <div className="abt-hero">
        <div className="abt-eyebrow">Our Story</div>
        <h1 className="abt-title">About AeroGround<span className="it">One Platform, Every Terminal</span></h1>
      </div>

      {/* STORY + STACK */}
      <div className="abt-story">
        <div>
          <p><b>AeroGround</b> is a next-generation Airport Ground Operations Management System, built to modernize how airports run their day-to-day ground operations. Flight tracking, baggage handling, gate allocation, staff scheduling, and maintenance control — everything lives in one unified platform instead of five disconnected systems.</p>
          <p>Under the hood, it runs on a <b>Django REST Framework</b> backend paired with a <b>React</b> frontend, with machine learning woven directly into the operational layer — forecasting flight delays, recommending gate assignments, and flagging maintenance issues before they become critical, not after.</p>
        </div>
        <div className="abt-stack-card">
          <h4>Built With</h4>
          <div className="abt-stack-list">
            {stack.map((s) => <span className="abt-stack-chip" key={s}>{s}</span>)}
          </div>
        </div>
      </div>

      {/* PILLARS */}
      <div className="abt-pillars-head">
        <div className="abt-eyebrow">What It's Built On</div>
        <h2>Four Principles, No Compromises</h2>
      </div>
      <div className="abt-grid">
        {pillars.map((p) => (
          <div className="abt-card" key={p.num}>
            <span className="abt-num">{p.num}</span>
            <div className="abt-tag">{p.tag}</div>
            <h3>{p.title}</h3>
            <p>{p.desc}</p>
            <div className="abt-stat">
              <span className="abt-stat-val">{p.stat.value}</span>
              <span className="abt-stat-label">{p.stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="abt-cta">
        <h2>Built For Operators, Not Slideshows</h2>
        <p>Every principle above is running live in the dashboard right now — see it against real flights, real gates, and real staff.</p>
        <button onClick={() => navigate("/login")}>Launch Dashboard →</button>
      </div>

      <div className="abt-foot">AeroGround · Ground Operations Platform · Est. 2026</div>
    </div>
  )
}
