import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const NAV_LINKS = [
  { key: 'home', label: 'Home', path: '/' },
  { key: 'services', label: 'Services', path: '/services' },
  { key: 'about', label: 'About', path: '/about' },
  { key: 'team', label: 'Team', path: '/team' },
]

/**
 * Shared fixed navbar for all public marketing pages (Home, Services,
 * About, Team). Rendering this same component everywhere keeps the header
 * visually identical and in the same position across page navigations,
 * instead of each page having its own hand-styled nav.
 *
 * `active` should be one of: 'home' | 'services' | 'about' | 'team'
 */
export default function PublicNavbar({ active }) {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobOpen, setMobOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 55)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Rajdhani:wght@500;600;700&display=swap');
        .pnav-spacer{height:72px;}
        .pnav-wrap{position:fixed;top:0;left:0;right:0;z-index:1000;height:72px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 clamp(22px,5.5vw,96px);background:rgba(23,23,23,0.45);backdrop-filter:blur(32px) saturate(160%);border-bottom:1px solid rgba(255,255,255,0.04);transition:all .35s;box-sizing:border-box;}
        .pnav-wrap.scrolled{background:rgba(23,23,23,0.97);border-color:rgba(255,255,255,0.09);box-shadow:0 2px 60px rgba(0,0,0,.95);}
        .pnav-brand{display:flex;align-items:center;gap:12px;font-family:'Cinzel',serif;font-size:.85rem;font-weight:700;letter-spacing:2px;color:#f0ede8;text-transform:uppercase;cursor:pointer;flex-shrink:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .pnav-logo-img{height:64px;width:auto;display:block;filter:drop-shadow(0 2px 12px rgba(0,0,0,.5));}
        .pnav-icon{width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05));border:1px solid rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;}
        .pnav-links-desktop{display:none;align-items:center;gap:32px;}
        .pnav-links-desktop span,.pnav-links-desktop a{font-family:'Rajdhani',sans-serif;font-size:.82rem;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#6a6a62;transition:color .2s;cursor:pointer;text-decoration:none;}
        .pnav-links-desktop span.active,.pnav-links-desktop a.active{color:#f0ede8;}
        .pnav-links-desktop span:hover,.pnav-links-desktop a:hover{color:#f0ede8;}
        .pnav-btn{padding:9px 24px;border-radius:50px;background:rgba(255,255,255,0.09);border:1px solid rgba(255,255,255,0.18);color:#f0ede8;font-family:'Rajdhani',sans-serif;font-size:.78rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;transition:all .2s;cursor:pointer;text-decoration:none;display:inline-block;}
        .pnav-btn:hover{background:rgba(255,255,255,0.16);transform:translateY(-2px);}
        .pnav-hamburger{display:flex;flex-shrink:0;width:42px;height:42px;align-items:center;justify-content:center;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);color:#f0ede8;padding:0;border-radius:10px;font-size:1.2rem;cursor:pointer;}
        .pnav-mob{position:fixed;top:78px;left:12px;right:12px;z-index:999;display:flex;flex-direction:column;gap:4px;padding:14px;background:rgba(10,10,10,.98);backdrop-filter:blur(28px);border:1px solid rgba(255,255,255,0.07);border-radius:20px;}
        .pnav-mob span,.pnav-mob a,.pnav-mob button{padding:12px 15px;border-radius:10px;font-family:'Rajdhani',sans-serif;font-size:.82rem;letter-spacing:1.2px;text-transform:uppercase;color:#6a6a62;transition:all .2s;background:none;border:none;cursor:pointer;text-align:left;text-decoration:none;}
        .pnav-mob span:hover,.pnav-mob a:hover,.pnav-mob button:hover{background:rgba(255,255,255,0.04);color:#f0ede8;}
        @media(min-width:768px){.pnav-links-desktop{display:flex;}.pnav-hamburger{display:none;}}
      `}</style>

      <nav className={`pnav-wrap${scrolled ? ' scrolled' : ''}`}>
        <div className="pnav-brand" onClick={() => navigate('/')}>
          <img src="/brand/aeroground-logo-white.png" alt="AeroGround" className="pnav-logo-img" />
        </div>

        <div className="pnav-links-desktop">
          {NAV_LINKS.map(l => (
            <span
              key={l.key}
              className={active === l.key ? 'active' : ''}
              onClick={() => navigate(l.path)}
            >
              {l.label}
            </span>
          ))}
          <a
            href="http://localhost:8000/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="pnav-btn"
            style={{ background: 'transparent' }}
          >
            Django Admin
          </a>
          <button className="pnav-btn" onClick={() => navigate('/login')}>Launch →</button>
        </div>

        <button
          className="pnav-hamburger"
          onClick={() => setMobOpen(o => !o)}
          aria-label="Toggle menu"
          aria-expanded={mobOpen}
        >
          {mobOpen ? '✕' : '☰'}
        </button>
      </nav>

      {mobOpen && (
        <div className="pnav-mob">
          {NAV_LINKS.map(l => (
            <span key={l.key} onClick={() => { setMobOpen(false); navigate(l.path) }}>
              {l.label}
            </span>
          ))}
          <a
            href="http://localhost:8000/admin"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobOpen(false)}
          >
            Django Admin
          </a>
          <button onClick={() => { setMobOpen(false); navigate('/login') }}>Launch Dashboard →</button>
        </div>
      )}

      {/* Reserves the 72px the fixed nav occupies so page content isn't hidden under it */}
      <div className="pnav-spacer" />
    </>
  )
}
