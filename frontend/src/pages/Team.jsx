import PublicNavbar from '../components/PublicNavbar'
import usePageMeta from '../hooks/usePageMeta'

// Same roster used on the landing page's "Meet the Team" section, kept in
// one place would be ideal — for now mirrored here so this page can carry
// its own richer bios/layout without touching the landing page.
const crew = [
  {
    img: '/images/team/backend.jpg',
    name: 'Thoudam Lanchenba',
    role: 'Backend Developer',
    channel: 'BACKEND',
    color: '#4e8fcc',
    bio: 'Develops the Django backend, creates REST APIs, implements authentication and authorization, and configures URL routing.',
  },
  {
    img: '/images/team/frontend.jpg',
    name: 'Lakshya',
    role: 'Frontend Developer',
    channel: 'FRONTEND',
    color: '#3bbfb5',
    bio: 'Develops responsive web pages using HTML, CSS, and JavaScript, implements the UI, and integrates with backend APIs.',
  },
  {
    img: '/images/team/database.jpg',
    name: 'Kowshika',
    role: 'Database Developer',
    channel: 'DATABASE',
    color: '#9d78f0',
    bio: 'Designs and manages the database, creates Django models, performs migrations, and maintains table relationships.',
  },
  {
    img: '/images/team/uiux.jpg',
    name: 'Shreepriyan',
    role: 'UI/UX Designer',
    channel: 'DESIGN',
    color: '#f5a623',
    bio: 'Designs the user interface, improves experience, creates responsive layouts, and maintains consistent visual design.',
  },
  {
    img: '/images/team/qa.jpg',
    name: 'Naren',
    role: 'QA Engineer',
    channel: 'QA',
    color: '#3dd68c',
    bio: 'Tests REST APIs using Postman, verifies requests and responses, validates functionality, and reports bugs.',
  },
]

export default function Team() {
  usePageMeta('Team', 'Meet the crew building and operating AeroGround.')
  return (
    <div style={{ backgroundColor: '#171717', minHeight: '100vh', color: '#f0ede8' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=IM+Fell+English:ital@1&family=Rajdhani:wght@500;600;700&display=swap');

        .team-page{position:relative;overflow:hidden;}

        .team-hero{position:relative;z-index:1;text-align:center;padding:108px 2rem 20px;}
        .team-eyebrow{display:inline-flex;align-items:center;gap:10px;padding:6px 18px;border-radius:50px;font-family:'Rajdhani',sans-serif;font-size:.7rem;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#d4c9a8;border:1px solid rgba(212,201,168,0.2);background:rgba(212,201,168,0.06);backdrop-filter:blur(10px);margin-bottom:22px;}
        .team-eyebrow .dot{width:6px;height:6px;border-radius:50%;background:#3dd68c;box-shadow:0 0 7px #3dd68c;}
        .team-title{font-family:'Cinzel',serif;font-size:clamp(2.2rem,5vw,3.6rem);font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#f0ede8;line-height:1.05;margin-bottom:14px;}
        .team-title .it{font-family:'IM Fell English',serif;font-style:italic;font-weight:400;text-transform:none;color:#d4c9a8;}
        .team-sub{font-family:'IM Fell English',serif;font-style:italic;font-size:1rem;color:#8a8578;max-width:480px;margin:0 auto;line-height:1.8;}

        .team-grid{position:relative;z-index:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:22px;max-width:1160px;margin:56px auto 0;padding:0 2rem 7rem;}

        .crew-card{--glow:#4e8fcc;position:relative;border-radius:20px;overflow:hidden;background:rgba(12,12,12,0.55);backdrop-filter:blur(22px) saturate(150%);border:1px solid rgba(255,255,255,0.08);transition:transform .4s cubic-bezier(.4,0,.2,1),border-color .4s,box-shadow .4s;}
        .crew-card:hover{transform:translateY(-8px);border-color:rgba(255,255,255,0.16);box-shadow:0 24px 60px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,0.04),0 0 40px -10px var(--glow);}

        .crew-photo{position:relative;height:220px;overflow:hidden;}
        .crew-photo img{width:100%;height:100%;object-fit:cover;object-position:center top;filter:grayscale(0.85) contrast(1.05) brightness(.82);transition:filter .5s,transform .5s;display:block;}
        .crew-card:hover .crew-photo img{filter:grayscale(0) contrast(1.05) brightness(.95);transform:scale(1.05);}
        .crew-photo::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(6,6,6,0.9) 100%);}

        .crew-channel{position:absolute;top:12px;left:12px;display:flex;align-items:center;gap:6px;padding:4px 10px 4px 8px;border-radius:50px;font-family:'Rajdhani',sans-serif;font-size:.62rem;font-weight:700;letter-spacing:1.5px;background:rgba(6,6,6,0.65);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.1);color:var(--glow);z-index:2;}
        .crew-channel .pulse{width:5px;height:5px;border-radius:50%;background:var(--glow);box-shadow:0 0 6px var(--glow);animation:crewPulse 2.2s ease-in-out infinite;}
        @keyframes crewPulse{0%,100%{opacity:1;}50%{opacity:.25;}}

        .crew-body{padding:18px 20px 22px;position:relative;}
        .crew-body::before{content:'';position:absolute;top:0;left:20px;right:20px;height:1px;background:linear-gradient(90deg,var(--glow),transparent 65%);opacity:.5;}
        .crew-name{font-family:'Cinzel',serif;font-size:.95rem;font-weight:700;letter-spacing:.8px;color:#f0ede8;margin-bottom:4px;margin-top:14px;}
        .crew-role{font-family:'Rajdhani',sans-serif;font-size:.72rem;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;color:var(--glow);margin-bottom:12px;}
        .crew-bio{font-family:'IM Fell English',serif;font-style:italic;font-size:.83rem;color:#8a8578;line-height:1.68;}

        @media(max-width:640px){.team-grid{grid-template-columns:1fr 1fr;}}
        @media(max-width:420px){.team-grid{grid-template-columns:1fr;}}
      `}</style>

      <div className="team-page">

        <PublicNavbar active="team" />

        <div className="team-hero">
          <div className="team-eyebrow"><span className="dot" />Ground Crew · Operations Team</div>
          <h1 className="team-title">The People <span className="it">Behind</span> AeroGround</h1>
          <p className="team-sub">Five disciplines, one console — each specialist runs their own channel of the platform, the same way every subsystem runs on the ops floor.</p>
        </div>

        <div className="team-grid">
          {crew.map((m) => (
            <div className="crew-card" key={m.name} style={{ '--glow': m.color }}>
              <div className="crew-photo">
                <img src={m.img} alt={m.name} />
                <div className="crew-channel"><span className="pulse" />{m.channel}</div>
              </div>
              <div className="crew-body">
                <div className="crew-name">{m.name}</div>
                <div className="crew-role">{m.role}</div>
                <p className="crew-bio">{m.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
